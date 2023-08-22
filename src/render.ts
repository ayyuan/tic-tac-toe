import textureFont from './textures/textureFont';
import gl from './gl';
import programState from './programs/programState';
import programTicTacToe from './programs/programTicTacToe';
import state from './state';
import textureLut from './textures/textureLut';

// uniform locations
const tictactoeLocations = {
  uResolution: gl.getUniformLocation(programTicTacToe, 'uResolution'),
  uFont: gl.getUniformLocation(programTicTacToe, 'uFont'),
  uState: gl.getUniformLocation(programTicTacToe, 'uState'),
  uTime: gl.getUniformLocation(programTicTacToe, 'uTime'),
};
const stateLocations = {
  uResolution: gl.getUniformLocation(programState, 'uResolution'),
  uState: gl.getUniformLocation(programState, 'uState'),
  uLut: gl.getUniformLocation(programState, 'uLut'),
  uMouse: gl.getUniformLocation(programState, 'uMouse'),
  uTimeDelta: gl.getUniformLocation(programState, 'uTimeDelta'),
  uFrame: gl.getUniformLocation(programState, 'uFrame'),
};

// uniform vec3 uMouse
let mousePosX = -1.;
let mousePosY = -1.;
let isMouseUp = -1.;
const canvas = document.querySelector('canvas') as HTMLCanvasElement;
canvas.addEventListener('pointermove', (ev) => {
  const rect = canvas.getBoundingClientRect();
  mousePosX = Math.floor((ev.clientX - rect.left) / (rect.right - rect.left) * canvas.width);
  mousePosY = Math.floor(canvas.height - (ev.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height);
  setCursorStyle();
});
canvas.addEventListener('pointerup', (ev) => {
  const rect = canvas.getBoundingClientRect();
  mousePosX = Math.floor((ev.clientX - rect.left) / (rect.right - rect.left) * canvas.width);
  mousePosY = Math.floor(canvas.height - (ev.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height);

  isMouseUp = 1.; // > 0 means true

  // need a 300 delay to account for the animation time
  setTimeout(() => {
    setCursorStyle();
    // 2nd timeout is needed to check again for the gameover screen
    setTimeout(() => {
      setCursorStyle();
    }, 600);
  }, 300);
});

// uniform uint uFrame
let frame = 0;

// texture unit locations
const stateTexUnit = 0;
const fontTexUnit = 1;
const lutTexUnit = 2;

canvas.classList.remove('invisible');

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

  gl.uniform1ui(stateLocations.uFrame, frame++);
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
  gl.drawArrays(gl.TRIANGLES, 0, 3);
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

  gl.uniform1f(tictactoeLocations.uTime, performance.now() / 1000);
  gl.uniform2f(tictactoeLocations.uResolution, gl.canvas.width, gl.canvas.height);

  // render
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#use_non-blocking_async_data_readback
function clientWaitAsync(gl: WebGL2RenderingContext, sync: WebGLSync, flags: number, interval_ms: number) {
  return new Promise<void>((resolve, reject) => {
    function test() {
      const res = gl.clientWaitSync(sync, flags, 0);
      if (res === gl.WAIT_FAILED) {
        reject();
        return;
      }
      if (res === gl.TIMEOUT_EXPIRED) {
        setTimeout(test, interval_ms);
        return;
      }
      resolve();
    }
    test();
  });
}

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#use_non-blocking_async_data_readback
async function getBufferSubDataAsync(
  gl: WebGL2RenderingContext,
  target: number,
  buffer: WebGLBuffer,
  srcByteOffset: number,
  dstBuffer: ArrayBufferView,
) {
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)!;
  gl.flush();

  await clientWaitAsync(gl, sync, 0, 10);
  gl.deleteSync(sync);

  gl.bindBuffer(target, buffer);
  gl.getBufferSubData(target, srcByteOffset, dstBuffer, 0, length);
  gl.bindBuffer(target, null);
}

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#use_non-blocking_async_data_readback
async function readPixelsAsync(
  gl: WebGL2RenderingContext,
  x: number,
  y: number,
  w: number,
  h: number,
  format: number,
  type: number,
  dest: ArrayBufferView,
) {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
  gl.bufferData(gl.PIXEL_PACK_BUFFER, dest.byteLength, gl.STREAM_READ);
  gl.readPixels(x, y, w, h, format, type, 0);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

  await getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dest);

  gl.deleteBuffer(buf);
  return dest;
}

function setCursorStyle() {
  // reading the 1st variable in stateTexture which is
  // bool onHover (1 for true, 0 for false)
  const results = new Float32Array(1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, state.targets[ state.lastRenderIndex ]);
  readPixelsAsync(gl, 0, 0, 1, 1, gl.RED, gl.FLOAT, results)
    .then(() => {
      canvas.style.cursor = results[0] === 1 ? 'pointer' : 'default';
    });
}
