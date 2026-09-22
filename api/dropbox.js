module.exports = async function handler(req, res) {
  const send = function (status, body) {
    if (res && typeof res.status === "function") return res.status(status).json(body);
    return Response.json(body, { status: status });
  };

  try {
    const method = req.method || "POST";
    if (method === "OPTIONS") {
      if (res && res.status) return res.status(204).end();
      return new Response(null, { status: 204 });
    }
    if (method !== "POST") return send(405, { error: "POST only" });

    const token = process.env.DROPBOX_ACCESS_TOKEN;
    if (!token) return send(503, { error: "Dropbox is not connected yet." });

    let body = req.body;
    if (typeof req.json === "function" && (body === undefined || body === null)) {
      body = await req.json().catch(function () { return {}; });
    } else if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    const fileName = String(body.fileName || "logo.png").replace(/[^a-zA-Z0-9._-]/g, "_");
    let fileData = String(body.fileData || "");
    const comma = fileData.indexOf(",");
    if (fileData.indexOf("data:") === 0 && comma !== -1) fileData = fileData.slice(comma + 1);
    if (!fileData) return send(400, { error: "Missing file." });

    const folder = process.env.DROPBOX_FOLDER || "/3DBrewTap";
    const stamp = Date.now();
    const safeName = String(body.name || "customer").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
    const path = folder + "/" + stamp + "-" + safeName + "-" + fileName;

    const binary = Buffer.from(fileData, "base64");
    if (binary.length > 4000000) return send(413, { error: "File is too large for Dropbox upload. Use a smaller image." });

    await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ path: folder, autorename: false })
    }).catch(function () { return null; });

    const drop = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({ path: path, mode: "add", autorename: true, mute: true })
      },
      body: binary
    });
    const text = await drop.text();
    if (!drop.ok) {
      let summary = "Dropbox rejected the upload.";
      try {
        const err = JSON.parse(text);
        const tag = err.error && err.error[".tag"];
        if (err.error_summary && String(err.error_summary).indexOf("expired_access_token") !== -1) {
          summary = "Dropbox login expired. Reconnect the Dropbox token in Vercel.";
        } else if (tag === "insufficient_space") {
          summary = "Dropbox is out of space.";
        } else if (err.error_summary) {
          summary = "Dropbox rejected the upload: " + String(err.error_summary).slice(0, 120);
        }
      } catch (e) {}
      return send(502, { error: summary, detail: text.slice(0, 300) });
    }
    const meta = JSON.parse(text);
    return send(200, { ok: true, path: meta.path_display || path });
  } catch (err) {
    return send(500, { error: err && err.message ? err.message : "Upload failed" });
  }
};
