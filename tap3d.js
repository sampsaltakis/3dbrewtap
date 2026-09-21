import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import opentype from "https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/+esm";

const FONT_FILES = {
  anton: "https://cdn.jsdelivr.net/fontsource/fonts/anton@latest/latin-400-normal.ttf",
  bungee: "https://cdn.jsdelivr.net/fontsource/fonts/bungee@latest/latin-400-normal.ttf",
  "archivo-black": "https://cdn.jsdelivr.net/fontsource/fonts/archivo-black@latest/latin-400-normal.ttf",
  fredoka: "https://cdn.jsdelivr.net/fontsource/fonts/fredoka@latest/latin-700-normal.ttf",
  outfit: "https://cdn.jsdelivr.net/fontsource/fonts/outfit@latest/latin-800-normal.ttf"
};

const fontCache = {};
const loadFontFile = async (key) => {
  const url = FONT_FILES[key] || FONT_FILES.anton;
  if (!fontCache[url]) {
    fontCache[url] = fetch(url).then((r) => r.arrayBuffer()).then((buf) => opentype.parse(buf));
  }
  return fontCache[url];
};

const fontKeyFor = (name) => {
  const n = String(name || "anton").toLowerCase();
  if (n.includes("bungee")) return "bungee";
  if (n.includes("archivo")) return "archivo-black";
  if (n.includes("fredoka")) return "fredoka";
  if (n.includes("outfit")) return "outfit";
  return "anton";
};

const pathToShapes = (otPath) => {
  const shapePath = new THREE.ShapePath();
  otPath.commands.forEach((cmd) => {
    if (cmd.type === "M") shapePath.moveTo(cmd.x, -cmd.y);
    else if (cmd.type === "L") shapePath.lineTo(cmd.x, -cmd.y);
    else if (cmd.type === "C") shapePath.bezierCurveTo(cmd.x1, -cmd.y1, cmd.x2, -cmd.y2, cmd.x, -cmd.y);
    else if (cmd.type === "Q") shapePath.quadraticCurveTo(cmd.x1, -cmd.y1, cmd.x, -cmd.y);
    else if (cmd.type === "Z") {
      if (shapePath.currentPath) shapePath.currentPath.closePath();
    }
  });
  return shapePath.toShapes(true);
};

const state = {
  text: "",
  style: "raised",
  color: "#F4EFE4",
  body: "#2C2C2C",
  size: 34,
  raise: 2,
  direction: "down",
  fontName: "anton",
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
  camera.position.set(210, 125, 90);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(220, 180, 120);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.55);
  rim.position.set(-80, 80, -160);
  scene.add(rim);

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
    gltf.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(state.body),
          roughness: 0.55,
          metalness: 0.05
        });
        bodyMats.push(obj.material);
      }
    });
    root.add(gltf.scene);
    state.ready = true;
    resize();
    rebuildLetters();
  });

  async function rebuildLetters() {
    while (letters.children.length) {
      const child = letters.children.pop();
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    if (state.style !== "raised" || !state.text) return;
    const font = await loadFontFile(fontKeyFor(state.fontName));
    const depth = Math.max(1.2, state.raise);
    const letterH = Math.min(32, 10 + state.size * 0.4);
    const otPaths = font.getPaths(state.text.toUpperCase(), 0, 0, letterH);
    const shapes = otPaths.flatMap(pathToShapes).filter(Boolean);
    if (!shapes.length) return;
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: Math.max(0.25, depth * 0.12),
      bevelSize: Math.min(0.45, letterH * 0.05),
      bevelSegments: 2,
      curveSegments: 8
    });
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.center();
    const box = geo.boundingBox;
    const len = box.max.x - box.min.x;
    const tall = box.max.y - box.min.y;
    const fitW = 226 / Math.max(len, 1);
    const fitH = 34 / Math.max(tall, 1);
    const fit = Math.min(1, fitW, fitH);
    geo.scale(fit, fit, 1);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: new THREE.Color(state.color),
      roughness: 0.32,
      metalness: 0.04,
      side: THREE.DoubleSide
    }));
    const along = state.direction === "up" ? -1 : 1;
    const across = state.direction === "up" ? -1 : 1;
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, along, 0),
      new THREE.Vector3(0, 0, across),
      new THREE.Vector3(1, 0, 0)
    ));
    mesh.position.set(0.2 + depth / 2, 125, 0);
    letters.add(mesh);
  }

  window.tapPreview = {
    setColor(hex) { state.body = hex; bodyMats.forEach((m) => m.color.set(hex)); },
    setText(text) { state.text = text || ""; rebuildLetters(); },
    setFont(name) { state.fontName = name; rebuildLetters(); },
    setRaise(mm) { state.raise = Number(mm) || 2; rebuildLetters(); },
    setSize(n) { state.size = Number(n) || 34; rebuildLetters(); },
    setDirection(dir) { state.direction = dir === "up" ? "up" : "down"; rebuildLetters(); },
    setStyle(style) { state.style = style || "raised"; rebuildLetters(); },
    setLetterColor(hex) { state.color = hex; rebuildLetters(); }
  };
}
