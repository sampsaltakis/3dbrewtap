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

const sampleCubic = (p0, p1, p2, p3, steps) => {
  const pts = [];
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    pts.push(new THREE.Vector2(
      u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
      u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
    ));
  }
  return pts;
};

const sampleQuad = (p0, p1, p2, steps) => {
  const pts = [];
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    pts.push(new THREE.Vector2(
      u*u*p0.x + 2*u*t*p1.x + t*t*p2.x,
      u*u*p0.y + 2*u*t*p1.y + t*t*p2.y
    ));
  }
  return pts;
};

const contoursFromPath = (otPath) => {
  const contours = [];
  let current = [];
  let x = 0;
  let y = 0;
  const push = (nx, ny) => current.push(new THREE.Vector2(nx, -ny));
  otPath.commands.forEach((cmd) => {
    if (cmd.type === "M") {
      current = [];
      contours.push(current);
      x = cmd.x; y = cmd.y;
      push(x, y);
    } else if (cmd.type === "L") {
      x = cmd.x; y = cmd.y;
      push(x, y);
    } else if (cmd.type === "C") {
      const pts = sampleCubic(
        new THREE.Vector2(x, y),
        new THREE.Vector2(cmd.x1, cmd.y1),
        new THREE.Vector2(cmd.x2, cmd.y2),
        new THREE.Vector2(cmd.x, cmd.y),
        8
      );
      pts.forEach((p) => push(p.x, p.y));
      x = cmd.x; y = cmd.y;
    } else if (cmd.type === "Q") {
      const pts = sampleQuad(
        new THREE.Vector2(x, y),
        new THREE.Vector2(cmd.x1, cmd.y1),
        new THREE.Vector2(cmd.x, cmd.y),
        8
      );
      pts.forEach((p) => push(p.x, p.y));
      x = cmd.x; y = cmd.y;
    } else if (cmd.type === "Z") {
      if (current.length && (current[0].x !== current[current.length - 1].x || current[0].y !== current[current.length - 1].y)) {
        current.push(current[0].clone());
      }
    }
  });
  return contours.filter((c) => c.length > 3);
};

const pointIn = (pts, pt) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    const hit = ((a.y > pt.y) !== (b.y > pt.y)) && (pt.x < (b.x - a.x) * (pt.y - a.y) / ((b.y - a.y) || 1e-9) + a.x);
    if (hit) inside = !inside;
  }
  return inside;
};

const shapesFromGlyph = (otPath) => {
  const contours = contoursFromPath(otPath);
  if (!contours.length) return [];
  const items = contours.map((pts) => ({ pts, area: Math.abs(THREE.ShapeUtils.area(pts)) })).sort((a, b) => b.area - a.area);
  const used = new Set();
  const shapes = [];
  items.forEach((item, i) => {
    if (used.has(i)) return;
    const shape = new THREE.Shape(item.pts);
    items.forEach((other, j) => {
      if (i === j || used.has(j) || other.area >= item.area) return;
      const mid = other.pts[Math.floor(other.pts.length / 2)];
      if (pointIn(item.pts, mid)) {
        shape.holes.push(new THREE.Path(other.pts));
        used.add(j);
      }
    });
    used.add(i);
    shapes.push(shape);
  });
  return shapes;
};

const state = {
  text: "",
  style: "raised",
  color: "#111111",
  body: "#8A8A8A",
  size: 34,
  raise: 2,
  direction: "up",
  fontName: "anton",
  model: "models/Tap-Narrow.glb",
  ready: false
};

const canvas = document.getElementById("tapCanvas");
if (!canvas) {
  window.tapPreview = { setColor() {}, setText() {}, setFont() {}, setRaise() {}, setSize() {}, setDirection() {}, setStyle() {}, setLetterColor() {}, setModel() {}, capture() { return ""; } };
} else {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x171717, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 5000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 160;
  controls.maxDistance = 1200;
  controls.target.set(0, 125, 0);
  camera.position.set(420, 125, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(320, 180, 80);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.55);
  rim.position.set(-80, 80, -160);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);
  const bodyGroup = new THREE.Group();
  const letters = new THREE.Group();
  root.add(bodyGroup);
  root.add(letters);
  let bodyMats = [];
  let bodyBox = new THREE.Box3(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(0, 250, 20));
  let framed = false;
  const loader = new GLTFLoader();

  const frameTap = () => {
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);
    const fov = (camera.fov * Math.PI) / 180;
    const fitH = size.y * 0.62;
    const dist = fitH / Math.tan(fov / 2);
    camera.position.set(center.x + dist, center.y, center.z);
    camera.near = Math.max(1, dist / 50);
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.update();
    framed = true;
  };

  const resize = () => {
    const parent = canvas.parentElement;
    const w = Math.max(parent ? parent.clientWidth : canvas.clientWidth, 1);
    const h = Math.max(parent ? parent.clientHeight : canvas.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (framed) frameTap();
  };
  resize();
  window.addEventListener("resize", resize);
  const tick = () => { controls.update(); renderer.render(scene, camera); requestAnimationFrame(tick); };
  tick();

  const clearGroup = (group) => {
    while (group.children.length) {
      const child = group.children.pop();
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  };

  const applyBody = (gltf) => {
    clearGroup(bodyGroup);
    bodyMats = [];
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
    bodyGroup.add(gltf.scene);
    bodyBox.setFromObject(bodyGroup);
    state.ready = true;
    resize();
    frameTap();
    rebuildLetters();
  };

  const loadModel = (url) => {
    state.model = url;
    loader.load(url, applyBody);
  };
  loadModel(state.model);

  async function rebuildLetters() {
    clearGroup(letters);
    if (state.style !== "raised" || !state.text) return;
    const font = await loadFontFile(fontKeyFor(state.fontName));
    const depth = Math.max(1.2, state.raise);
    const letterH = Math.min(30, 10 + state.size * 0.38);
    const raw = state.text.toUpperCase();
    const shapes = [];
    let x = 0;
    [...raw].forEach((ch) => {
      const glyph = font.charToGlyph(ch);
      const path = glyph.getPath(x, 0, letterH);
      shapes.push(...shapesFromGlyph(path));
      x += font.getAdvanceWidth(ch, letterH);
    });
    if (!shapes.length) return;
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth,
      steps: 1,
      bevelEnabled: false,
      curveSegments: 1
    });
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.center();
    const box = geo.boundingBox;
    const usableY = Math.max(40, (bodyBox.max.y - bodyBox.min.y) * 0.9);
    const usableZ = Math.max(16, (bodyBox.max.z - bodyBox.min.z) * 0.7);
    const fit = Math.min(1, usableY / Math.max(box.max.x - box.min.x, 1), usableZ / Math.max(box.max.y - box.min.y, 1));
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
    const faceX = (Number.isFinite(bodyBox.max.x) ? bodyBox.max.x : 0) + depth / 2;
    const midY = (bodyBox.min.y + bodyBox.max.y) / 2;
    mesh.position.set(faceX, midY, 0);
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
    setLetterColor(hex) { state.color = hex; rebuildLetters(); },
    setModel(url) { if (url && url !== state.model) loadModel(url); },
    capture() {
      renderer.render(scene, camera);
      return canvas.toDataURL("image/png");
    }
  };
}
