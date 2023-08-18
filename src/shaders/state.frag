#version 300 es

/*
    This pass is responsible for computing the game state.
*/

precision highp float;

uniform float uTimeDelta;
uniform vec2 uResolution;
uniform vec3 uMouse;
uniform sampler2D uState;
uniform sampler2D uLut;

in vec2 vPosition;

out float outColor;

#include "./common.glsl"

// darkens all cells except for 3 cells: a,b,c
void darkenAllExcept(ivec2 a, ivec2 b, ivec2 c) {
    for (int i=0; i<3; i++) {
        for (int j=0; j<3; j++) {
            if (board[i][j] == _) continue;
            ivec2 ij = ivec2(i,j);
            if (ij == a || ij == b || ij == c) continue;
            board[i][j] = board[i][j] == X ? X_DARKEN : O_DARKEN;
        }
    }
}

void updateScore() {
    if (isYourTurn) {
        // last move made is by AI so only possible status is LOSE
        score = LOSE;
        lostAmount += 1.0;
    } else {
        score = WIN;
        wonAmount += 1.0;
    }
}

// darkens non winning cells if game is complete
void checkBoard() {
    // just check all possible cases, nothing fancy (brute forcing)
    // case 1: top left to top right
    float sym = board[0][0];
    if (sym != _ && board[0][1] == sym && board[0][2] == sym) {
        darkenAllExcept( ivec2(0,0), ivec2(0,1), ivec2(0,2) );
        updateScore();
        return;
    }
    // case 2: top left to bot right
    if (sym != _ && board[1][1] == sym && board[2][2] == sym) {
        darkenAllExcept( ivec2(0,0), ivec2(1,1), ivec2(2,2) );
        updateScore();
        return;
    }
    // case 3: top left to bot left
    if (sym != _ && board[1][0] == sym && board[2][0] == sym) {
        darkenAllExcept( ivec2(0,0), ivec2(1,0), ivec2(2,0) );
        updateScore();
        return;
    }
    // case 4: mid left to mid right
    sym = board[1][0];
    if (sym != _ && board[1][1] == sym && board[1][2] == sym) {
        darkenAllExcept( ivec2(1,0), ivec2(1,1), ivec2(1,2) );
        updateScore();
        return;
    }
    // case 5: bot left to top right
    sym = board[2][0];
    if (sym != _ && board[1][1] == sym && board[0][2] == sym) {
        darkenAllExcept( ivec2(2,0), ivec2(1,1), ivec2(0,2) );
        updateScore();
        return;
    }
    // case 6: bot left to bot right
    if (sym != _ && board[2][1] == sym && board[2][2] == sym) {
        darkenAllExcept( ivec2(2,0), ivec2(2,1), ivec2(2,2) );
        updateScore();
        return;
    }
    // case 7: top mid to bot mid
    sym = board[0][1];
    if (sym != _ && board[1][1] == sym && board[2][1] == sym) {
        darkenAllExcept( ivec2(0,1), ivec2(1,1), ivec2(2,1) );
        updateScore();
        return;
    }
    // case 8: top right to bot right
    sym = board[0][2];
    if (sym != _ && board[1][2] == sym && board[2][2] == sym) {
        darkenAllExcept( ivec2(0,2), ivec2(1,2), ivec2(2,2) );
        updateScore();
        return;
    }
    
    // check for tie (if no empty cells)
    bvec3 isEmpty = equal( board[0], vec3(_) );
    if ( any(isEmpty) ) return;
    isEmpty = equal( board[1], vec3(_) );
    if ( any(isEmpty) ) return;
    isEmpty = equal( board[2], vec3(_) );
    if ( any(isEmpty) ) return;
    // darken all cells
    darkenAllExcept( ivec2(-1), ivec2(-1), ivec2(-1) );
    score = TIE;
}

void move(int row, int col) {
    board[row][col] = isX ? X : O;
    isX = !isX;
    isYourTurn = !isYourTurn;
    animate = ivec2(row, col);
}

void move(int pos) {
    int row = pos / 3;
    int col = pos - 3 * row;
    move(row, col);
}

int encoding() {
    int enc = 0;
    int power = 1;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            if (board[i][j] == X) {
                enc += 1 * power;
            } else if (board[i][j] == O) {
                enc += 2 * power;
            }
            power *= 3;
        }
    }
    return enc;
}

void main() {
    loadState();

    if (animate != NO_ANIMATE) {
        // animation in progress
        int row = animate.x;
        int col = animate.y;

        boardTime[row][col] += uTimeDelta;

        if (boardTime[row][col] > ANIMATE_DURATION) {
            // animation complete
            animate = NO_ANIMATE;
        }
    }
    else if (!isYourTurn && score == NA && animate == NO_ANIMATE) {
        // AI chooses move
        // encoding the board so we can query our minimax LUT texture
        int enc = encoding();
        int w = textureSize(uLut, 0).x;
        int bestMove = int( texelFetch(uLut, ivec2(enc % w, enc / w), 0).r );
        move(bestMove);

        checkBoard();
    }
    // uMouse.z > 0. means onMouseUp
    else if (score != NA && uMouse.z > 0. && animate == NO_ANIMATE) {
        // game is complete, so reset board
        youStartPrevGame = !youStartPrevGame;
        isYourTurn = youStartPrevGame;
        isX = true;
        score = NA;

        animate = NO_ANIMATE;
        boardTime = mat3(0.);

        board = mat3(
            _, _, _,
            _, _, _,
            _, _, _
        );
    }
    // uMouse.z > 0. means onMouseUp
    else if (isYourTurn && uMouse.z > 0. && animate == NO_ANIMATE) {
        // human has moved
        vec2 mouse = (uMouse.xy-0.5*uResolution.xy)/uResolution.y;

        // map grid lines from -0.3, -0.1, 0.1, 0.3 -> 0, 1, 2, 3
        vec2 id = (mouse + 0.3) * 5.;
        // compute id for every cell
        id = floor(id);
        // flip it so the origin is at top left of board instead of bot left
        id.y = 2. - id.y;
        // not sure if 1e-6 needed but always feels safer doing it to prevent float inprecision
        int row = int( id.y + 1e-6 );
        int col = int( id.x + 1e-6 );

        // id must be in domain [0,2]
        if (-0.1 < id.x && id.x < 2.1 && -0.1 < id.y && id.y < 2.1 && board[row][col] == _) {
            move(row, col);
        }

        checkBoard();
    }

    storeState(outColor);
}
