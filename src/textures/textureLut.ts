import gl from '../gl';
import lut from './lut.json';
import { WIDTH, HEIGHT } from './createLut';

const tex = gl.createTexture();
if (tex === null) {
  throw new Error('failed to gl.createTexture()');
}

const textureLut = tex;
gl.bindTexture(gl.TEXTURE_2D, textureLut);

gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

gl.texStorage2D(
  gl.TEXTURE_2D,
  1,
  gl.R8I,
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
  gl.RED_INTEGER,
  gl.BYTE,
  new Int8Array(lut),
);

export default textureLut;
