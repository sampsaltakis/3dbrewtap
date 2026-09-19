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
