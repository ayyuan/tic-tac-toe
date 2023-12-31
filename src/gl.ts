const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('webgl2');
if (ctx === null) {
  const error = document.getElementById('error')!;
  canvas.classList.add('hidden');
  error.classList.remove('hidden');
  throw new Error('webgl2 not available');
}

const gl = ctx;
gl.getExtension('EXT_color_buffer_float');
gl.getExtension('OES_texture_float_linear');

// set canvas size
const dpr = window.devicePixelRatio;
gl.canvas.width = Math.floor( window.innerWidth * dpr );
gl.canvas.height = Math.floor( window.innerHeight * dpr );

// update canvas size on resize event
window.addEventListener('resize', () => {
  gl.canvas.width = Math.floor( window.innerWidth * dpr );
  gl.canvas.height = Math.floor( window.innerHeight * dpr );
});

export default gl;
