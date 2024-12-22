import "./style.css";
import { setupGLCanvas, render, draw } from "./gl-canvas";
import { getTextureData } from "./gl-utils";

const socket = new WebSocket("ws://localhost:3000");
const { canvas, ctx, program, texture, vao } = setupGLCanvas(socket);

socket.onopen = (event) => {
  console.log("Sending initial screen size to server...");
  console.log(event);
  socket.send(
    JSON.stringify({
      type: "screen",
      width: canvas.width,
      height: canvas.height,
    })
  );
};

socket.onmessage = async (event) => {
  console.log("Received message from server...");

  const data = JSON.parse(event.data);
  switch (data.type) {
    case "texture":
      const textureData = new Uint8Array(data.texture);
      ctx.bindTexture(ctx.TEXTURE_2D, texture);
      ctx.texSubImage2D(
        ctx.TEXTURE_2D,
        0,
        0,
        0,
        canvas.width,
        canvas.height,
        ctx.RGBA,
        ctx.UNSIGNED_BYTE,
        textureData
      );

      console.log("Texture data received and drawn!");
      break;
    case "delta":
      console.log("Texture delta data received!");

      data.delta.forEach(({ x, y }) => {
        ctx.bindTexture(ctx.TEXTURE_2D, texture);
        ctx.texSubImage2D(
          ctx.TEXTURE_2D,
          0,
          x,
          y,
          1,
          1,
          ctx.RGBA,
          ctx.UNSIGNED_BYTE,
          new Uint8Array([255, 0, 0, 255])
        );
      });

      console.log("Texture delta data applied!");
      break;
    default:
      console.log("Unknown message type received!");
  }
};

let delta = []; // store texture changes
canvas.addEventListener("mousedown", (event) => {
  delta = []; // reset changes
});
canvas.addEventListener("mousemove", (event) => {
  if (event.buttons !== 1) return;

  const { x, y } = draw(event, canvas, ctx, texture);
  delta.push({ x, y });
});

setInterval(() => {
  if (delta.length === 0) return;

  socket.send(
    JSON.stringify({
      type: "delta",
      delta,
    })
  );

  delta = [];
}, 30);

render(canvas, ctx, program, texture, vao);

// socket.onmessage = async (event) => {
//   console.log(event);
//   console.log(event.data);

//   const buffer = await event.data.arrayBuffer();
//   const data = new Uint8Array(buffer);
//   console.log(data);

//   ctx.bindTexture(ctx.TEXTURE_2D, texture);
//   ctx.texSubImage2D(
//     ctx.TEXTURE_2D,
//     0,
//     0,
//     0,
//     canvas.width,
//     canvas.height,
//     ctx.RGBA,
//     ctx.UNSIGNED_BYTE,
//     data
//   );
// };

// canvas.addEventListener("mousemove", (event) => {
//   if (event.buttons !== 1) return;

//   draw(event, canvas, ctx, texture);
// });

// canvas.addEventListener("mouseup", (event) => {
//   const data = getTextureData(canvas, ctx, texture);
//   socket.send(
//     JSON.stringify({
//       type: "texture",
//       texture: data,
//     })
//   );
// });

// render(canvas, ctx, program, texture, vao);
