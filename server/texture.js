export const TEXTURE_WIDTH = 3840;
export const TEXTURE_HEIGHT = 2160;
export const CHUNK_WIDTH = 256;
export const CHUNK_HEIGHT = 256;
export const CHUNK_SIZE = 4 * CHUNK_WIDTH * CHUNK_HEIGHT;

export const createTexture = async (redis) => {
  const texture = new Uint8Array(4 * TEXTURE_WIDTH * TEXTURE_HEIGHT);
  const colorBuffer = Buffer.from([33, 33, 33, 255]);
  for (let i = 0; i < texture.length; i += 4) {
    texture.set(colorBuffer, i);
  }

  for (let i = 0; i < texture.length; i += CHUNK_SIZE) {
    const chunk = texture.slice(i, i + CHUNK_SIZE);
    await redis.set(
      `texture:${i / CHUNK_SIZE}`,
      Buffer.from(chunk).toString("base64")
    );
  }
};

export const getChunk = async (redis, index) => {
  const res = await redis.get(`texture:${index}`);
  return new Uint8Array(Buffer.from(res, "base64"));
};

export const getViewportTexture = async (redis, width, height) => {
  const size = 4 * width * height;
  const totalChunksNeeded = Math.ceil(size / CHUNK_SIZE);
  const texture = new Uint8Array(totalChunksNeeded * CHUNK_SIZE);

  for (let i = 0; i < totalChunksNeeded; i++) {
    const chunk = await getChunk(redis, i);
    const offset = i * CHUNK_SIZE;
    texture.set(chunk, offset);
  }

  return texture.slice(0, size);
};
