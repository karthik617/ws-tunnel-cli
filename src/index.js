import { createHttpTunnel } from "./httpClient.js";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log(`
  Usage:
    ws-tunnel http <localPort> <wss:remoteHost>
  
  Examples:
    ws-tunnel http 8080 wss://localhost:8080
  `);
  process.exit(1);
}
const [mode, localPort, remoteHost] = args;

if (mode !== "http" || !localPort || !remoteHost) {
  console.log("Usage: ws-tunnel http <localPort> <wss:remoteHost>");
  process.exit(1);
}
try {
    createHttpTunnel(Number(localPort), remoteHost);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
