import gl from '../gl';

const quadAttribBuffer = gl.createBuffer();
if (quadAttribBuffer === null) {
  throw new Error('failed to gl.createBuffer()');
}

gl.bindBuffer(gl.ARRAY_BUFFER, quadAttribBuffer);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    -1, -1,
    +1, -1,
    -1, +1,
    +1, +1,
  ]),
  gl.STATIC_DRAW
);

export default quadAttribBuffer;
