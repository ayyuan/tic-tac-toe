#version 300 es

/*
    This pass is responsible for computing the game state.
*/

precision highp float;

uniform vec2 uResolution;
uniform vec3 uMouse;
uniform sampler2D uState;

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
    tieAmount += 1.0;
}

void main() {
    loadState();

    // onMouseUp
    if (uMouse.z > 0.) {
        if (score != NA) {
            // game is complete, so reset board
            youStartPrevGame = !youStartPrevGame;
            isYourTurn = youStartPrevGame;
            isX = true;
            score = NA;
            
            board = mat3(
                _, _, _,
                _, _, _,
                _, _, _
            );
        } /* TODO: else if (isYourTurn)*/ {
            vec2 mouse = (uMouse.xy-0.5*uResolution.xy)/uResolution.y;
            float x = mouse.x;
            float y = mouse.y;

            // which column is selected
            bvec3 upper = lessThan( vec3(x), vec3(-0.1,0.1,0.3) );
            bvec3 lower = greaterThan( vec3(x), vec3(-0.3,-0.1,0.1) );
            bvec3 col = equal(upper, lower);
            // which row is selected
            upper = lessThan( vec3(y), vec3(0.3,0.1,-0.1) );
            lower = greaterThan( vec3(y), vec3(0.1,-0.1,-0.3) );
            bvec3 row = equal(upper, lower);

            bool isPlaced = false;
            for (int i=0; i<3; i++) {
                for (int j=0; j<3; j++) {
                    // which cell is selected
                    if (row[i] && col[j] && board[i][j] == _) {
                        board[i][j] = isX ? X : O;
                        isX = !isX;
                        isYourTurn = !isYourTurn;
                        // trick to break out of nested loops
                        i = j = 4;
                        break;
                    }
                }
            }

            checkBoard();
        }
    }

    storeState(outColor);
}
