import gl from './gl';
import fontTextureSrc from './assets/font.png';

const fontTexture = gl.createTexture();
if (fontTexture === null) {
  throw new Error('failed to gl.createTexture()');
}

gl.bindTexture(gl.TEXTURE_2D, fontTexture);

gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

// load image into texture
await new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = '';
  image.onload = () => {
    // because async loading so we need to rebind to ensure correct texture is binded
    gl.bindTexture(gl.TEXTURE_2D, fontTexture);
    gl.texStorage2D(
      gl.TEXTURE_2D,
      1,
      gl.RGBA8,
      image.width,
      image.height,
    );
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      image.width,
      image.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image,
    );
    resolve(image);
  };
  image.onerror = reject;
  image.src = fontTextureSrc;
});

export default fontTexture;
