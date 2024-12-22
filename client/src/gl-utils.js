/**
 * @param {WebGL2RenderingContext} ctx
 * @param {string} source
 */
export const createShader = (ctx, type, source) => {
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
export const createProgram = (ctx, vertexShader, fragShader) => {
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
export const createDrawingSurface = (ctx, program) => {
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
export const createSurfaceTexture = (canvas, ctx, program) => {
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
export const resizeCanvas = (canvas) => {
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
export const getMousePosition = (event, canvas) => {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // client is a position relative to the window
  // what if canvas starts at 1, 1 instead of 0, 0?
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const textureX = x / canvas.width;
  const textureY = 1 - y / canvas.height;

  return { x: textureX, y: textureY };
};

export const getTextureData = (canvas, ctx, texture) => {
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

  return data;
};
