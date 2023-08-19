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

    SDF texture filtering, take 2 - mattz
    https://www.shadertoy.com/view/4sVyWh
*/

precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uFont;
uniform sampler2D uState;

in vec2 vPosition;

out vec4 outColor;

#define SHOW_DEBUG_LINES 0

const float PI = acos(-1.);
const float TAU = 2.*PI;
const mat2 ROT45_MAT = mat2(cos(0.785), sin(0.785), -sin(0.785), cos(0.785));

// using solarized color theme
const vec3 BG_COL        = vec3(0.00, 0.17, 0.21);
const vec3 X_COL         = vec3(0.15, 0.55, 0.82) - BG_COL;
const vec3 O_COL         = vec3(0.80, 0.29, 0.09) - BG_COL;
const vec3 LINE_COL      = vec3(0.35, 0.43, 0.46) - BG_COL;
const vec3 TEXT_COL      = vec3(0.35, 0.43, 0.46);
const vec3 GLOW_TEXT_COL = vec3(0.03, 0.21, 0.26);
const vec3 LOSE_TEXT_COL = vec3(0.86, 0.20, 0.18);
const vec3 WIN_TEXT_COL  = vec3(0.52, 0.60, 0.00);
const vec3 TIE_TEXT_COL  = vec3(0.42, 0.44, 0.77);

const float LINE_THICKNESS = 0.003;
const float LINE_BLUR = 2.5;
const float PIECE_SIZE = 0.08;

float X_BOUND = 0., Y_BOUND = 0.;

#include "./common.glsl"

const float TEXT_BLUR = 15.;
const vec2 GO_TEXT_SCALE = 0.2 * vec2(1.,TEXT_RATIO);

// https://iquilezles.org/articles/distfunctions2d/
float lineSDF(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float xSDF(vec2 p, float t) {
    // rotate coordinate system by 45 deg
    p = ROT45_MAT * p;

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

float textSDF(vec2 p, float char, vec2 delta) {
    // texture is uint8 so need a bias to represent 0 isoline
    const float bias = 127. / 255.;
    return texture(uFont, delta + p / 16. + fract(vec2(char, 15. - floor(char / 16.)) / 16.)).w - bias;
}

float textSDF(vec2 p, float char) {
    return textSDF(p, char, vec2(0.));
}

// gaussian blur on distance channel, idea from: https://www.shadertoy.com/view/4sVyWh
// but taking advantage of hardware filtering to reduce 9 texture calls per pixel to 4
// https://lisyarus.github.io/blog/graphics/2022/04/21/compute-blur.html#separable-kernel-with-hardware-filtering
float gaussianTextSDF(vec2 p, float char) {
#if 1
    // weights and offsets/deltas were precomputed
    // below gives the functionally equivalent code
    // without precomputed weights and offsets
    const float ONE_THIRD = 1. / 3.;
    const float TWO_THIRD = 2. / 3.;

    float dist = 0.;
    vec2 delta;

    delta = vec2(-TWO_THIRD) / float( textureSize(uFont, 0) );
    dist += 0.5625 * textSDF(p, char, delta);

    delta = vec2(-ONE_THIRD, TWO_THIRD) / float( textureSize(uFont, 0) );
    dist += 0.5625 * textSDF(p, char, delta);

    delta = vec2(TWO_THIRD, -ONE_THIRD) / float( textureSize(uFont, 0) );
    dist += 0.5625 * textSDF(p, char, delta);

    delta = vec2(ONE_THIRD) / float( textureSize(uFont, 0) );
    dist += 0.5625 * textSDF(p, char, delta);

    return dist;
#else
    // functionally equivalent to above code but without the precomputation

    // binomial filter (1,2,1) normalized
    const float[3] w = float[](0.25, 0.5, 0.25);

    float dist = 0.;

    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 2; j++) {
            float w00 = w[i+0] * w[j]; float w01 = w[i+0] * w[j+1];
            float w10 = w[i+1] * w[j]; float w11 = w[i+1] * w[j+1];

            // interpolation horizontally
            float w0 = w00 + w01;
            float w1 = w10 + w11;
            float tx = w01 / w0; // should be same as: w11 / w1;

            // interpolation vertically
            float ww = w0 + w1;
            float ty = w1 / ww;

            if (i == 0) tx = -tx;
            if (j == 0) ty = -ty;

            vec2 delta = vec2(tx,ty) / float( textureSize(uFont, 0) );
            dist += ww * textSDF(p, char, delta);
        }
    }
    return dist;
#endif
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

float time(int pos) {
    if (pos == animatePosition) {
        float t = animateTime / ANIMATE_DURATION;
        return easeInOutCubic(t);
    }
    return 1.;
}

float drawGlowX(vec2 q) {
    // rotate coordinate system by 45 deg
    q = ROT45_MAT * q;

    float vertical = lineSDF(q, vec2(0., PIECE_SIZE), vec2(0., -PIECE_SIZE) ) - LINE_THICKNESS;
    float horizontal = lineSDF(q, vec2(-PIECE_SIZE, 0.), vec2(PIECE_SIZE, 0.) ) - LINE_THICKNESS;

    const float glow = 0.01;
    float v = ( 1. - step(0., vertical) )   + max( glow/(glow+abs(vertical)) - 0.1, 0. )  ;
    float h = ( 1. - step(0., horizontal) ) + max( glow/(glow+abs(horizontal)) - 0.1, 0. );
    return clamp(0.5*(v+h), 0., 1.);
}

float drawGlowO(vec2 q) {
    float sd = oSDF(q) - LINE_THICKNESS;
    const float glow = 0.01;
    float c = ( 1. - step(0., sd) ) + max( glow/(glow+abs(sd)) - 0.1, 0. );
    return clamp(c, 0., 1.);
}

vec3 gradient(vec2 p, vec3 col) {
    float t = mod( 3.*uTime, TAU );
    p *= 10.;

    vec3 dir = (winPositions == WIN_0TO2 || winPositions == WIN_3TO5 || winPositions == WIN_6TO8) ?
                vec3(p.y, -p.x, p.y) :
                p.xyx;
    return mix( col-0.1, col+0.1, 0.5 + 0.5*cos(t + dir + vec3(0.,2.,4.)) );
}

void drawBoard(vec2 p, inout vec3 color) {
    // drawing tic tac toe board
    float lineBlur = LINE_BLUR / uResolution.y;
    // left vertical line
    float l = lineSDF(p, vec2(-0.1, 0.3), vec2(-0.1, -0.3)) - LINE_THICKNESS;
    color += LINE_COL * smoothstep(lineBlur, 0., l);
    // right vertical line
    l = lineSDF(p, vec2(0.1, 0.3), vec2(0.1, -0.3)) - LINE_THICKNESS;
    color += LINE_COL * smoothstep(lineBlur, 0., l);
    // bottom horizontal line
    l = lineSDF(p, vec2(0.3, -0.1), vec2(-0.3, -0.1)) - LINE_THICKNESS;
    color += LINE_COL * smoothstep(lineBlur, 0., l);
    // top horizontal line
    l = lineSDF(p, vec2(0.3, 0.1), vec2(-0.3, 0.1)) - LINE_THICKNESS;
    color += LINE_COL * smoothstep(lineBlur, 0., l);

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
    int pos = rcToPos(row, col);

    // finite domain repetition
    vec2 q = p - 0.2 * clamp( round(p/0.2), -1., 1. );
    int grow = glowPosition / 3;
    int gcol = glowPosition - 3 * grow;
    if (row == grow && col == gcol) {
        // draw faint glowing X or O
        if (isX) {
            color += X_COL * 0.5 * drawGlowX(q);
        } else {
            color += O_COL * 0.5 * drawGlowO(q);
        }
    }
    else {
        if ( containsXAt(pos) ) {
            // draw X
            if (// is pos part of the winning positions?
                 ((winPositions >> pos) & 1) == 1 &&
                // is X part of the winning positions?
                  (xPositions & winPositions) == winPositions ) {
                // part of the winning triple so make it glow and animated
                color += gradient(p, X_COL+vec3(-0.15,0.1,-0.15)) * drawGlowX(q);
            } else {
                // draw normal X
                float sd = xSDF( q, time(pos) ) - LINE_THICKNESS;
                vec3 c = X_COL * smoothstep(lineBlur, 0., sd);
                color += score != NA ? 0.5*c : c;
            }
        }
        else if ( containsOAt(pos) ) {
            // draw O
            if (// is pos part of the winning positions?
                 ((winPositions >> pos) & 1) == 1 &&
                // is O part of the winning positions?
                  (oPositions & winPositions) == winPositions ) {
                // part of the winning triple so make it glow and animated
                color += gradient(p, O_COL) * drawGlowO(q);
            } else {
                // draw normal O
                float sd = oSDF(q) - LINE_THICKNESS;
                float t = time(pos);
                float an = (atan(q.x,-q.y) + PI) / (2.*PI); // remap [-pi,pi] -> [0,1]
                // animation mask
                float mask = step( an, t );
                vec3 c = O_COL * smoothstep(lineBlur, 0., sd) * mask;
                color += score != NA ? 0.5*c : c;
            }
        }
    }
}

void drawText(vec2 p, inout vec3 col) {
    // id for each cell
    vec2 t = vec2(0.);
    // contains encoding for text
    // encoded with https://github.com/knarkowicz/ShadertoyText
    uint v = 0u;
    if (p.x < 0. && p.y > 0.) {
        // draw "You"
        if (uResolution.x > uResolution.y) {
            float center = 0.5 * (-X_BOUND + (-0.3));
            p.x -= center - 1.5 * TEXT_SCALE.x;
            p.y -= 0.3 - TEXT_SCALE.y;
        } else {
            float center = 0.5 * (Y_BOUND + 0.3);
            p.x -= -0.2 - 1.5 * TEXT_SCALE.x;
            p.y -= center;
        }
        t = floor(p / TEXT_SCALE + 1e-6);
        v = t.y == 0. ? 7696217u : v;
        v = t.x >= 0. && t.x < 4. ? v : 0u;
        // draw won amount
        vec2 q = p - vec2(2.*TEXT_SCALE.x, -1.*TEXT_SCALE.y);
        q /= TEXT_SCALE;
        q.x = (q.x - .5) / TEXT_RATIO + .5;
        drawNumber(q, wonAmount, TEXT_COL, col);

        glowPosition = NO_GLOW;
    } else if (p.x > 0. && p.y > 0.) {
        // draw "AI"
        if (uResolution.x > uResolution.y) {
            float center = 0.5 * (X_BOUND + 0.3);
            p.x -= center - 1. * TEXT_SCALE.x;
            p.y -= 0.3 - TEXT_SCALE.y;
        } else {
            float center = 0.5 * (Y_BOUND + 0.3);
            p.x -= 0.2 - 1. * TEXT_SCALE.x;
            p.y -= center;
        }
        t = floor(p / TEXT_SCALE + 1e-6);
        v = t.y == 0. ? 18753u : v;
        v = t.x >= 0. && t.x < 4. ? v : 0u;
        // draw won amount for AI (our lost amount)
        vec2 q = p - vec2(1.*TEXT_SCALE.x, -1.*TEXT_SCALE.y);
        q /= TEXT_SCALE;
        q.x = (q.x - .5) / TEXT_RATIO + .5;
        drawNumber(q, lostAmount, TEXT_COL, col);

        glowPosition = NO_GLOW;
    } else {
        // draw "Easy Mode" / "Hard Mode"
        if (uResolution.x > uResolution.y) {
            p -= -4.5 * TEXT_SCALE;
        } else { 
            float center = 0.5 * (-Y_BOUND + (-0.3));
            p.x -= -4.5 * TEXT_SCALE.x;
            p.y -= center - 0.5 * TEXT_SCALE.y;
        }
        t = floor(p / TEXT_SCALE + 1e-6);
        if (isEasyMode) {
            v = t.y == 0. ? ( t.x < 4. ? 2037604677u : ( t.x < 8. ? 1685015840u : 101u ) ) : v;
            v = t.x >= 0. && t.x < 12. ? v : 0u;
        } else {
            v = t.y == 0. ? ( t.x < 4. ? 1685217608u : ( t.x < 8. ? 1685015840u : 101u ) ) : v;
            v = t.x >= 0. && t.x < 12. ? v : 0u;
        }
    }

    // extract character
    float char = float((v >> uint(8. * t.x)) & 255u);

    // compute [0;1] position in the current cell
    vec2 posInCell = (p - t * TEXT_SCALE) / TEXT_SCALE;
    // aspect correct
    posInCell.x = (posInCell.x - .5) / TEXT_RATIO + .5;

    if (char != 0.) {
        float sd = textSDF(posInCell, char);
        float blur = TEXT_BLUR / uResolution.y;
        col = mix(TEXT_COL, col, smoothstep(-blur, +blur, sd));

        if (glowPosition == TEXT_GLOW) {
            col += GLOW_TEXT_COL * max( 0.5 * (0.02/(0.02+abs(sd))) - 0.05, 0. );
        }
    }
}

void drawGameOver(vec2 p, inout vec3 color) {
    // draw game over overlay
    if (animatePosition != NO_ANIMATE || score == NA) return;

    vec3 textCol = vec3(1.);
    // id for each cell
    vec2 t = vec2(0.);
    // contains encoding for text
    // encoded with https://github.com/knarkowicz/ShadertoyText
    uint v = 0u;
    if (score == LOSE) {
        // draw "LOSE" text
        textCol = LOSE_TEXT_COL;
        // dim background
        color *= 0.4;

        p.x -= -2. * GO_TEXT_SCALE.x;
        p.y -= -0.5 * GO_TEXT_SCALE.y;
        t = floor(p / GO_TEXT_SCALE + 1e-6);
        v = t.y == 0. ? 1163087692u : v;
        v = t.x >= 0. && t.x < 4. ? v : 0u;
    } else if (score == WIN) {
        // draw "WIN" text
        textCol = WIN_TEXT_COL;
        // dim background
        color *= 0.4;

        p.x -= -1.5 * GO_TEXT_SCALE.x;
        p.y -= -0.5 * GO_TEXT_SCALE.y;
        t = floor(p / GO_TEXT_SCALE + 1e-6);
        v = t.y == 0. ? 5130583u : v;
        v = t.x >= 0. && t.x < 4. ? v : 0u;
    } else if (score == TIE) {
        // draw "TIE" text
        textCol = TIE_TEXT_COL;
        // dim background
        color *= 0.4;

        p.x -= -1.5 * GO_TEXT_SCALE.x;
        p.y -= -0.5 * GO_TEXT_SCALE.y;
        t = floor(p / GO_TEXT_SCALE + 1e-6);
        v = t.y == 0. ? 4540756u : v;
        v = t.x >= 0. && t.x < 4. ? v : 0u;
    }
    // extract character
    float char = float((v >> uint(8. * t.x)) & 255u);

    // compute [0;1] position in the current cell
    vec2 posInCell = (p - t * GO_TEXT_SCALE) / GO_TEXT_SCALE;
    // aspect correct
    posInCell.x = (posInCell.x - .5) / TEXT_RATIO + .5;

    if (char != 0.) {
        float sd = gaussianTextSDF(posInCell, char);
        float blur = 0.25 * TEXT_BLUR / uResolution.y;
        color = mix(textCol, color, smoothstep(-blur, +blur, sd));
    }
}

void main() {
    loadState();

    vec2 p = 0.5 * vPosition; // remap from [-1,1] to [-0.5,0.5]
    // apply aspect ratio
    if (uResolution.x > uResolution.y) {
        // if width > height y remains in range [-0.5,0.5] and x will be stretched
        float aspect = uResolution.x / uResolution.y;
        p.x *= aspect;
        X_BOUND = min( 0.5 * aspect, X_BOUND_LIMIT );
    } else {
        // else vise versa, x remains in range [-0.5,0.5] and y will be stretched
        float aspect = uResolution.y / uResolution.x;
        p.y *= aspect;
        Y_BOUND = min( 0.5 * aspect, Y_BOUND_LIMIT );
    }

    vec3 color = BG_COL;

    drawBoard(p, color);
    drawText(p, color);
    drawGameOver(p, color);

    outColor = vec4(color, 1.0);
}
