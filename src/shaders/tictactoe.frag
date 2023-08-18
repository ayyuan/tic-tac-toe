#version 300 es

precision highp float;

uniform vec2 uResolution;

in vec2 vPosition;

out vec4 fragColor;

vec4 plas( vec2 v, float time ) {
	float c = 0.5 + sin( v.x * 10.0 ) + cos( sin( time + v.y ) * 20.0 );
	return vec4( sin(c * 0.2 + cos(time)), c * 0.15, cos( c * 0.1 + time / .4 ) * .25, 1.0 );
}

void main() {
  vec2 p = vPosition;
  p.x *= uResolution.x / uResolution.y;

	vec2 m;
	m.x = atan(p.x / p.y) / 3.14;
	m.y = 1. / length(p) * .2;
	float d = m.y;

  vec4 t = plas( m * 3.14, 0. ) / d;
	fragColor = clamp( t, 0.0, 1.0 );
}
