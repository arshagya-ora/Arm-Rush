import { dependencies } from '../../package.json';

// Use the same pinned version for the JavaScript library and its WASM runtime.
export const MEDIAPIPE_WASM_URL =
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${dependencies['@mediapipe/tasks-vision']}/wasm`;
