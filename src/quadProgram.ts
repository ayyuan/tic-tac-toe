import gl from './gl';
import quadVert from './shaders/quad.vert?raw';
import quadAttribBuffer from './quadAttribBuffer';

export default function quadProgram(fragSrc: string) {
  const vs = createShader(gl.VERTEX_SHADER, quadVert);
  const fs = createShader(gl.FRAGMENT_SHADER, fragSrc);

  const program = createProgram(vs, fs);

  const attribLocation = gl.getAttribLocation(program, 'aPosition');
  gl.bindBuffer( gl.ARRAY_BUFFER, quadAttribBuffer );
  gl.enableVertexAttribArray( attribLocation );
  gl.vertexAttribPointer(
    attribLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0,
  );
  return program;
}

// https://webgl2fundamentals.org/webgl/lessons/webgl-fundamentals.html
function createShader(type: number, source: string) {
  const shader = gl.createShader(type);
  if (shader === null) {
    throw new Error('failed to gl.createShader()');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
 
  const error = new Error( gl.getShaderInfoLog(shader) ?? undefined );
  gl.deleteShader(shader);
  throw error;
}

// https://webgl2fundamentals.org/webgl/lessons/webgl-fundamentals.html
function createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram();
  if (program === null) {
    throw new Error('failed to gl.createProgram()');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
 
  const error = new Error( gl.getProgramInfoLog(program) ?? undefined);
  gl.deleteProgram(program);
  throw error;
}
