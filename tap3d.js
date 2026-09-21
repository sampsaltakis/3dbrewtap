import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

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
  window.tapPreview = { setColor() {}, setText() {}, setFont() {}, setRaise() {}, setSize() {}, setDirection() {}, setStyle() {}, setLetterColor() {} };
} else {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x171717, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 2000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(-18, 125, 0);
  camera.position.set(210, 125, 30);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(160, 220, 180);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd7c2, 0.4);
  fill.position.set(-120, 40, -80);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);
  const letters = new THREE.Group();
  root.add(letters);

  let bodyMats = [];

  const resize = () => {
    const parent = canvas.parentElement;
    const w = Math.max(parent ? parent.clientWidth : canvas.clientWidth, 1);
    const h = Math.max(parent ? parent.clientHeight : canvas.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
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
    resize();
    rebuildLetters();
  });

  const hexColor = (hex) => new THREE.Color(hex || "#F4EFE4");

  async function rebuildLetters() {
    while (letters.children.length) {
      const child = letters.children.pop();
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    if (state.style !== "raised" || !state.text) return;
    const font = await loadFont(fontKeyFor(state.fontName));
    const depth = Math.max(0.8, state.raise);
    const letterH = Math.min(32, 10 + state.size * 0.4);
    const geo = new TextGeometry(state.text.toUpperCase(), {
      font,
      size: letterH,
      depth,
      curveSegments: 5,
      bevelEnabled: true,
      bevelThickness: Math.min(0.4, depth * 0.14),
      bevelSize: Math.min(0.35, letterH * 0.04),
      bevelSegments: 1
    });
    geo.computeBoundingBox();
    geo.center();
    const len = geo.boundingBox.max.x - geo.boundingBox.min.x;
    const fit = Math.min(1, 226 / Math.max(len, 1));
    geo.scale(fit, fit, 1);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: hexColor(state.color),
      roughness: 0.38,
      metalness: 0.02
    }));
    const along = state.direction === "up" ? -1 : 1;
    const across = state.direction === "up" ? -1 : 1;
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, along, 0),
      new THREE.Vector3(0, 0, across),
      new THREE.Vector3(1, 0, 0)
    ));
    mesh.position.set(0.35 + depth / 2, 125, 0);
    letters.add(mesh);
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
