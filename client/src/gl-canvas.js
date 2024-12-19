import { vertexShaderSource } from "./shaders/vertex-shader";
import { fragShaderSource } from "./shaders/frag-shader";

/**
 * @param {WebGL2RenderingContext} ctx
 * @param {string} source
 */
const createShader = (ctx, type, source) => {
  const shader = ctx.createShader(type);
  ctx.shaderSource(shader, source);
  ctx.compileShader(shader);

  const success = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.error(ctx.getShaderInfoLog(shader));
  ctx.deleteShader(shader);
  return null;
};

/**
 *
 * @param {WebGL2RenderingContext} ctx
 * @param {*} vertexShader
 * @param {*} fragShader
 */
const createProgram = (ctx, vertexShader, fragShader) => {
  const program = ctx.createProgram();
  ctx.attachShader(program, vertexShader);
  ctx.attachShader(program, fragShader);
  ctx.linkProgram(program);

  const success = ctx.getProgramParameter(program, ctx.LINK_STATUS);
  if (success) {
    return program;
  }

  console.error(ctx.getProgramInfoLog(program));
  ctx.deleteProgram(program);
  return null;
};

/**
 *
 * @param {WebGL2RenderingContext} ctx
 * @param {WebGLProgram} program
 */
const createDrawingSurface = (ctx, program) => {
  const location = ctx.getAttribLocation(program, "a_position");
  const buffer = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);

  // points for two triangles that form a square
  const points = [-1, 1, -1, -1, 1, -1, -1, 1, 1, 1, 1, -1];
  ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(points), ctx.STATIC_DRAW);

  const vao = ctx.createVertexArray();
  ctx.bindVertexArray(vao);

  ctx.enableVertexAttribArray(location);
  ctx.vertexAttribPointer(location, 2, ctx.FLOAT, false, 0, 0);

  return vao;
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {WebGL2RenderingContext} ctx
 * @param {WebGLProgram} program
 */
const createSurfaceTexture = (canvas, ctx, program) => {
  const texture = ctx.createTexture();
  ctx.bindTexture(ctx.TEXTURE_2D, texture);

  // Set texture parameters
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);

  const color = [33, 33, 33, 255];
  const initialTextureData = new Uint8Array(canvas.width * canvas.height * 4);
  for (let i = 0; i < initialTextureData.length; i += 4) {
    initialTextureData.set(color, i);
  }

  ctx.texImage2D(
    ctx.TEXTURE_2D,
    0,
    ctx.RGBA,
    canvas.width,
    canvas.height,
    0,
    ctx.RGBA,
    ctx.UNSIGNED_BYTE,
    initialTextureData
  );

  return texture;
};

/**
 *
 * @param {HTMLCanvasElement} canvas
 */
const resizeCanvas = (canvas) => {
  if (
    canvas &&
    (canvas.width !== canvas.clientWidth ||
      canvas.height !== canvas.clientHeight)
  ) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
};

/**
 *
 * @param {MouseEvent} event
 * @param {HTMLCanvasElement} canvas
 */
const getMousePosition = (event, canvas) => {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // client is a position relative to the window
  // what if canvas starts at 1, 1 instead of 0, 0?
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const textureX = x / canvas.width;
  const textureY = 1 - y / canvas.height; // TODO: Understand what this does.

  return { x: textureX, y: textureY };
};

/**
 *
 * @param {MouseEvent} event
 * @param {WebGL2RenderingContext} ctx
 */
const draw = (event, canvas, ctx, texture) => {
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

export const setupGLCanvas = () => {
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

  canvas.addEventListener("mousemove", (e) => draw(e, canvas, ctx, texture));

  render(canvas, ctx, program, texture, vao);
};
