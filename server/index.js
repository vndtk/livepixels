import WebSocket, { WebSocketServer } from "ws";
import { createClient } from "redis";

const redis = createClient();
redis.on("error", (err) => {
  console.error(err);
});
await redis.connect();

const wss = new WebSocketServer({ port: 3000 });
wss.on("connection", async (ws) => {
  console.log("connected");
  console.log(`Total connected clients: ${wss.clients.size}`);
  ws.on("message", async (message) => {
    await redis.set("texture", message);
    console.log("received message");
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
        console.log("sent message");
      }
    });
  });

  redis.get("texture", (err, reply) => {
    if (reply) {
      ws.send(reply);
    }
  });
});
