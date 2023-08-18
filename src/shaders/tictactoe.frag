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

    easings_cheat_sheet - skaplun
    https://www.shadertoy.com/view/7tf3Ws
*/

precision highp float;

uniform vec2 uResolution;
uniform sampler2D uFont;
uniform sampler2D uState;

in vec2 vPosition;

out vec4 outColor;

#define SHOW_DEBUG_LINES 0

const float PI = acos(-1.);

// letter positions in texture
const vec2 L_UP = vec2(12, 11);
const vec2 O_UP = vec2(15, 11);
const vec2 S_UP = vec2(3, 10);
const vec2 E_UP = vec2(5, 11);

const vec2 W_UP = vec2(7, 10);
const vec2 I_UP = vec2(9, 11);
const vec2 N_UP = vec2(14, 11);

const vec2 T_UP = vec2(4, 10);

const vec3 LOSE_TEXT_COL = vec3(1, 0, 0);
const vec3 WIN_TEXT_COL = vec3(0, 1, 0);
const vec3 TIE_TEXT_COL = vec3(1, 0, 1);

const float TEXT_SIZE = 0.1;
const float TEXT_SPACE = 0.6;
const float TEXT_BLUR = 15.;
const float TEXT_RATIO = 2.;
const vec2 TEXT_SCALE = 0.05 * vec2(1.,TEXT_RATIO);

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

float xSDF(vec2 p, float t) {
    // rotate coordinate system by 45 deg
    p = mat2(cos(0.785), sin(0.785), -sin(0.785), cos(0.785)) * p;

    // animated values
    vec2 vEnd = mix( vec2(0., PIECE_SIZE), vec2(0., -PIECE_SIZE), clamp( t, 0., 1. ) );
    vec2 hEnd = mix( vec2(-PIECE_SIZE, 0.), vec2(PIECE_SIZE, 0.), clamp( t, 0., 1. ) );

    float vertical = lineSDF(p, vec2(0., PIECE_SIZE), vEnd);
    float horizontal = lineSDF(p, vec2(-PIECE_SIZE, 0.), hEnd);

    return min(vertical, horizontal);
}

float oSDF(vec2 p) {
    const float radius = 0.55 * (PIECE_SIZE * sqrt(2.));
    return abs(length(p) - radius);
}

float textSDF(vec2 p, float char) {
	return texture(uFont, p / 16. + fract(vec2(char, 15. - floor(char / 16.)) / 16.)).w - 0.49;
}

void char(vec2 p, vec2 ch, vec3 textCol, inout vec3 col) {
    if (abs(p.x) < 0.5 && abs(p.y) < 0.5) {
        p += ch;
        // get signed distance to letter from texture
        float sd = texture(uFont, (p + 0.5) * (1.0 / 16.0)).w - 0.49;
        #if 1
        float blur = TEXT_BLUR / uResolution.y;
        col = mix(textCol, col, smoothstep(-blur, blur, sd));
        #else
        // for debugging
        col += sd;
        #endif
    }
}

void drawChar(vec2 p, float char, vec3 textCol, inout vec3 col) {
    if (abs(p.x-0.5) < 0.5 && abs(p.y-0.5) < 0.5) {
        float sd = textSDF(p, char);
        float blur = TEXT_BLUR / uResolution.y;
        col = mix(textCol, col, smoothstep(-blur, blur, sd));
    }
}

// https://www.shadertoy.com/view/llySRh
void drawNumber(vec2 p, float n, vec3 textCol, inout vec3 col) {
    for (int i=0; i<2; i++) {
        n /= 9.999999; // 10., // for windows :-(
        float digit = 48.; // 48 == ascii value for '0'
        digit += floor( fract(n)*10. );
        drawChar(p, digit, textCol, col);
        p.x += 0.5;
    }
}

// https://www.shadertoy.com/view/7tf3Ws
float easeInOutCubic(float x) {
    return x < .5 ? 4. * x * x * x : 1. - pow(-2. * x + 2., 3.) / 2.;
}

float time(int row, int col) {
    float t = boardTime[row][col] / ANIMATE_DURATION;
    return easeInOutCubic(t);
}

void drawText(vec2 p, inout vec3 col) {
    // id for each cell
    vec2 t = vec2(0.);

    // contains encoding for text
    // encoded with https://github.com/knarkowicz/ShadertoyText
    uint v = 0u;
    if (p.x < 0. && p.y > 0.) {
        // draw "You"
        float center = 0.5 * (-X_BOUND + (-0.3));
        p.x -= center - 1.5 * TEXT_SCALE.x;
        p.y -= 0.3 - TEXT_SCALE.y;
        t = floor(p / TEXT_SCALE + 1e-6);
        v = t.y == 0. ? 7696217u : v;
        v = t.x >= 0. && t.x < 4. ? v : 0u;
        // draw won amount
        vec2 q = p - vec2(2.*TEXT_SCALE.x, -1.*TEXT_SCALE.y);
        q /= TEXT_SCALE;
        q.x = (q.x - .5) / TEXT_RATIO + .5;
        drawNumber(q, wonAmount, vec3(1.), col);
    } else if (p.x > 0. && p.y > 0.) {
        // draw "AI"
        float center = 0.5 * (X_BOUND + 0.3);
        p.x -= center - 1. * TEXT_SCALE.x;
        p.y -= 0.3 - TEXT_SCALE.y;
        t = floor(p / TEXT_SCALE + 1e-6);
        v = t.y == 0. ? 18753u : v;
        v = t.x >= 0. && t.x < 4. ? v : 0u;
        // draw won amount for AI (our lost amount)
        vec2 q = p - vec2(1.*TEXT_SCALE.x, -1.*TEXT_SCALE.y);
        q /= TEXT_SCALE;
        q.x = (q.x - .5) / TEXT_RATIO + .5;
        drawNumber(q, lostAmount, vec3(1.), col);
    } else {
        // draw "Hard Mode"
        p -= -4.5 * TEXT_SCALE;
        t = floor(p / TEXT_SCALE + 1e-6);
        v = t.y == 0. ? ( t.x < 4. ? 1146241352u : ( t.x < 8. ? 1146047776u : 69u ) ) : v;
        v = t.x >= 0. && t.x < 12. ? v : 0u;
    }

    // extract character
	float char = float((v >> uint(8. * t.x)) & 255u);

    // compute [0;1] position in the current cell
	vec2 posInCell = (p - t * TEXT_SCALE) / TEXT_SCALE;
    // aspect correct
	posInCell.x = (posInCell.x - .5) / TEXT_RATIO + .5;

	float sdf = textSDF(posInCell, char);
	if (char != 0.) {
        float blur = TEXT_BLUR / uResolution.y;
		col = mix(vec3(1.), col, smoothstep(-blur, +blur, sdf));
	}
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

    // map grid lines from -0.3, -0.1, 0.1, 0.3 -> 0, 1, 2, 3
    vec2 id = (p + 0.3) * 5.;
    // compute id for every cell
    id = clamp( floor(id), 0., 2. );
    // flip it so the origin is at top left of board instead of bot left
    id.y = 2. - id.y;
    // not sure if 1e-6 needed but always feels safer doing it to prevent float inprecision
    int row = int( id.y + 1e-6 );
    int col = int( id.x + 1e-6 );

    // finite domain repetition
    vec2 q = p - 0.2 * clamp( round(p/0.2), -1., 1. );
    if (board[row][col] == X || board[row][col] == X_DARKEN) {
        // draw X
        float sd = xSDF( q, time(row, col) ) - LINE_THICKNESS;
        float c = smoothstep(lineBlur, 0., sd);
        color += board[row][col] == X_DARKEN ? 0.5 * c : c;
    }
    else if (board[row][col] == O || board[row][col] == O_DARKEN) {
        // draw O
        float sd = oSDF(q) - LINE_THICKNESS;
        float t = time(row, col);
        float an = (atan(q.x,-q.y) + PI) / (2.*PI); // remap [-pi,pi] -> [0,1]
        // animation mask
        float mask = step( an, t );
        float c = smoothstep(lineBlur, 0., sd) * mask;
        color += board[row][col] == O_DARKEN ? 0.5 * c : c;
    }

    drawText(p, color);
    
    // draw game over overlay
    if (animate == NO_ANIMATE) {
        if (score == LOSE) {
            color *= 0.4;
            p /= 0.25;
            // draw "LOSE" text
            vec2 pos = vec2(-0.9, 0);
            char(p - pos, L_UP, LOSE_TEXT_COL, color); pos.x += TEXT_SPACE;
            char(p - pos, O_UP, LOSE_TEXT_COL, color); pos.x += TEXT_SPACE;
            char(p - pos, S_UP, LOSE_TEXT_COL, color); pos.x += TEXT_SPACE;
            char(p - pos, E_UP, LOSE_TEXT_COL, color);
        } else if (score == WIN) {
            color *= 0.4;
            p /= 0.25;
            // draw "WIN" text
            vec2 pos = vec2(-0.6, 0);
            char(p - pos, W_UP, WIN_TEXT_COL, color); pos.x += TEXT_SPACE;
            char(p - pos, I_UP, WIN_TEXT_COL, color); pos.x += TEXT_SPACE;
            char(p - pos, N_UP, WIN_TEXT_COL, color);
        } else if (score == TIE) {
            color *= 0.4;
            p /= 0.25;
            // draw "TIE" text
            vec2 pos = vec2(-0.6, 0);
            char(p - pos, T_UP, TIE_TEXT_COL, color); pos.x += TEXT_SPACE;
            char(p - pos, I_UP, TIE_TEXT_COL, color); pos.x += TEXT_SPACE;
            char(p - pos, E_UP, TIE_TEXT_COL, color);
        }
    }

    outColor = vec4(color, 1.0);
}
