#version 300 es

/*
    This pass is responsible for initializing the game state.
*/

precision highp float;

uniform sampler2D uState;

out float outColor;

#include "./common.glsl"

void main() {
    // initialize data
    reset(INIT);
    storeState(outColor);
}
