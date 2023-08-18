const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2')!;

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
