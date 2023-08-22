import gl from '../gl';

const buf = gl.createBuffer();
if (buf === null) {
  throw new Error('failed to gl.createBuffer()');
}

const quadAttribBuffer = buf;
gl.bindBuffer(gl.ARRAY_BUFFER, quadAttribBuffer);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    -1, -1,
    +3, -1,
    -1, +3,
  ]),
  gl.STATIC_DRAW
);

export default quadAttribBuffer;
