const headlines = [
  "The tap should look as good as what\u2019s in the <em>glass</em>.",
  "Don\u2019t put a boring handle on a good <em>beer</em>.",
  "Your beer deserves a better <em>handle</em>.",
  "Pour the beer. Brand the <em>handle</em>.",
  "If the tap looks generic, the beer does <em>too</em>.",
  "Make the tap as custom as the <em>recipe</em>.",
  "The last thing they see before they order <em>another</em>."
];
const heroTitle = document.querySelector(".hero-copy h1");
if (heroTitle) heroTitle.innerHTML = headlines[Math.floor(Math.random() * headlines.length)];

const handle = document.getElementById("handle");
const art = document.getElementById("art");
const status = document.getElementById("status");
const printZone = document.getElementById("printZone");
const preview = document.getElementById("preview");
let uploaded = false;
let letterColor = "#F4EFE4";
let letterStyle = "raised";
let letterDir = "down";
const tap3 = () => window.tapPreview || {};

const markSwatch = (root, btn) => {
  root.querySelectorAll(".swatch").forEach((s) => s.classList.remove("on"));
  btn.classList.add("on");
};

const escapeChar = (ch) => {
  if (ch === " ") return "&nbsp;";
  return String(ch).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
};

const raiseMm = () => (Number(document.getElementById("raise").value) / 10).toFixed(1);

const applyRaise = () => {
  const mm = Number(raiseMm());
  document.getElementById("raiseVal").textContent = mm.toFixed(1) + " mm";
  if (tap3().setRaise) tap3().setRaise(mm);
};

const renderLetters = () => {
  const raw = (document.getElementById("tapText").value || "").trim();
  art.className = "art " + letterStyle;
  if (tap3().setStyle) tap3().setStyle(letterStyle);
  if (tap3().setText) tap3().setText(raw);
  if (tap3().setLetterColor) tap3().setLetterColor(letterColor);
  if (tap3().setDirection) tap3().setDirection(letterDir);
  if (letterStyle === "none" || letterStyle === "raised") {
    if (letterStyle === "none") art.innerHTML = "";
    return;
  }
  if (letterStyle === "ornament") {
    art.style.color = "#111";
    if (!uploaded) {
      art.style.backgroundImage = "";
      art.style.backgroundColor = letterColor;
      art.textContent = raw ? raw.slice(0, 2).toUpperCase() : "";
    }
    return;
  }
  art.style.color = letterColor === "#111111" ? "#fff" : "#111";
  if (!uploaded) {
    art.style.backgroundImage = "";
    art.style.backgroundColor = letterColor;
    art.textContent = raw || "LOGO";
  }
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Could not read the file."));
  reader.onload = () => resolve(String(reader.result || ""));
  reader.readAsDataURL(file);
});

const saveToDropbox = async (file, name) => {
  if (!file) return "";
  const fileData = await fileToDataUrl(file);
  const res = await fetch("/api/dropbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, fileName: file.name, fileData })
  });
  const raw = await res.text();
  let data = {};
  try { data = JSON.parse(raw); } catch (e) { data = {}; }
  if (!res.ok) throw new Error(data.error || "Could not save the logo to Dropbox.");
  return data.path || "";
};

const postQuote = async (fields, file, statusEl) => {
  statusEl.textContent = "Sending…";
  if (file && file.size > 5000000) throw new Error("Logo is too large. Use a file under 5 MB.");
  if (file) {
    statusEl.textContent = "Saving logo to Dropbox…";
    fields.dropboxPath = await saveToDropbox(file, fields.name);
  }
  const fd = new FormData();
  fd.append("_subject", "New tap request from " + fields.name);
  fd.append("_template", "table");
  fd.append("_captcha", "false");
  Object.keys(fields).forEach((key) => fd.append(key, fields[key] == null ? "" : String(fields[key])));
  if (file) fd.append("logoFileName", file.name);
  const res = await fetch("https://formsubmit.co/ajax/orders@3dbrewtap.com", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: fd
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === "false" || data.success === false) {
    throw new Error(data.message || "Could not send the request.");
  }
  statusEl.textContent = fields.dropboxPath
    ? "Sent to orders@3dbrewtap.com. Logo saved in Dropbox."
    : "Sent to orders@3dbrewtap.com.";
};

document.getElementById("shapeChips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll("#shapeChips .chip").forEach((c) => c.classList.remove("on"));
  btn.classList.add("on");
  if (preview) preview.classList.toggle("is-3d", Boolean(btn.dataset.model));
  handle.className = "preview-handle " + (btn.dataset.shape === "narrow" ? "modern" : btn.dataset.shape);
});

document.getElementById("letterStyle").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll("#letterStyle .chip").forEach((c) => c.classList.remove("on"));
  btn.classList.add("on");
  letterStyle = btn.dataset.style;
  renderLetters();
});

document.getElementById("letterDir").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll("#letterDir .chip").forEach((c) => c.classList.remove("on"));
  btn.classList.add("on");
  letterDir = btn.dataset.dir;
  renderLetters();
});

document.getElementById("bodyColors").addEventListener("click", (e) => {
  const btn = e.target.closest(".swatch");
  if (!btn) return;
  markSwatch(e.currentTarget, btn);
  handle.style.background = btn.dataset.color;
  if (tap3().setColor) tap3().setColor(btn.dataset.color);
});

document.getElementById("artColors").addEventListener("click", (e) => {
  const btn = e.target.closest(".swatch");
  if (!btn) return;
  markSwatch(e.currentTarget, btn);
  letterColor = btn.dataset.ink || btn.dataset.color;
  renderLetters();
});

document.getElementById("printArea").addEventListener("change", (e) => {
  printZone.classList.toggle("on", e.target.checked);
});

document.getElementById("logoFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  uploaded = true;
  letterStyle = letterStyle === "raised" ? "plate" : letterStyle;
  document.querySelectorAll("#letterStyle .chip").forEach((c) => {
    c.classList.toggle("on", c.dataset.style === letterStyle);
  });
  art.className = "art " + letterStyle;
  art.textContent = "";
  art.style.backgroundImage = "url(" + URL.createObjectURL(file) + ")";
  if (tap3().setStyle) tap3().setStyle(letterStyle);
});

document.getElementById("tapText").addEventListener("input", renderLetters);

document.getElementById("fontSelect").addEventListener("change", (e) => {
  art.style.fontFamily = e.target.value;
  if (tap3().setFont) tap3().setFont(e.target.value);
});

const bind = (id, fn) => document.getElementById(id).addEventListener("input", fn);
bind("size", (e) => {
  if (letterStyle === "raised") art.style.fontSize = e.target.value + "px";
  else art.style.width = art.style.height = e.target.value * 2 + "px";
  document.getElementById("sizeVal").textContent = e.target.value;
  if (tap3().setSize) tap3().setSize(e.target.value);
});
bind("raise", applyRaise);
bind("rot", (e) => {
  art.style.transform = "translateX(-50%) rotate(" + e.target.value + "deg)";
  document.getElementById("rotVal").textContent = e.target.value + "\u00b0";
});
bind("pos", (e) => {
  art.style.top = e.target.value + "px";
  document.getElementById("posVal").textContent = e.target.value;
});

setTimeout(renderLetters, 600);
applyRaise();

document.getElementById("quoteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("custName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  if (!name || !email || !phone) {
    status.textContent = "Name, email, and phone are required.";
    return;
  }
  try {
    await postQuote({
      source: "Build your custom tap",
      name,
      email,
      phone,
      notes: document.getElementById("notes").value.trim(),
      shape: document.querySelector("#shapeChips .chip.on")?.dataset.shape || "",
      letterStyle,
      letterDir: letterDir === "up" ? "bottom to top" : "top to bottom",
      font: document.getElementById("fontSelect").value,
      letterRaise: raiseMm() + " mm",
      qty: document.getElementById("qty").value,
      tapText: document.getElementById("tapText").value.trim()
    }, document.getElementById("logoFile").files[0], status);
  } catch (err) {
    status.textContent = err.message;
  }
});

document.getElementById("logoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById("logoStatus");
  try {
    await postQuote({
      source: "Just send a logo",
      name: document.getElementById("logoName").value.trim(),
      email: document.getElementById("logoEmail").value.trim(),
      phone: document.getElementById("logoPhone").value.trim(),
      notes: document.getElementById("logoNotes").value.trim()
    }, document.getElementById("logoUpload").files[0], statusEl);
    e.target.reset();
  } catch (err) {
    statusEl.textContent = err.message;
  }
});

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCap = document.getElementById("lightboxCap");
const galleryImgs = [...document.querySelectorAll(".gallery .shot img")];
let current = 0;
let touchX = 0;
let touchY = 0;

const showAt = (i) => {
  current = (i + galleryImgs.length) % galleryImgs.length;
  const img = galleryImgs[current];
  const cap = img.closest(".shot").querySelector("figcaption");
  lightboxImg.src = img.currentSrc || img.src;
  lightboxImg.alt = img.alt || "";
  lightboxCap.textContent = cap ? cap.textContent : "";
};

const openLightbox = (i) => {
  showAt(i);
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeLightbox = () => {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

document.querySelector(".gallery").addEventListener("click", (e) => {
  const img = e.target.closest(".shot img");
  if (!img) return;
  openLightbox(galleryImgs.indexOf(img));
});

lightbox.addEventListener("click", (e) => {
  if (e.target.closest(".lightbox-prev")) {
    showAt(current - 1);
    return;
  }
  if (e.target.closest(".lightbox-next")) {
    showAt(current + 1);
    return;
  }
  if (e.target === lightbox || e.target.closest(".lightbox-close")) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") showAt(current - 1);
  if (e.key === "ArrowRight") showAt(current + 1);
});

lightbox.addEventListener("touchstart", (e) => {
  if (!lightbox.classList.contains("open") || !e.changedTouches[0]) return;
  touchX = e.changedTouches[0].clientX;
  touchY = e.changedTouches[0].clientY;
}, { passive: true });

lightbox.addEventListener("touchend", (e) => {
  if (!lightbox.classList.contains("open") || !e.changedTouches[0]) return;
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
  showAt(current + (dx < 0 ? 1 : -1));
}, { passive: true });
