import { vertexShaderSource } from "./shaders/vertex-shader";
import { fragShaderSource } from "./shaders/frag-shader";

import {
  createShader,
  createProgram,
  createDrawingSurface,
  createSurfaceTexture,
  getMousePosition,
  resizeCanvas,
} from "./gl-utils";

const sendTextureData = (canvas, ctx, texture, socket) => {
  const frame = ctx.createFramebuffer();
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, frame);
  ctx.framebufferTexture2D(
    ctx.FRAMEBUFFER,
    ctx.COLOR_ATTACHMENT0,
    ctx.TEXTURE_2D,
    texture,
    0
  );

  const data = new Uint8Array(canvas.width * canvas.height * 4);
  ctx.readPixels(
    0,
    0,
    canvas.width,
    canvas.height,
    ctx.RGBA,
    ctx.UNSIGNED_BYTE,
    data
  );
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
  ctx.deleteFramebuffer(frame);

  socket.send(data);
};

/**
 *
 * @param {MouseEvent} event
 * @param {WebGL2RenderingContext} ctx
 * @param {WebSocket} socket
 */
const draw = (event, canvas, ctx, texture, socket) => {
  const { x, y } = getMousePosition(event, canvas);
  const color = new Uint8Array([255, 0, 0, 255]);

  const pixelX = Math.min(
    Math.max(0, Math.floor(x * canvas.width)),
    canvas.width - 1
  );
  const pixelY = Math.min(
    Math.max(0, Math.floor(y * canvas.height)),
    canvas.height - 1
  );

  ctx.bindTexture(ctx.TEXTURE_2D, texture);
  ctx.texSubImage2D(
    ctx.TEXTURE_2D,
    0,
    pixelX,
    pixelY,
    1,
    1,
    ctx.RGBA,
    ctx.UNSIGNED_BYTE,
    color
  );
};

/**
 *
 * @param {HTMLCanvasElement} canvas
 * @param {WebGL2RenderingContext} ctx
 * @param {WebGLProgram} program
 * @param {WebGLTexture} texture
 * @param {WebGLVertexArrayObject} vao
 */
const render = (canvas, ctx, program, texture, vao) => {
  resizeCanvas(canvas);
  ctx.viewport(0, 0, canvas.width, canvas.height);
  ctx.clearColor(0, 0, 0, 0);
  ctx.clear(ctx.COLOR_BUFFER_BIT);

  ctx.useProgram(program);

  ctx.activeTexture(ctx.TEXTURE0);
  ctx.bindTexture(ctx.TEXTURE_2D, texture);
  const location = ctx.getUniformLocation(program, "u_texture");
  ctx.uniform1i(location, 0); // Texture unit 0

  ctx.bindVertexArray(vao);

  ctx.drawArrays(ctx.TRIANGLES, 0, 6);

  requestAnimationFrame(() => render(canvas, ctx, program, texture, vao));
};

/**
 *
 * @param {WebSocket} socket
 */
export const setupGLCanvas = (socket) => {
  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.querySelector("#pixel-canvas");
  const ctx = canvas.getContext("webgl2");

  if (canvas === null || ctx === null) {
    console.error("No WebGL context available!");
    return;
  }
  resizeCanvas(canvas);

  console.log("WebGL context available!");
  console.log("Attempting to compile shaders...");

  const vertexShader = createShader(ctx, ctx.VERTEX_SHADER, vertexShaderSource);
  const fragShader = createShader(ctx, ctx.FRAGMENT_SHADER, fragShaderSource);

  if (vertexShader === null || fragShader === null) {
    console.error("Shaders compilation failed!");
    return;
  }

  console.log("All shaders compiled successfully!");
  console.log("Attempting to link WebGL program...");

  const program = createProgram(ctx, vertexShader, fragShader);
  if (program === null) {
    console.error("Program link failed!");
    return;
  }

  const vao = createDrawingSurface(ctx, program);
  const texture = createSurfaceTexture(canvas, ctx, program);
  console.log("WebGL is ready!");

  canvas.addEventListener("mousemove", (e) => {
    if (e.buttons === 1) {
      draw(e, canvas, ctx, texture, socket);
    }
  });

  canvas.addEventListener("mouseup", (e) => {
    sendTextureData(canvas, ctx, texture, socket);
  });

  socket.onmessage = async (event) => {
    console.log("Received message from server:", event.data);
    const buffer = await event.data.arrayBuffer();
    const data = new Uint8Array(buffer);

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
      data
    );
  };

  render(canvas, ctx, program, texture, vao);
};
