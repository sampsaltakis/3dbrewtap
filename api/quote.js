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
    return { status: 503, json: { error: "Email is not configured yet. Add RESEND_API_KEY in Vercel." } };
  }

  const name = String((body && body.name) || "").trim();
  const email = String((body && body.email) || "").trim();
  const phone = String((body && body.phone) || "").trim();
  if (!name || !email || !phone) {
    return { status: 400, json: { error: "Name, email, and phone are required." } };
  }

  let fileData = String((body && body.fileData) || "");
  const comma = fileData.indexOf(",");
  if (fileData.startsWith("data:") && comma !== -1) fileData = fileData.slice(comma + 1);
  const fileName = String((body && body.fileName) || "").trim();
  const attachments = [];
  if (fileData && fileName) {
    if (fileData.length > 3500000) {
      return { status: 413, json: { error: "Logo is too large. Use a file under about 2.5 MB." } };
    }
    attachments.push({ filename: fileName, content: fileData });
  }

  const html =
    "<h2>New 3DBrewTap request</h2>" +
    "<p><strong>Source:</strong> " + escapeHtml((body && body.source) || "website") + "</p>" +
    "<p><strong>Name:</strong> " + escapeHtml(name) + "</p>" +
    "<p><strong>Email:</strong> " + escapeHtml(email) + "</p>" +
    "<p><strong>Phone:</strong> " + escapeHtml(phone) + "</p>" +
    "<p><strong>Shape:</strong> " + escapeHtml((body && body.shape) || "n/a") + "</p>" +
    "<p><strong>Qty:</strong> " + escapeHtml((body && body.qty) || "1") + "</p>" +
    "<p><strong>Text on handle:</strong> " + escapeHtml((body && body.tapText) || "n/a") + "</p>" +
    "<p><strong>Notes:</strong><br>" + escapeHtml((body && body.notes) || "none").replace(/\n/g, "<br>") + "</p>" +
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
    return { status: 502, json: { error: "Email provider rejected the message.", detail: err.slice(0, 400) } };
  }
  return { status: 200, json: { ok: true } };
}

function reply(res, status, json) {
  if (res && typeof res.status === "function") return res.status(status).json(json);
  return Response.json(json, { status: status });
}

async function run(req, res) {
  try {
    const method = req && req.method ? req.method : "POST";
    if (method === "OPTIONS") {
      if (res && typeof res.status === "function") return res.status(204).end();
      return new Response(null, { status: 204 });
    }
    if (method !== "POST") return reply(res, 405, { error: "POST only" });

    let body = req.body;
    if (typeof req.json === "function" && (body === undefined || body === null)) {
      body = await req.json().catch(function () { return {}; });
    } else if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; }
    }
    const result = await sendQuote(body || {});
    return reply(res, result.status, result.json);
  } catch (err) {
    return reply(res, 500, { error: err && err.message ? err.message : "Server error" });
  }
}

module.exports = run;
module.exports.POST = function (request) { return run(request); };
module.exports.GET = function () { return reply(null, 405, { error: "POST only" }); };
