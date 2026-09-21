import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://unpkg.com/three@0.170.0/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from "https://unpkg.com/three@0.170.0/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://unpkg.com/three@0.170.0/examples/jsm/geometries/TextGeometry.js";

const FONT_URLS = {
  bold: "https://unpkg.com/three@0.170.0/examples/fonts/helvetiker_bold.typeface.json",
  regular: "https://unpkg.com/three@0.170.0/examples/fonts/helvetiker_regular.typeface.json",
  serif: "https://unpkg.com/three@0.170.0/examples/fonts/gentilis_regular.typeface.json"
};

const fontCache = {};
const loadFont = (key) => {
  if (fontCache[key]) return fontCache[key];
  fontCache[key] = new Promise((resolve, reject) => {
    new FontLoader().load(FONT_URLS[key], resolve, undefined, reject);
  });
  return fontCache[key];
};

const fontKeyFor = (name) => {
  const n = String(name || "").toLowerCase();
  if (n.includes("georgia")) return "serif";
  if (n.includes("outfit") || n.includes("fredoka")) return "regular";
  return "bold";
};

const state = {
  text: "",
  style: "raised",
  color: "#F4EFE4",
  body: "#2C2C2C",
  size: 34,
  raise: 2,
  direction: "down",
  fontName: "Anton, sans-serif",
  ready: false
};

const canvas = document.getElementById("tapCanvas");
if (!canvas) {
  window.tapPreview = { setColor() {}, setText() {}, setFont() {}, setRaise() {}, setSize() {}, setDirection() {}, setStyle() {} };
} else {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x171717, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 2000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(-18, 125, 0);
  camera.position.set(220, 140, 280);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(160, 220, 180);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd7c2, 0.35);
  fill.position.set(-120, 40, -80);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);
  const letters = new THREE.Group();
  root.add(letters);

  let bodyMats = [];

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  const tick = () => {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();

  new GLTFLoader().load("models/Tap-Narrow.glb", (gltf) => {
    const model = gltf.scene;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(state.body),
          roughness: 0.55,
          metalness: 0.05
        });
        bodyMats.push(obj.material);
      }
    });
    root.add(model);
    state.ready = true;
    rebuildLetters();
  });

  const hexColor = (hex) => new THREE.Color(hex || "#F4EFE4");

  async function rebuildLetters() {
    while (letters.children.length) {
      const child = letters.children.pop();
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    if (state.style === "none" || !state.text) return;
    const font = await loadFont(fontKeyFor(state.fontName));
    const chars = [...state.text.toUpperCase()].filter((ch) => ch !== "");
    const letterH = 8 + state.size * 0.45;
    const depth = Math.max(0.8, state.raise);
    const pitch = letterH * 0.92;
    const usable = 250 - letterH - 24;
    const count = chars.length;
    const span = Math.min(usable, Math.max(0, (count - 1) * pitch));
    const topY = state.direction === "down" ? 238 - letterH / 2 : 12 + letterH / 2 + span;
    const step = count > 1 ? span / (count - 1) : 0;
    const sign = state.direction === "down" ? -1 : 1;
    const flip = state.direction === "up";
    const mat = new THREE.MeshStandardMaterial({
      color: hexColor(state.color),
      roughness: 0.4,
      metalness: 0.02
    });
    chars.forEach((ch, i) => {
      if (ch === " ") return;
      const geo = new TextGeometry(ch, {
        font,
        size: letterH,
        depth,
        curveSegments: 4,
        bevelEnabled: true,
        bevelThickness: Math.min(0.35, depth * 0.12),
        bevelSize: Math.min(0.28, letterH * 0.03),
        bevelSegments: 1
      });
      geo.computeBoundingBox();
      geo.center();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.set(0, -Math.PI / 2, flip ? Math.PI : 0);
      mesh.position.set(0.4 + depth / 2, topY + sign * i * step, 0);
      letters.add(mesh);
    });
  }

  window.tapPreview = {
    setColor(hex) {
      state.body = hex;
      bodyMats.forEach((m) => m.color.set(hex));
    },
    setText(text) {
      state.text = text || "";
      rebuildLetters();
    },
    setFont(name) {
      state.fontName = name;
      rebuildLetters();
    },
    setRaise(mm) {
      state.raise = Number(mm) || 2;
      rebuildLetters();
    },
    setSize(n) {
      state.size = Number(n) || 34;
      rebuildLetters();
    },
    setDirection(dir) {
      state.direction = dir === "up" ? "up" : "down";
      rebuildLetters();
    },
    setStyle(style) {
      state.style = style;
      rebuildLetters();
    },
    setLetterColor(hex) {
      state.color = hex;
      rebuildLetters();
    }
  };
}
