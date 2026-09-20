const handle = document.getElementById("handle");
const art = document.getElementById("art");
const status = document.getElementById("status");
let uploaded = false;

document.getElementById("shapeChips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
  btn.classList.add("on");
  handle.className = "preview-handle " + btn.dataset.shape;
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
  document.getElementById("rotVal").textContent = e.target.value + "°";
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
