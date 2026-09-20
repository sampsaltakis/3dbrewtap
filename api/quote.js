function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

async function sendQuote(body) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      status: 503,
      json: { error: "Email is not configured yet. Add RESEND_API_KEY in Vercel." }
    };
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const notes = String(body.notes || "").trim();
  const source = String(body.source || "website").trim();
  const shape = String(body.shape || "").trim();
  const qty = String(body.qty || "1").trim();
  const tapText = String(body.tapText || "").trim();
  const fileName = String(body.fileName || "").trim();
  let fileData = String(body.fileData || "");
  const comma = fileData.indexOf(",");
  if (fileData.startsWith("data:") && comma !== -1) fileData = fileData.slice(comma + 1);

  if (!name || !email || !phone) {
    return { status: 400, json: { error: "Name, email, and phone are required." } };
  }

  const attachments = [];
  if (fileData && fileName) {
    if (fileData.length > 3500000) {
      return { status: 413, json: { error: "Logo is too large. Use a file under about 2.5 MB." } };
    }
    attachments.push({ filename: fileName, content: fileData });
  }

  const html =
    "<h2>New 3DBrewTap request</h2>" +
    "<p><strong>Source:</strong> " + escapeHtml(source) + "</p>" +
    "<p><strong>Name:</strong> " + escapeHtml(name) + "</p>" +
    "<p><strong>Email:</strong> " + escapeHtml(email) + "</p>" +
    "<p><strong>Phone:</strong> " + escapeHtml(phone) + "</p>" +
    "<p><strong>Shape:</strong> " + escapeHtml(shape || "n/a") + "</p>" +
    "<p><strong>Qty:</strong> " + escapeHtml(qty) + "</p>" +
    "<p><strong>Text on handle:</strong> " + escapeHtml(tapText || "n/a") + "</p>" +
    "<p><strong>Notes:</strong><br>" + escapeHtml(notes || "none").replace(/\n/g, "<br>") + "</p>" +
    "<p><strong>Logo attached:</strong> " + (fileName ? escapeHtml(fileName) : "no file") + "</p>";

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || "3DBrewTap <onboarding@resend.dev>",
      to: ["orders@3dbrewtap.com"],
      reply_to: email,
      subject: "New tap request from " + name,
      html,
      attachments
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    return {
      status: 502,
      json: { error: "Email provider rejected the message.", detail: err.slice(0, 400) }
    };
  }

  return { status: 200, json: { ok: true } };
}

module.exports = async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    let body = req.body;
    if (!body || typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; }
    }

    const result = await sendQuote(body);
    return res.status(result.status).json(result.json);
  } catch (err) {
    return res.status(500).json({ error: err && err.message ? err.message : "Server error" });
  }
};
