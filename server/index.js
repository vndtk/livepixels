import WebSocket, { WebSocketServer } from "ws";
import { createClient } from "redis";
import { createTexture, getViewportTexture } from "./texture.js";

const redis = createClient({});
redis.on("connect", () => console.log("Redis connected!"));
redis.on("error", (err) => {
  throw new Error(err);
});
await redis.connect();
await createTexture(redis);

const wss = new WebSocketServer({ port: 3000 });
wss.on("connection", async (ws) => {
  console.log("A new client connected!");
  console.log(`Total connected clients: ${wss.clients.size}`);

  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "screen":
        console.log("Screen data received!");

        const width = data.width;
        const height = data.height;

        const texture = await getViewportTexture(redis, width, height);
        ws.send(
          JSON.stringify({ type: "texture", texture: Array.from(texture) })
        );

        console.log("Texture data sent!");
        break;
      case "delta":
        console.log("Texture delta data received!");

        console.log(data.delta);
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });

        break;
      default:
        console.log("Unknown message type received!");
        break;
    }
  });
});

console.log("Server started!");
