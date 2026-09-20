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
let uploaded = false;

const markSwatch = (root, btn) => {
  root.querySelectorAll(".swatch").forEach((s) => s.classList.remove("on"));
  btn.classList.add("on");
};

document.getElementById("shapeChips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
  btn.classList.add("on");
  handle.className = "preview-handle " + btn.dataset.shape;
});

document.getElementById("bodyColors").addEventListener("click", (e) => {
  const btn = e.target.closest(".swatch");
  if (!btn) return;
  markSwatch(e.currentTarget, btn);
  handle.style.background = btn.dataset.color;
});

document.getElementById("artColors").addEventListener("click", (e) => {
  const btn = e.target.closest(".swatch");
  if (!btn) return;
  markSwatch(e.currentTarget, btn);
  if (!uploaded) art.style.backgroundImage = "";
  art.style.backgroundColor = btn.dataset.color;
  art.style.color = btn.dataset.ink || "#111";
});

document.getElementById("printArea").addEventListener("change", (e) => {
  printZone.classList.toggle("on", e.target.checked);
});

document.getElementById("logoFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  uploaded = true;
  art.textContent = "";
  art.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
});

document.getElementById("tapText").addEventListener("input", (e) => {
  if (!uploaded) art.textContent = e.target.value || "LOGO";
});

document.getElementById("fontSelect").addEventListener("change", (e) => {
  art.style.fontFamily = e.target.value;
});

const bind = (id, fn) => document.getElementById(id).addEventListener("input", fn);
bind("size", (e) => {
  art.style.width = art.style.height = e.target.value + "px";
  document.getElementById("sizeVal").textContent = e.target.value;
});
bind("rot", (e) => {
  art.style.transform = `translateX(-50%) rotate(${e.target.value}deg)`;
  document.getElementById("rotVal").textContent = e.target.value + "\u00b0";
});
bind("pos", (e) => {
  art.style.top = e.target.value + "px";
  document.getElementById("posVal").textContent = e.target.value;
});

document.getElementById("quoteForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  if (!email) {
    status.textContent = "Add an email so the quote can be sent.";
    return;
  }
  status.textContent = "Quote request captured. Next we connect this form to your email or shop backend.";
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
