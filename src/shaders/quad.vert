#version 300 es

in vec2 aPosition;

out vec2 vPosition;

void main() {
  vPosition = aPosition;
  gl_Position = vec4( aPosition, 0., 1. );
}
