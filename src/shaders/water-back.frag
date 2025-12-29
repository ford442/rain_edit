precision mediump float;
uniform sampler2D u_waterMap;
uniform sampler2D u_textureBg;
uniform vec2 u_resolution;
uniform vec2 u_parallax;
uniform float u_brightness;

vec2 texCoord(){
  return vec2(gl_FragCoord.x, u_resolution.y-gl_FragCoord.y)/u_resolution;
}

void main(){
  vec2 tex = texCoord();
  vec4 wm = texture2D(u_waterMap, tex);
  vec2 ref = (wm.rg - 0.5) * 2.0 * 0.01; // subtle refraction for background
  vec4 bg = texture2D(u_textureBg, tex + ref + (u_parallax*0.0005));
  gl_FragColor = vec4(bg.rgb * u_brightness, 1.0);
}