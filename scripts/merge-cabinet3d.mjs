#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), "src");

function readMixinBody(n) {
  const text = fs.readFileSync(path.join(src, `Cabinet3D_${n}.js`), "utf8");
  const marker = `export const Cabinet3DMixin${n} = {`;
  const start = text.indexOf(marker);
  const bodyStart = start + marker.length;
  const closeIdx = text.indexOf("\n};", bodyStart);
  return text.slice(bodyStart, closeIdx);
}

const body = `${readMixinBody(0)}\n${readMixinBody(1)}`;
const out = `/** Cabinet3D runtime methods (modal, raycast, previews). */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STORAGE_CATEGORIES } from "../StorageAPI.js";
import {
  createGLContext,
  getGLContextInfo,
} from "../rendering/createGLContext.js";
import {
  CATEGORY_COLORS,
  CAT_CUBE_SIZE,
  FILE_CUBE_SIZE,
  GRID_GAP,
  FILE_ORBIT_R,
  CAM_ANIM_MS,
  LABEL_TRUNCATE_LEN,
  PREVIEW_DEBOUNCE_MS,
  PREVIEW_MAX_CHARS,
  PREVIEW_HIDE_GRACE_MS,
  LOD_NEAR,
  LOD_FAR,
  lerp,
  easeOut,
  _fileTypeIcon,
  _isImageFile,
  _formatSize,
} from "../Cabinet3D.js";

export const Cabinet3DMethodsMixin = {
${body}
};
`;

const outDir = path.join(src, "cabinet3d");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "methods.js"), out);
console.log("Wrote src/cabinet3d/methods.js");
