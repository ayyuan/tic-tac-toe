#version 300 es

/*
    This pass is responsible for initializing the game state.
*/

precision highp float;

uniform vec2 uDataResolution;
uniform sampler2D uState;

out float outColor;

#include "./common.glsl"

void main() {
    // initialize data
    isYourTurn = isX = true;
    youStartPrevGame = true;
    score = NA;
    
    wonAmount = lostAmount = tieAmount = 0.;
    
    board = mat3(
        _, _, _,
        _, _, _,
        _, _, _
    );

    storeState(outColor);
}
