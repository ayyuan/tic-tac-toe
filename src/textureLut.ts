import createLut from './createLut';
import gl from './gl';

// 140x141 size because we need to fit in 3^9 data
const WIDTH = 140;
const HEIGHT = 141;

const textureLut = gl.createTexture();
if (textureLut === null) {
  throw new Error('failed to gl.createTexture()');
}

gl.bindTexture(gl.TEXTURE_2D, textureLut);

gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

gl.texStorage2D(
  gl.TEXTURE_2D,
  1,
  gl.R32F,
  WIDTH,
  HEIGHT,
);
gl.texSubImage2D(
  gl.TEXTURE_2D,
  0,
  0,
  0,
  WIDTH,
  HEIGHT,
  gl.RED,
  gl.FLOAT,
  createLut(WIDTH, HEIGHT),
);

export default textureLut;
