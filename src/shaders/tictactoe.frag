#version 300 es

/*
    This pass is responsible for rendering the game.

    Resources:

    Tic Tac Toe Game - BrandonE
    https://www.shadertoy.com/view/tdcGWs

    SDF Texture Font - otaviogood
    https://www.shadertoy.com/view/llcXRl

    iResolution, iMouse, iDate, etc - FabriceNeyret2
    https://www.shadertoy.com/view/llySRh
*/

precision highp float;

uniform vec2 uResolution;
uniform sampler2D uFont;
uniform sampler2D uState;

in vec2 vPosition;

out vec4 outColor;

#define SHOW_DEBUG_LINES 0

// letter positions in texture
const vec2 L_UP = vec2(12, 11);
const vec2 O_UP = vec2(15, 11);
const vec2 S_UP = vec2(3, 10);
const vec2 E_UP = vec2(5, 11);

const vec2 W_UP = vec2(7, 10);
const vec2 I_UP = vec2(9, 11);
const vec2 N_UP = vec2(14, 11);

const vec2 T_UP = vec2(4, 10);

const vec2 Y_UP = vec2(9, 10);
const vec2 U_UP = vec2(5, 10);
const vec2 R_UP = vec2(2, 10);

const vec2 A_UP = vec2(1, 11);

const vec2 P_UP = vec2(0, 10);
const vec2 G_UP = vec2(7, 11);
const vec2 Q_CH = vec2(15, 12); // '?' question mark

const vec2 W_LO = vec2(7, 8);
const vec2 O_LO = vec2(15, 9);
const vec2 N_LO = vec2(14, 9);
const vec2 C_CH = vec2(10, 12); // ':' colon

const vec2 L_LO = vec2(12, 9);
const vec2 S_LO = vec2(3, 8);
const vec2 T_LO = vec2(4, 8);

const vec2 I_LO = vec2(9, 9);
const vec2 E_LO = vec2(5, 9);

const vec2 ZERO = vec2(0, 12);

const vec3 LOSE_TEXT_COL = vec3(1, 0, 0);
const vec3 WIN_TEXT_COL = vec3(0, 1, 0);
const vec3 TIE_TEXT_COL = vec3(1, 0, 1);
const vec3 TURN_TEXT_COL = vec3(1);

const float TEXT_SIZE = 0.1;
const float TEXT_SPACE = 0.6;

const float LINE_THICKNESS = 0.003;
const float PIECE_SIZE = 0.08;

float X_BOUND = 0.;

#include "./common.glsl"

// https://iquilezles.org/articles/distfunctions2d/
float lineSDF(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float xSDF(vec2 p) {
    // rotate coordinate system by 45 deg
    p = mat2(cos(0.785), sin(0.785), -sin(0.785), cos(0.785)) * p;

    float vertical = lineSDF(p, vec2(0., PIECE_SIZE), vec2(0., -PIECE_SIZE));
    float horizontal = lineSDF(p, vec2(PIECE_SIZE, 0.), vec2(-PIECE_SIZE, 0.));

    return min(vertical, horizontal);
}

float oSDF(vec2 p) {
    const float radius = 0.55 * (PIECE_SIZE * sqrt(2.));
    return abs(length(p) - radius);
}

void char(vec2 p, vec2 ch, vec3 textCol, inout vec3 col) {
    if (abs(p.x) < 0.3 && abs(p.y) < 0.4) {
        p += ch;
        // get signed distance to letter from texture
        float sd = texture(uFont, (p + 0.5) * (1.0 / 16.0)).w - 0.49;
        #if 1
        float blur = 15. / uResolution.y;
        col += mix(textCol, col, smoothstep(-blur, blur, sd));
        #else
        // for debugging
        col += sd;
        #endif
    }
}

void statusText(vec2 uv, inout vec3 col) {
    vec2 p = uv / TEXT_SIZE;

    if (score == LOSE) {
        // draw "LOSE" text
        vec2 pos = vec2(-0.9, 4);
        char(p - pos, L_UP, LOSE_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, O_UP, LOSE_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, S_UP, LOSE_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, E_UP, LOSE_TEXT_COL, col);
    } else if (score == WIN) {
        // draw "WIN" text
        vec2 pos = vec2(-0.6, 4);
        char(p - pos, W_UP, WIN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, I_UP, WIN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, N_UP, WIN_TEXT_COL, col);
    } else if (score == TIE) {
        // draw "TIE" text
        vec2 pos = vec2(-0.6, 4);
        char(p - pos, T_UP, TIE_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, I_UP, TIE_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, E_UP, TIE_TEXT_COL, col);
    } else if (isYourTurn) {
        // draw "YOUR TURN" text
        vec2 pos = vec2(-2.4, -4);
        char(p - pos, Y_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, O_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, U_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, R_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        pos.x += TEXT_SPACE;
        char(p - pos, T_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, U_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, R_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, N_UP, TURN_TEXT_COL, col);
    }

    if (score != NA) {
        // draw "PLAY AGAIN?" text
        vec2 pos = vec2(-2.825, -4.);
        char(p - pos, P_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, L_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, A_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, Y_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        pos.x += 0.5 * TEXT_SPACE;
        char(p - pos, A_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, G_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, A_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, I_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, N_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
        char(p - pos, Q_CH, TURN_TEXT_COL, col);
    }
}

// https://www.shadertoy.com/view/llySRh
void printNumber(vec2 p, float n, inout vec3 col) {
    for (int i=0; i<2; i++) {
        n /= 9.999999; // 10., // for windows :-(
        vec2 digit = ZERO;
        digit.x += floor( fract(n)*10. );
        char(p, digit, TURN_TEXT_COL, col);
        p.x += TEXT_SPACE;
    }
}

void wonText(vec2 p, float center, float wonAmt, inout vec3 col) {
    // draw "won:" text
    vec2 pos = vec2(center,0.15/TEXT_SIZE - 0.5*TEXT_SPACE);
    vec2 wpos = pos - vec2(-TEXT_SPACE,0.8);
    pos.x -= TEXT_SPACE;

    char(p-pos, W_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, O_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, N_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, C_CH, TURN_TEXT_COL, col);
    
    // draw won amount
    printNumber(p-wpos, wonAmt, col);
}

void loseText(vec2 p, float center, float lostAmt, inout vec3 col) {
    // draw "lost:" text
    vec2 pos = vec2(center,-0.025/TEXT_SIZE - 0.5*TEXT_SPACE);
    vec2 lpos = pos - vec2(-TEXT_SPACE,0.8);
    pos.x -= TEXT_SPACE;

    char(p-pos, L_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, O_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, S_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, T_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, C_CH, TURN_TEXT_COL, col);
    
    // draw lost amount
    printNumber(p-lpos, lostAmt, col);
}

void tieText(vec2 p, float center, float tieAmt, inout vec3 col) {
    // draw "tie:" text
    vec2 pos = vec2(center,-0.2/TEXT_SIZE - 0.5*TEXT_SPACE);
    vec2 tpos = pos - vec2(-TEXT_SPACE,0.8);
    pos.x -= TEXT_SPACE;

    char(p-pos, T_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, I_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, E_LO, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, C_CH, TURN_TEXT_COL, col);
    
    // draw tie amount
    printNumber(p-tpos, tieAmt, col);
}

void aiText(vec2 uv, inout vec3 col) {
    vec2 p = uv / TEXT_SIZE;
    
    // draw "AI" text
    vec2 pos = vec2(0.,0.3/TEXT_SIZE - 0.5*TEXT_SPACE);
    // finding center point
    pos.x = 0.5 * (X_BOUND + 0.3) / TEXT_SIZE;
    pos.x -= 0.5 * TEXT_SPACE;
    
    char(p-pos, A_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, I_UP, TURN_TEXT_COL, col);
    
    float center = 0.5 * (X_BOUND + 0.3) / TEXT_SIZE;
    wonText(p, center, lostAmount, col);
    loseText(p, center, wonAmount, col);
    tieText(p, center, tieAmount, col);
}

void youText(vec2 uv, inout vec3 col) {
    vec2 p = uv / TEXT_SIZE;
    
    // draw "YOU" text
    vec2 pos = vec2(0.,0.3/TEXT_SIZE - 0.5*TEXT_SPACE);
    // finding center point
    pos.x = 0.5 * (-X_BOUND + (-0.3)) / TEXT_SIZE;
    pos.x -= TEXT_SPACE;

    char(p-pos, Y_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, O_UP, TURN_TEXT_COL, col); pos.x += TEXT_SPACE;
    char(p-pos, U_UP, TURN_TEXT_COL, col);
    
    float center = 0.5 * (-X_BOUND + (-0.3)) / TEXT_SIZE;
    wonText(p, center, wonAmount, col);
    loseText(p, center, lostAmount, col);
    tieText(p, center, tieAmount, col);
}

void main() {
    loadState();

    vec2 p = 0.5 * vPosition; // remap from [-1,1] to [-0.5,0.5]
    float aspect = uResolution.x / uResolution.y;
    p.x *= aspect; // apply aspect ratio
    X_BOUND = 0.5 * aspect;

    vec3 color = vec3(0.);

    float lineBlur = 2.5 / uResolution.y;  
    // drawing tic tac toe board
    const vec3 lineCol = vec3(1., 0.5, 0.);
    // left vertical line
    float l = lineSDF(p, vec2(-0.1, 0.3), vec2(-0.1, -0.3)) - LINE_THICKNESS;
    color += lineCol * smoothstep(lineBlur, 0., l);
    // right vertical line
    l = lineSDF(p, vec2(0.1, 0.3), vec2(0.1, -0.3)) - LINE_THICKNESS;
    color += lineCol * smoothstep(lineBlur, 0., l);
    // bottom horizontal line
    l = lineSDF(p, vec2(0.3, -0.1), vec2(-0.3, -0.1)) - LINE_THICKNESS;
    color += lineCol * smoothstep(lineBlur, 0., l);
    // top horizontal line
    l = lineSDF(p, vec2(0.3, 0.1), vec2(-0.3, 0.1)) - LINE_THICKNESS;
    color += lineCol * smoothstep(lineBlur, 0., l);

#if SHOW_DEBUG_LINES
    // left vertical line
    l = lineSDF(p, vec2(-0.3, 100), vec2(-0.3, -100));
    color += vec3(0, 1, 0) * smoothstep(0.001, 0., l);
    // right vertical line
    l = lineSDF(p, vec2(0.3, 100), vec2(0.3, -100));
    color += vec3(0, 1, 0) * smoothstep(0.001, 0., l);
    // top horizontal line
    l = lineSDF(p, vec2(-100, 0.3), vec2(100, 0.3));
    color += vec3(0, 1, 0) * smoothstep(0.001, 0., l);
#endif

    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            if (board[i][j] == X || board[i][j] == X_DARKEN) {
                // draw X
                float x = -0.2 + 0.2 * float(j);
                float y = +0.2 - 0.2 * float(i);
                float sd = xSDF(p - vec2(x, y)) - LINE_THICKNESS;
                float c = smoothstep(lineBlur, 0., sd);
                color += board[i][j] == X_DARKEN ? 0.5 * c : c;
            }
            else if (board[i][j] == O || board[i][j] == O_DARKEN) {
                // draw O
                float x = -0.2 + 0.2 * float(j);
                float y = +0.2 - 0.2 * float(i);
                float sd = oSDF(p - vec2(x, y)) - LINE_THICKNESS;
                float c = smoothstep(lineBlur, 0., sd);
                color += board[i][j] == O_DARKEN ? 0.5 * c : c;
            }
        }
    }

    // draw text
    statusText(p, color);
    aiText(p, color);
    youText(p, color);

    outColor = vec4(color, 1.0);
}
