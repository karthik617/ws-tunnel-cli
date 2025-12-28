import WebSocket from "ws";
import http from "http";

export function createHttpTunnel(localPort, remoteHost) {
  if (!remoteHost || !/^wss?:\/\//.test(remoteHost)) {
    throw new Error("remoteHost must be ws:// or wss:// url");
  }

  const ws = new WebSocket(remoteHost);

  ws.on("open", () => {
    ws.send(JSON.stringify({
      type: "register",
      localPort
    }));
  });

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg.toString());

    // 🌍 PUBLIC URL LOGIC (IMPORTANT)
    if (data.type === "registered") {
      const url = getPublicUrl(remoteHost, data.id);
      console.log(`🌍 Public URL: ${url}`);
      return;
    }

    if (data.type === "http_request") {
      const response = await forwardToLocal(data, localPort);
      ws.send(JSON.stringify({
        type: "http_response",
        requestId: data.requestId,
        ...response
      }));
    }
  });

  ws.on("close", () => {
    console.error("❌ Tunnel disconnected");
    process.exit(1);
  });

  ws.on("error", (err) => {
    console.error("❌ Tunnel error:", err.message);
    process.exit(1);
  });
}

function getPublicUrl(remoteHost, id) {
  const { protocol, host } = new URL(remoteHost.replace("ws", "http"));

  // Local dev → path based
  if (host.startsWith("localhost") || host.startsWith("127.")) {
    return `${protocol}//${host}/tunnel/${id}`;
  }

  // Production (Render) → subdomain based
  // return `${protocol}//${id}.${host}`;
  return `${protocol}//${host}/tunnel/${id}`
}

function forwardToLocal(req, localPort) {
  return new Promise((resolve) => {
    const headers = { ...req.headers };
    delete headers.host; // 🔥 IMPORTANT

    const localReq = http.request(
      {
        host: "localhost",
        port: localPort,
        method: req.method,
        path: req.path,
        headers
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body
          });
        });
      }
    );

    localReq.on("error", (err) => {
      resolve({
        status: 502,
        body: err.message
      });
    });

    if (req.body) localReq.write(req.body);
    localReq.end();
  });
}
