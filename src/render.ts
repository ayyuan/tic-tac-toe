import textureFont from './textureFont';
import gl from './gl';
import programState from './programs/programState';
import programTicTacToe from './programs/programTicTacToe';
import state from './state';
import textureLut from './textureLut';

// uniform locations
const tictactoeLocations = {
  uResolution: gl.getUniformLocation(programTicTacToe, 'uResolution'),
  uFont: gl.getUniformLocation(programTicTacToe, 'uFont'),
  uState: gl.getUniformLocation(programTicTacToe, 'uState'),
};
const stateLocations = {
  uResolution: gl.getUniformLocation(programState, 'uResolution'),
  uState: gl.getUniformLocation(programState, 'uState'),
  uLut: gl.getUniformLocation(programState, 'uLut'),
  uMouse: gl.getUniformLocation(programState, 'uMouse'),
  uTimeDelta: gl.getUniformLocation(programState, 'uTimeDelta'),
};

// uniform vec3 uMouse
let mousePosX = -1.;
let mousePosY = -1.;
let isMouseUp = -1.;
const canvas = document.querySelector('canvas') as HTMLCanvasElement;
canvas.addEventListener('pointerup', (ev) => {
  const rect = canvas.getBoundingClientRect();
  mousePosX = Math.floor((ev.clientX - rect.left) / (rect.right - rect.left) * canvas.width);
  mousePosY = Math.floor(canvas.height - (ev.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height);
  isMouseUp = 1.; // > 0 means true
});

// texture unit locations
const stateTexUnit = 0;
const fontTexUnit = 1;
const lutTexUnit = 2;

export default function render(deltaTime: number) {
  // -- render to state fbo --
  gl.useProgram(programState)

  // uniforms
  gl.activeTexture(gl.TEXTURE0 + stateTexUnit);
  gl.bindTexture(gl.TEXTURE_2D, state.textures[state.lastRenderIndex]);
  gl.uniform1i(stateLocations.uState, stateTexUnit);

  gl.activeTexture(gl.TEXTURE0 + lutTexUnit);
  gl.bindTexture(gl.TEXTURE_2D, textureLut);
  gl.uniform1i(stateLocations.uLut, lutTexUnit);

  gl.uniform1f(stateLocations.uTimeDelta, deltaTime / 1000);
  gl.uniform2f(stateLocations.uResolution, gl.canvas.width, gl.canvas.height);
  gl.uniform3f(
    stateLocations.uMouse,
    mousePosX,
    mousePosY,
    isMouseUp,
  );
  isMouseUp = -1.; // < 0, means false

  // render
  const ndx = 1 - state.lastRenderIndex;
  gl.bindFramebuffer(gl.FRAMEBUFFER, state.targets[ndx]);
  gl.viewport(0, 0, state.resolution.width, state.resolution.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // swapping fbos and textures
  state.lastRenderIndex = ndx;

  // -- render to screen --
  gl.useProgram(programTicTacToe);

  // set uniforms
  gl.activeTexture(gl.TEXTURE0 + stateTexUnit);
  gl.bindTexture(gl.TEXTURE_2D, state.textures[state.lastRenderIndex]);
  gl.uniform1i(tictactoeLocations.uState, stateTexUnit);

  gl.activeTexture(gl.TEXTURE0 + fontTexUnit);
  gl.bindTexture(gl.TEXTURE_2D, textureFont);
  gl.uniform1i(tictactoeLocations.uFont, fontTexUnit);

  gl.uniform2f(tictactoeLocations.uResolution, gl.canvas.width, gl.canvas.height);

  // render
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
