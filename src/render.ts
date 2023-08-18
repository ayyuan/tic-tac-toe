import gl from './gl';
import programTicTacToe from './programTicTacToe';

const uResolutionLocation = gl.getUniformLocation(programTicTacToe, 'uResolution');

export default function render() {
  gl.useProgram(programTicTacToe);

  // set uniforms
  gl.uniform2f(uResolutionLocation, gl.canvas.width, gl.canvas.height);

  // render
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
