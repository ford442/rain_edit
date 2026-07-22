//! Water-map rain simulation compiled to wasm32.
//!
//! Memory layout (all little-endian f32 / u32 as noted):
//! - Host allocates via [`alloc`] / frees via [`dealloc`].
//! - [`SimState`] lives in wasm linear memory; host keeps the pointer.
//! - Pixel output is RGBA8 in a buffer owned by the sim (`pixels_ptr`).
//! - Optional drop-atlas: 255 sprites × 64×64 RGBA8 uploaded with [`set_atlas`].

#![allow(clippy::missing_safety_doc)]

use std::f32::consts::PI;
use std::ptr;

const DROP_SIZE: usize = 64;
const ATLAS_COUNT: usize = 255;
const MAX_DROPS: usize = 2048;

#[repr(C)]
#[derive(Clone, Copy)]
struct Drop {
    x: f32,
    y: f32,
    r: f32,
    spread_x: f32,
    spread_y: f32,
    momentum: f32,
    momentum_x: f32,
    last_spawn: f32,
    next_spawn: f32,
    parent: i32,
    is_new: u8,
    killed: u8,
    shrink: f32,
    _pad: f32,
}

impl Drop {
    fn blank() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            r: 0.0,
            spread_x: 0.0,
            spread_y: 0.0,
            momentum: 0.0,
            momentum_x: 0.0,
            last_spawn: 0.0,
            next_spawn: 0.0,
            parent: -1,
            is_new: 1,
            killed: 0,
            shrink: 0.0,
            _pad: 0.0,
        }
    }
}

#[repr(C)]
struct Options {
    min_r: f32,
    max_r: f32,
    max_drops: f32,
    rain_chance: f32,
    rain_limit: f32,
    droplets_rate: f32,
    droplets_size_min: f32,
    droplets_size_max: f32,
    droplets_cleaning_radius_multiplier: f32,
    raining: f32,
    global_time_scale: f32,
    trail_rate: f32,
    auto_shrink: f32,
    spawn_area_0: f32,
    spawn_area_1: f32,
    trail_scale_min: f32,
    trail_scale_max: f32,
    collision_radius: f32,
    collision_radius_increase: f32,
    drop_fall_multiplier: f32,
    collision_boost_multiplier: f32,
    collision_boost: f32,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            min_r: 10.0,
            max_r: 40.0,
            max_drops: 900.0,
            rain_chance: 0.3,
            rain_limit: 3.0,
            droplets_rate: 50.0,
            droplets_size_min: 2.0,
            droplets_size_max: 4.0,
            droplets_cleaning_radius_multiplier: 0.43,
            raining: 1.0,
            global_time_scale: 1.0,
            trail_rate: 1.0,
            auto_shrink: 1.0,
            spawn_area_0: -0.1,
            spawn_area_1: 0.95,
            trail_scale_min: 0.2,
            trail_scale_max: 0.5,
            collision_radius: 0.65,
            collision_radius_increase: 0.01,
            drop_fall_multiplier: 1.0,
            collision_boost_multiplier: 0.05,
            collision_boost: 1.0,
        }
    }
}

pub struct SimState {
    width: u32,
    height: u32,
    scale: f32,
    options: Options,
    drops: Vec<Drop>,
    droplets: Vec<u8>,
    pixels: Vec<u8>,
    atlas: Vec<u8>,
    has_atlas: bool,
    droplets_counter: f32,
    texture_cleaning_iterations: f32,
    rng_state: u32,
    last_render_ms: f64,
}

impl SimState {
    fn new(width: u32, height: u32, scale: f32) -> Self {
        let px = (width as usize) * (height as usize) * 4;
        let droplets_px = px; // same density
        Self {
            width,
            height,
            scale: if scale <= 0.0 { 1.0 } else { scale },
            options: Options::default(),
            drops: Vec::with_capacity(512),
            droplets: vec![0u8; droplets_px],
            pixels: vec![0u8; px],
            atlas: Vec::new(),
            has_atlas: false,
            droplets_counter: 0.0,
            texture_cleaning_iterations: 0.0,
            rng_state: 0xC0FFEE ^ width ^ (height << 9),
            last_render_ms: 0.0,
        }
    }

    fn area(&self) -> f32 {
        (self.width as f32 * self.height as f32) / self.scale
    }

    fn area_multiplier(&self) -> f32 {
        (self.area() / (1024.0 * 768.0)).sqrt()
    }

    fn delta_r(&self) -> f32 {
        self.options.max_r - self.options.min_r
    }

    fn rand(&mut self) -> f32 {
        // xorshift32
        let mut x = self.rng_state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.rng_state = if x == 0 { 0xA5A5A5A5 } else { x };
        (self.rng_state as f32) / (u32::MAX as f32)
    }

    fn random_range(&mut self, from: f32, to: f32) -> f32 {
        from + self.rand() * (to - from)
    }

    fn random_pow3(&mut self, from: f32, to: f32) -> f32 {
        let n = self.rand();
        from + n * n * n * (to - from)
    }

    fn chance(&mut self, c: f32) -> bool {
        self.rand() <= c
    }

    fn clear_pixels(&mut self) {
        self.pixels.fill(0);
    }

    fn resize(&mut self, width: u32, height: u32, scale: f32) {
        self.width = width.max(1);
        self.height = height.max(1);
        self.scale = if scale <= 0.0 { 1.0 } else { scale };
        let px = (self.width as usize) * (self.height as usize) * 4;
        self.pixels.resize(px, 0);
        self.droplets.resize(px, 0);
        self.droplets.fill(0);
        self.drops.clear();
    }

    fn max_drop_count(&self) -> usize {
        ((self.options.max_drops * self.area_multiplier()) as usize).min(MAX_DROPS)
    }

    fn create_drop(&self, base: Drop) -> Option<Drop> {
        if self.drops.len() >= self.max_drop_count() {
            return None;
        }
        Some(base)
    }

    fn clear_droplets_circle(&mut self, x: f32, y: f32, r: f32) {
        let density = 1.0_f32;
        let cx = x * density * self.scale;
        let cy = y * density * self.scale;
        let rx = r * density * self.scale;
        let ry = rx * 1.5;
        let w = self.width as i32;
        let h = self.height as i32;
        let x0 = ((cx - rx).floor() as i32).max(0);
        let y0 = ((cy - ry).floor() as i32).max(0);
        let x1 = ((cx + rx).ceil() as i32).min(w);
        let y1 = ((cy + ry).ceil() as i32).min(h);
        for py in y0..y1 {
            for px in x0..x1 {
                let dx = (px as f32 + 0.5 - cx) / rx;
                let dy = (py as f32 + 0.5 - cy) / ry;
                if dx * dx + dy * dy <= 1.0 {
                    let i = ((py as usize) * (w as usize) + (px as usize)) * 4;
                    // destination-out
                    self.droplets[i] = 0;
                    self.droplets[i + 1] = 0;
                    self.droplets[i + 2] = 0;
                    self.droplets[i + 3] = 0;
                }
            }
        }
    }

    fn draw_soft_drop(&mut self, buf: &mut [u8], drop: &Drop) {
        let scale_x = 1.0_f32;
        let scale_y = 1.5_f32;
        let mut d = ((drop.r - self.options.min_r) / self.delta_r() * 0.9).clamp(0.0, 1.0);
        d *= 1.0 / ((drop.spread_x + drop.spread_y) * 0.5 + 1.0);
        let atlas_i = (d * (ATLAS_COUNT as f32 - 1.0)).floor() as usize;

        let dw = drop.r * 2.0 * scale_x * (drop.spread_x + 1.0) * self.scale;
        let dh = drop.r * 2.0 * scale_y * (drop.spread_y + 1.0) * self.scale;
        let dx0 = (drop.x - drop.r * scale_x * (drop.spread_x + 1.0)) * self.scale;
        let dy0 = (drop.y - drop.r * scale_y * (drop.spread_y + 1.0)) * self.scale;

        if self.has_atlas && !self.atlas.is_empty() {
            blit_atlas(
                buf,
                self.width as usize,
                self.height as usize,
                &self.atlas,
                atlas_i,
                dx0,
                dy0,
                dw,
                dh,
            );
        } else {
            blit_ellipse(
                buf,
                self.width as usize,
                self.height as usize,
                dx0 + dw * 0.5,
                dy0 + dh * 0.5,
                dw * 0.5,
                dh * 0.5,
                atlas_i as u8,
            );
        }
    }

    fn update_droplets(&mut self, time_scale: f32) {
        if self.texture_cleaning_iterations > 0.0 {
            self.texture_cleaning_iterations -= 1.0 * time_scale;
            let alpha = (0.05 * time_scale).clamp(0.0, 1.0);
            let keep = 1.0 - alpha;
            for chunk in self.droplets.chunks_exact_mut(4) {
                chunk[0] = (chunk[0] as f32 * keep) as u8;
                chunk[1] = (chunk[1] as f32 * keep) as u8;
                chunk[2] = (chunk[2] as f32 * keep) as u8;
                chunk[3] = (chunk[3] as f32 * keep) as u8;
            }
        }

        if self.options.raining > 0.5 {
            self.droplets_counter +=
                self.options.droplets_rate * time_scale * self.area_multiplier();
            while self.droplets_counter >= 1.0 {
                self.droplets_counter -= 1.0;
                let n = self.rand();
                let r = self.options.droplets_size_min
                    + n * n
                        * (self.options.droplets_size_max - self.options.droplets_size_min);
                let x = self.random_range(0.0, self.width as f32 / self.scale);
                let y = self.random_range(0.0, self.height as f32 / self.scale);
                let drop = Drop {
                    x,
                    y,
                    r,
                    spread_x: 0.0,
                    spread_y: 0.0,
                    ..Drop::blank()
                };
                // Draw into droplets buffer
                let mut tmp = std::mem::take(&mut self.droplets);
                self.draw_soft_drop(&mut tmp, &drop);
                self.droplets = tmp;
            }
        }

        // Composite droplets onto pixels
        for (dst, src) in self.pixels.chunks_exact_mut(4).zip(self.droplets.chunks_exact(4)) {
            if src[3] == 0 {
                continue;
            }
            // source-over
            let sa = src[3] as f32 / 255.0;
            let da = dst[3] as f32 / 255.0;
            let out_a = sa + da * (1.0 - sa);
            if out_a <= 0.0 {
                continue;
            }
            for c in 0..3 {
                let s = src[c] as f32 / 255.0;
                let d = dst[c] as f32 / 255.0;
                dst[c] = (((s * sa + d * da * (1.0 - sa)) / out_a) * 255.0) as u8;
            }
            dst[3] = (out_a * 255.0) as u8;
        }
    }

    fn update_rain(&mut self, time_scale: f32) -> Vec<Drop> {
        let mut rain_drops = Vec::new();
        if self.options.raining <= 0.5 {
            return rain_drops;
        }
        let limit = self.options.rain_limit * time_scale * self.area_multiplier();
        let mut count = 0.0;
        while self.chance(self.options.rain_chance * time_scale * self.area_multiplier())
            && count < limit
        {
            count += 1.0;
            let r = self.random_pow3(self.options.min_r, self.options.max_r);
            let x = self.random_range(0.0, self.width as f32 / self.scale);
            let y = self.random_range(
                (self.height as f32 / self.scale) * self.options.spawn_area_0,
                (self.height as f32 / self.scale) * self.options.spawn_area_1,
            );
            let momentum = 1.0 + (r - self.options.min_r) * 0.1 + self.random_range(0.0, 2.0);
            let drop = Drop {
                x,
                y,
                r,
                momentum,
                spread_x: 1.5,
                spread_y: 1.5,
                ..Drop::blank()
            };
            if let Some(d) = self.create_drop(drop) {
                rain_drops.push(d);
            }
        }
        rain_drops
    }

    fn splash(&mut self, x: f32, y: f32, count: u32) {
        for _ in 0..count {
            let r = self.random_range(2.0, 5.0);
            let drop = Drop {
                x: x + self.random_range(-20.0, 20.0),
                y: y + self.random_range(-20.0, 20.0),
                r,
                momentum: 2.0 + self.random_range(0.0, 2.0),
                spread_x: 1.5,
                spread_y: 1.5,
                momentum_x: self.random_range(-2.0, 2.0),
                ..Drop::blank()
            };
            if let Some(d) = self.create_drop(drop) {
                self.drops.push(d);
            }
        }
    }

    fn update_drops(&mut self, time_scale: f32) {
        self.update_droplets(time_scale);
        let mut new_drops = self.update_rain(time_scale);

        let width_scaled = self.width as f32 / self.scale;
        self.drops.sort_by(|a, b| {
            let va = a.y * width_scaled + a.x;
            let vb = b.y * width_scaled + b.x;
            va.partial_cmp(&vb).unwrap_or(std::cmp::Ordering::Equal)
        });

        let drop_count = self.drops.len();
        for i in 0..drop_count {
            if self.drops[i].killed != 0 {
                continue;
            }

            // Momentum kick
            let min_r = self.options.min_r;
            let delta_r = self.delta_r();
            let fall_mul = self.options.drop_fall_multiplier;
            let chance_val =
                (self.drops[i].r - min_r * fall_mul) * (0.1 / delta_r) * time_scale;
            if self.chance(chance_val) {
                let boost = self.random_range(0.0, (self.drops[i].r / self.options.max_r) * 4.0);
                self.drops[i].momentum += boost;
            }

            if self.options.auto_shrink > 0.5
                && self.drops[i].r <= self.options.min_r
                && self.chance(0.05 * time_scale)
            {
                self.drops[i].shrink += 0.01;
            }

            self.drops[i].r -= self.drops[i].shrink * time_scale;
            if self.drops[i].r <= 0.0 {
                self.drops[i].killed = 1;
            }

            if self.options.raining > 0.5 && self.drops[i].killed == 0 {
                self.drops[i].last_spawn +=
                    self.drops[i].momentum * time_scale * self.options.trail_rate;
                if self.drops[i].last_spawn > self.drops[i].next_spawn {
                    let tr = self.drops[i].r
                        * self.random_range(self.options.trail_scale_min, self.options.trail_scale_max);
                    let trail = Drop {
                        x: self.drops[i].x
                            + self.random_range(-self.drops[i].r, self.drops[i].r) * 0.1,
                        y: self.drops[i].y - self.drops[i].r * 0.01,
                        r: tr,
                        spread_y: self.drops[i].momentum * 0.1,
                        parent: i as i32,
                        ..Drop::blank()
                    };
                    if let Some(td) = self.create_drop(trail) {
                        // create_drop checks current drops.len(); new_drops also count toward cap loosely
                        if self.drops.len() + new_drops.len() < self.max_drop_count() {
                            new_drops.push(td);
                            self.drops[i].r *= (0.97_f32).powf(time_scale);
                            self.drops[i].last_spawn = 0.0;
                            self.drops[i].next_spawn = self
                                .random_range(self.options.min_r, self.options.max_r)
                                - self.drops[i].momentum * 2.0 * self.options.trail_rate
                                + (self.options.max_r - self.drops[i].r);
                        }
                    }
                }
            }

            self.drops[i].spread_x *= (0.4_f32).powf(time_scale);
            self.drops[i].spread_y *= (0.7_f32).powf(time_scale);

            let moved = self.drops[i].momentum > 0.0;
            if moved && self.drops[i].killed == 0 {
                self.drops[i].y += self.drops[i].momentum * self.options.global_time_scale;
                self.drops[i].x += self.drops[i].momentum_x * self.options.global_time_scale;
                if self.drops[i].y > self.height as f32 / self.scale + self.drops[i].r {
                    self.drops[i].killed = 1;
                }
            }

            let check_collision = (moved || self.drops[i].is_new != 0) && self.drops[i].killed == 0;
            self.drops[i].is_new = 0;

            if check_collision {
                let end = (i + 70).min(drop_count);
                for j in (i + 1)..end {
                    if self.drops[j].killed != 0 {
                        continue;
                    }
                    if self.drops[i].r <= self.drops[j].r {
                        continue;
                    }
                    if self.drops[i].parent == j as i32 || self.drops[j].parent == i as i32 {
                        continue;
                    }
                    let dx = self.drops[j].x - self.drops[i].x;
                    let dy = self.drops[j].y - self.drops[i].y;
                    let dist = (dx * dx + dy * dy).sqrt();
                    let thresh = (self.drops[i].r + self.drops[j].r)
                        * (self.options.collision_radius
                            + self.drops[i].momentum
                                * self.options.collision_radius_increase
                                * time_scale);
                    if dist < thresh {
                        let r1 = self.drops[i].r;
                        let r2 = self.drops[j].r;
                        let a1 = PI * r1 * r1;
                        let a2 = PI * r2 * r2;
                        let mut target_r = ((a1 + a2 * 0.8) / PI).sqrt();
                        if target_r > self.options.max_r {
                            target_r = self.options.max_r;
                        }
                        self.drops[i].r = target_r;
                        self.drops[i].momentum_x += dx * 0.1;
                        self.drops[i].spread_x = 0.0;
                        self.drops[i].spread_y = 0.0;
                        self.drops[j].killed = 1;
                        let boosted = self.drops[i].momentum
                            + target_r * self.options.collision_boost_multiplier
                            + self.options.collision_boost;
                        self.drops[i].momentum =
                            self.drops[j].momentum.max(boosted.min(40.0));
                    }
                }
            }

            self.drops[i].momentum -= (1.0_f32)
                .max(self.options.min_r * 0.5 - self.drops[i].momentum)
                * 0.1
                * time_scale;
            if self.drops[i].momentum < 0.0 {
                self.drops[i].momentum = 0.0;
            }
            self.drops[i].momentum_x *= (0.7_f32).powf(time_scale);

            if self.drops[i].killed == 0 {
                let drop = self.drops[i];
                new_drops.push(drop);
                if moved && self.options.droplets_rate > 0.0 {
                    self.clear_droplets_circle(
                        drop.x,
                        drop.y,
                        drop.r * self.options.droplets_cleaning_radius_multiplier,
                    );
                }
                let mut pixels = std::mem::take(&mut self.pixels);
                self.draw_soft_drop(&mut pixels, &drop);
                self.pixels = pixels;
            }
        }

        self.drops = new_drops;
    }

    fn step(&mut self, now_ms: f64) {
        self.clear_pixels();
        if self.last_render_ms == 0.0 {
            self.last_render_ms = now_ms;
        }
        let mut delta_t = now_ms - self.last_render_ms;
        if delta_t < 0.0 {
            delta_t = 16.0;
        }
        let mut time_scale = (delta_t / ((1.0 / 60.0) * 1000.0)) as f32;
        if time_scale > 1.1 {
            time_scale = 1.1;
        }
        time_scale *= self.options.global_time_scale;
        self.last_render_ms = now_ms;
        self.update_drops(time_scale);
    }
}

fn blit_ellipse(
    buf: &mut [u8],
    width: usize,
    height: usize,
    cx: f32,
    cy: f32,
    rx: f32,
    ry: f32,
    depth: u8,
) {
    if rx <= 0.5 || ry <= 0.5 {
        return;
    }
    let x0 = ((cx - rx).floor() as i32).max(0) as usize;
    let y0 = ((cy - ry).floor() as i32).max(0) as usize;
    let x1 = ((cx + rx).ceil() as i32).min(width as i32).max(0) as usize;
    let y1 = ((cy + ry).ceil() as i32).min(height as i32).max(0) as usize;
    for y in y0..y1 {
        for x in x0..x1 {
            let dx = (x as f32 + 0.5 - cx) / rx;
            let dy = (y as f32 + 0.5 - cy) / ry;
            let d2 = dx * dx + dy * dy;
            if d2 > 1.0 {
                continue;
            }
            let edge = (1.0 - d2).sqrt();
            let alpha = (edge * 0.85 + 0.15).clamp(0.0, 1.0);
            let i = (y * width + x) * 4;
            let src_a = alpha;
            let dst_a = buf[i + 3] as f32 / 255.0;
            let out_a = src_a + dst_a * (1.0 - src_a);
            if out_a <= 0.0 {
                continue;
            }
            let sr = 0.55_f32;
            let sg = 0.65_f32;
            let sb = (depth as f32 / 255.0) * 0.9 + 0.1;
            for (c, s) in [sr, sg, sb].into_iter().enumerate() {
                let d = buf[i + c] as f32 / 255.0;
                buf[i + c] = (((s * src_a + d * dst_a * (1.0 - src_a)) / out_a) * 255.0) as u8;
            }
            buf[i + 3] = (out_a * 255.0) as u8;
        }
    }
}

fn blit_atlas(
    buf: &mut [u8],
    width: usize,
    height: usize,
    atlas: &[u8],
    atlas_i: usize,
    dx0: f32,
    dy0: f32,
    dw: f32,
    dh: f32,
) {
    if dw <= 0.5 || dh <= 0.5 {
        return;
    }
    let sprite_stride = DROP_SIZE * DROP_SIZE * 4;
    let base = atlas_i.min(ATLAS_COUNT - 1) * sprite_stride;
    if base + sprite_stride > atlas.len() {
        return;
    }
    let x0 = dx0.floor() as i32;
    let y0 = dy0.floor() as i32;
    let x1 = (dx0 + dw).ceil() as i32;
    let y1 = (dy0 + dh).ceil() as i32;
    for py in y0.max(0)..y1.min(height as i32) {
        for px in x0.max(0)..x1.min(width as i32) {
            let u = ((px as f32 + 0.5 - dx0) / dw).clamp(0.0, 1.0);
            let v = ((py as f32 + 0.5 - dy0) / dh).clamp(0.0, 1.0);
            let sx = ((u * (DROP_SIZE as f32 - 1.0)) as usize).min(DROP_SIZE - 1);
            let sy = ((v * (DROP_SIZE as f32 - 1.0)) as usize).min(DROP_SIZE - 1);
            let si = base + (sy * DROP_SIZE + sx) * 4;
            let sa = atlas[si + 3] as f32 / 255.0;
            if sa <= 0.001 {
                continue;
            }
            let i = ((py as usize) * width + (px as usize)) * 4;
            let da = buf[i + 3] as f32 / 255.0;
            let out_a = sa + da * (1.0 - sa);
            if out_a <= 0.0 {
                continue;
            }
            for c in 0..3 {
                let s = atlas[si + c] as f32 / 255.0;
                let d = buf[i + c] as f32 / 255.0;
                buf[i + c] = (((s * sa + d * da * (1.0 - sa)) / out_a) * 255.0) as u8;
            }
            buf[i + 3] = (out_a * 255.0) as u8;
        }
    }
}

// ── C ABI ───────────────────────────────────────────────────────────────────

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut buf = Vec::<u8>::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }
    let _ = Vec::from_raw_parts(ptr, 0, size);
}

#[no_mangle]
pub extern "C" fn rain_sim_create(width: u32, height: u32, scale: f32) -> *mut SimState {
    let state = Box::new(SimState::new(width.max(1), height.max(1), scale));
    Box::into_raw(state)
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_destroy(ptr: *mut SimState) {
    if ptr.is_null() {
        return;
    }
    drop(Box::from_raw(ptr));
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_resize(ptr: *mut SimState, width: u32, height: u32, scale: f32) {
    if ptr.is_null() {
        return;
    }
    (*ptr).resize(width, height, scale);
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_pixels_ptr(ptr: *mut SimState) -> *mut u8 {
    if ptr.is_null() {
        return ptr::null_mut();
    }
    (*ptr).pixels.as_mut_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_pixels_len(ptr: *mut SimState) -> usize {
    if ptr.is_null() {
        return 0;
    }
    (*ptr).pixels.len()
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_set_options(ptr: *mut SimState, options_ptr: *const f32) {
    if ptr.is_null() || options_ptr.is_null() {
        return;
    }
    // 22 f32 values matching Options field order
    let s = &mut *ptr;
    let o = &mut s.options;
    o.min_r = *options_ptr.add(0);
    o.max_r = *options_ptr.add(1);
    o.max_drops = *options_ptr.add(2);
    o.rain_chance = *options_ptr.add(3);
    o.rain_limit = *options_ptr.add(4);
    o.droplets_rate = *options_ptr.add(5);
    o.droplets_size_min = *options_ptr.add(6);
    o.droplets_size_max = *options_ptr.add(7);
    o.droplets_cleaning_radius_multiplier = *options_ptr.add(8);
    o.raining = *options_ptr.add(9);
    o.global_time_scale = *options_ptr.add(10);
    o.trail_rate = *options_ptr.add(11);
    o.auto_shrink = *options_ptr.add(12);
    o.spawn_area_0 = *options_ptr.add(13);
    o.spawn_area_1 = *options_ptr.add(14);
    o.trail_scale_min = *options_ptr.add(15);
    o.trail_scale_max = *options_ptr.add(16);
    o.collision_radius = *options_ptr.add(17);
    o.collision_radius_increase = *options_ptr.add(18);
    o.drop_fall_multiplier = *options_ptr.add(19);
    o.collision_boost_multiplier = *options_ptr.add(20);
    o.collision_boost = *options_ptr.add(21);
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_set_atlas(
    ptr: *mut SimState,
    atlas_ptr: *const u8,
    atlas_len: usize,
) {
    if ptr.is_null() || atlas_ptr.is_null() || atlas_len == 0 {
        return;
    }
    let s = &mut *ptr;
    s.atlas = std::slice::from_raw_parts(atlas_ptr, atlas_len).to_vec();
    s.has_atlas = s.atlas.len() >= ATLAS_COUNT * DROP_SIZE * DROP_SIZE * 4;
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_clear_droplets(ptr: *mut SimState, x: f32, y: f32, r: f32) {
    if ptr.is_null() {
        return;
    }
    (*ptr).clear_droplets_circle(x, y, r);
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_splash(ptr: *mut SimState, x: f32, y: f32, count: u32) {
    if ptr.is_null() {
        return;
    }
    (*ptr).splash(x, y, count);
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_clear_texture(ptr: *mut SimState) {
    if ptr.is_null() {
        return;
    }
    (*ptr).texture_cleaning_iterations = 50.0;
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_clear_drops(ptr: *mut SimState) {
    if ptr.is_null() {
        return;
    }
    let s = &mut *ptr;
    let n = s.drops.len();
    for i in 0..n {
        let shrink = 0.1 + s.rand() * 0.5;
        s.drops[i].shrink = shrink;
    }
    s.texture_cleaning_iterations = 50.0;
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_step(ptr: *mut SimState, now_ms: f64) {
    if ptr.is_null() {
        return;
    }
    (*ptr).step(now_ms);
}

#[no_mangle]
pub unsafe extern "C" fn rain_sim_drop_count(ptr: *mut SimState) -> u32 {
    if ptr.is_null() {
        return 0;
    }
    (*ptr).drops.len() as u32
}
