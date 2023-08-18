import gl from './gl';
import programInitState from './programs/programInitState';

// 29 global variables in common.glsl
// mat3 counts as 9
const WIDTH = 29;
const HEIGHT = 1;

// texture
const texture1 = createStateTexture();
// framebuffer
const fb1 = createStateFramebuffer(texture1);
initState(fb1);

// create 2nd texture and fbo for a feedback loop
// 2nd texture
const texture2 = createStateTexture();
// 2nd framebuffer
const fb2 = createStateFramebuffer(texture2);

export default {
  targets: [fb1, fb2],
  textures: [texture1, texture2],
  lastRenderIndex: 0,
  resolution: {
    width: WIDTH,
    height: HEIGHT,
  },
};

function createStateTexture() {
  const stateTexture = gl.createTexture();
  if (stateTexture === null) {
    throw new Error('failed to gl.createTexture()');
  }
  
  gl.bindTexture(gl.TEXTURE_2D, stateTexture);
  // disable filtering
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  
  gl.texStorage2D(
    gl.TEXTURE_2D,
    1,
    gl.R32F,
    WIDTH,
    HEIGHT,
  );

  return stateTexture;
}

function createStateFramebuffer(texture: WebGLTexture) {
  const fb = gl.createFramebuffer();
  if (fb === null) {
    throw new Error('failed to gl.createFramebuffer()');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  return fb;
}

function initState(fb: WebGLFramebuffer) {
  // program
  gl.useProgram(programInitState);

  // need this line because of:
  // https://stackoverflow.com/questions/62074822/webgl-feedback-loop-formed-between-framebuffer-and-active-texture
  gl.bindTexture(gl.TEXTURE_2D, null);

  // render
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, WIDTH, HEIGHT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
