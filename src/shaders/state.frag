#version 300 es

/*
    This pass is responsible for computing the game state.
*/

precision highp float;

uniform float uTimeDelta;
uniform uint uFrame;
uniform vec2 uResolution;
uniform vec3 uMouse;
uniform sampler2D uState;
uniform lowp isampler2D uLut;

in vec2 vPosition;

out float outColor;

#include "./common.glsl"

// https://nullprogram.com/blog/2018/07/31/
uint triple32(uint x) {
    x ^= x >> 17u;
    x *= 0xED5AD4BBu;
    x ^= x >> 11u;
    x *= 0xAC4C1B51u;
    x ^= x >> 15u;
    x *= 0x31848BABu;
    x ^= x >> 14u;
    return x;
}

// return range: [0,1)
float rand(uint seed) {
    return 2.32830629776081821092e-10 * float( triple32(seed) );
}

int hasWonAt(int pos, int win) {
    if ( (pos & win) == win ) {
        // |= is crucial so that we are able to highlight multiple wins
        winPositions |= win;
        return 1;
    }
    return 0;
}

bool hasWon(int pos, int mov) {
    // NOTE: we are using bitwise | to prevent short circuit boolean evaluation
    // so we can account for cases like this where there are multiple wins:
    // X X X
    // O X O
    // O X O
    // so that we can highlight all of the wins instead of just 1

    if (mov == 0) {
        return (hasWonAt(pos, WIN_0TO2) |
                hasWonAt(pos, WIN_0TO6) |
                hasWonAt(pos, WIN_0TO8)) != 0;
    }
    if (mov == 1) {
        return (hasWonAt(pos, WIN_0TO2) |
                hasWonAt(pos, WIN_1TO7)) != 0;
    }
    if (mov == 2) {
        return (hasWonAt(pos, WIN_0TO2) |
                hasWonAt(pos, WIN_2TO8) |
                hasWonAt(pos, WIN_2TO6)) != 0;
    }
    if (mov == 3) {
        return (hasWonAt(pos, WIN_0TO6) |
                hasWonAt(pos, WIN_3TO5)) != 0;
    }
    if (mov == 4) {
        return (hasWonAt(pos, WIN_3TO5) |
                hasWonAt(pos, WIN_1TO7) |
                hasWonAt(pos, WIN_0TO8) |
                hasWonAt(pos, WIN_2TO6)) != 0;
    }
    if (mov == 5) {
        return (hasWonAt(pos, WIN_2TO8) |
                hasWonAt(pos, WIN_3TO5)) != 0;
    }
    if (mov == 6) {
        return (hasWonAt(pos, WIN_0TO6) |
                hasWonAt(pos, WIN_6TO8) |
                hasWonAt(pos, WIN_2TO6)) != 0;
    }
    if (mov == 7) {
        return (hasWonAt(pos, WIN_1TO7) |
                hasWonAt(pos, WIN_6TO8)) != 0;
    }
    // if (mov == 8)
    return (hasWonAt(pos, WIN_2TO8) |
            hasWonAt(pos, WIN_6TO8) |
            hasWonAt(pos, WIN_0TO8)) != 0;
}

float evalScore(int mov) {
    // just check all possible cases, nothing fancy (brute forcing)
    if ( hasWon(xPositions, mov) || hasWon(oPositions, mov) ) {
        if (state == AI_TURN) {
            // last move made is by AI so only possible status is LOSE
            lostAmount += 1.0;
            return TWEEN_AI_TO_LOSE;
        } else {
            wonAmount += 1.0;
            return TWEEN_YOU_TO_WIN;
        }
    }
    // check for tie
    else if ( (xPositions | oPositions) == TIE_POS ) {
        return state == AI_TURN ? TWEEN_AI_TO_TIE : TWEEN_YOU_TO_TIE;
    }
    return state == YOUR_TURN ? TWEEN_YOU_TO_AI : TWEEN_AI_TO_YOU;
}

void move(int pos) {
    int shiftPos = 1 << pos;
    isX ? (xPositions |= shiftPos) : (oPositions |= shiftPos);

    isX = !isX;
    animatePosition = pos;
}

int encoding() {
    int enc = 0;
    int power = 1;
    for (int i = 0; i < 9; i++) {
        if ( containsXAt(i) ) {
            enc += 1 * power;
        } else if ( containsOAt(i) ) {
            enc += 2 * power;
        }
        power *= 3;
    }
    return enc;
}

bool isFreeAt(int pos) {
    int xoPositions = xPositions | oPositions;
    return ((xoPositions >> pos) & 1) == 0;
}

int randMove(uint seed) {
    int[9] freePositions;
    int cnt = 0;
    // finding all free positions in board
    for (int i = 0; i < 9; i++) {
        if ( isFreeAt(i) ) {
            freePositions[ cnt++ ] = i;
        }
    }

    int mov = INVALID_POS;
    float r = rand(seed) * float(cnt); // range [0,cnt)
    for (int i = 0; i < cnt; i++) {
        if (r < float(i) + 1. + 1e-6) {
            // moving to a random position
            mov = freePositions[i];
            move( mov );
            break;
        }
    }
    return mov;
}

float tween() {
    // animation in progress
    animateTime += uTimeDelta;

    if (animateTime > ANIMATE_DURATION) {
        // animation complete
        animatePosition = NO_ANIMATE;
        animateTime = 0.;

        if (state == TWEEN_YOU_TO_WIN) {
            return WIN;
        }
        if (state == TWEEN_AI_TO_LOSE) {
            return LOSE;
        }
        if (state == TWEEN_YOU_TO_TIE || state == TWEEN_AI_TO_TIE) {
            return TIE;
        }
        return state == TWEEN_AI_TO_YOU ? YOUR_TURN : AI_TURN;
    }
    return state;
}

bool isMouseOnMode(vec2 mouse) {
    // setting up "Hard/Easy Mode" text coordinates
    vec2 p = vec2(0.);
    if (uResolution.x > uResolution.y) {
        p = -4.5 * TEXT_SCALE;
    } else {
        float bound  = min( 0.5 * (uResolution.y / uResolution.x), Y_BOUND_LIMIT );
        float center = 0.5 * (-bound + (-0.3));
        p.x = -4.5 * TEXT_SCALE.x;
        p.y = center - 0.5 * TEXT_SCALE.y;
    }
    // id for each letter in "Hard/Easy Mode" text
    vec2 t = floor( (mouse - p) / TEXT_SCALE + 1e-6 );
    // hitbox for hard/easy mode text: t.x range [0,8] t.y == 0
    return -0.1 < t.x && t.x < 8.1 && -0.1 < t.y && t.y < 0.1;
}

int evalMousePosition(vec2 mouse) {
    // -- computing which cell our mouse is currently on
    // map grid lines from -0.3, -0.1, 0.1, 0.3 -> 0, 1, 2, 3
    vec2 id = (mouse + 0.3) * 5.;
    // compute id for every cell
    id = floor(id);
    // flip it so the origin is at top left of board instead of bot left
    id.y = 2. - id.y;
    // id must be in domain [0,2]
    if ( -0.1 < id.x && id.x < 2.1 && -0.1 < id.y && id.y < 2.1 ) {
        // not sure if 1e-6 needed but always feels safer doing it to prevent float inprecision
        int row = int( id.y + 1e-6 );
        int col = int( id.x + 1e-6 );
        return 3 * row + col;
    }
    return INVALID_POS;
}

void updateState(vec2 m) {
    if (uMouse.z > 0. && isMouseOnMode(m)) {
        // clicked on "Easy/Hard Mode" text
        // toggle between hard/easy mode and resets board
        reset(TOGGLE_MODE);
        return;
    }

    if (state == YOUR_TURN) {
        // no mouse click
        if (uMouse.z <= 0.) return;

        int pos = evalMousePosition(m);
        if (pos != INVALID_POS && isFreeAt(pos)) {
            move(pos);
            state = evalScore(pos);
        }
    } else if (state == TWEEN_YOU_TO_AI  ||
               state == TWEEN_AI_TO_YOU  ||
               state == TWEEN_YOU_TO_WIN ||
               state == TWEEN_AI_TO_LOSE ||
               state == TWEEN_YOU_TO_TIE ||
               state == TWEEN_AI_TO_TIE) {
        state = tween();
    } else if (state == AI_TURN) {
        // AI chooses move

        int mov = INVALID_POS;
        if (isEasyMode) {
            // do random move
            uint seed = (uFrame * 26699u) | 1u;
            mov = randMove(seed);
        } else {
            // pick move from LUT generated by minimax algo.

            // encoding the board so we can query our minimax LUT texture
            int enc = encoding();
            int w = textureSize(uLut, 0).x;
            mov = texelFetch(uLut, ivec2(enc % w, enc / w), 0).r;
            move(mov);
        }

        state = evalScore(mov);
    } else if (state == WIN || state == LOSE || state == TIE) {
        //stay here until we click, then goes to YOUR_TURN or AI_TURN

        // no mouse click
        if (uMouse.z <= 0.) return;
        // game is complete, so reset board
        reset(NEW_ROUND);
    }
}

void updateMouse(vec2 m) {
    // -- setting onHover and glowPosition

    // hovering over game over screen
    if ( onHover = isGameOver() ) return;

    // hovering over "Easy/Hard Mode" text
    if ( onHover = isMouseOnMode(m) ) {
        glowPosition = TEXT_GLOW;
        return;
    } else {
        glowPosition = NO_GLOW;
    }

    // hovering over free cell
    int pos = evalMousePosition(m);
    onHover = pos != INVALID_POS && state == YOUR_TURN && isFreeAt(pos);
    if ( onHover ) {
        glowPosition = pos;
        return;
    } else {
        if (glowPosition != TEXT_GLOW) glowPosition = NO_GLOW;
    }
}

void main() {
    loadState();

    // mouse position normalized [-0.5,0.5]
    vec2 mouse = uMouse.xy / uResolution.xy - 0.5;
    // aspect correction
    uResolution.x > uResolution.y ?
        (mouse.x *= uResolution.x / uResolution.y) :
        (mouse.y *= uResolution.y / uResolution.x);

    updateState(mouse);
    updateMouse(mouse);

    storeState(outColor);
}
