/*
  Features a cool way to manage state that I saw on shadertoy.

  Resources:

  State Variables - fad
  https://www.shadertoy.com/view/Dsjfzy
*/

// board states
const float _           = 0.; // empty (nothing in that cell)
const float X           = 1.;
const float O           = 2.;
const float X_DARKEN    = 3.;
const float O_DARKEN    = 4.;

// score states
const float NA          = -99.;
const float WIN         = 1.;
const float TIE         = 0.;
const float LOSE        = -1.;

// states for reset()
float INIT        = 0.;
float NEW_ROUND   = 1.;
float TOGGLE_MODE = 2.;

const ivec2 NO_ANIMATE = ivec2(-1);
float ANIMATE_DURATION = 0.250; // in seconds

const float TEXT_RATIO = 2.;
const vec2 TEXT_SCALE  = 0.05 * vec2(1.,TEXT_RATIO);

#define STATE              \
    BOOL(onHover)          \
    INT(glowPosition)      \
    BOOL(isYourTurn)       \
    BOOL(isX)              \
    BOOL(youStartPrevGame) \
    BOOL(isEasyMode)       \
    FLOAT(score)           \
    FLOAT(wonAmount)       \
    FLOAT(lostAmount)      \
    IVEC2(animate)         \
    MAT3(boardTime)        \
    MAT3(board)

// Declare the global variables
#define BOOL(name) bool name;
#define INT(name) int name;
#define FLOAT(name) float name;
#define IVEC2(name) ivec2 name;
#define MAT3(name) mat3 name;
STATE
#undef BOOL
#undef INT
#undef FLOAT
#undef IVEC2
#undef MAT3

void reset(float state) {
    if (state == NEW_ROUND) {
        youStartPrevGame = !youStartPrevGame;
        isYourTurn = youStartPrevGame;
    } else {
        isYourTurn = youStartPrevGame = true;
    }

    if (state == TOGGLE_MODE) {
        isEasyMode = !isEasyMode;
    } else if (state == INIT) {
        isEasyMode = true;
    }

    if (state == INIT || state == TOGGLE_MODE) {
        wonAmount = lostAmount = 0.;
    }

    onHover = false;
    glowPosition = -1;
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

// Set the global variables to their appropriate values
void loadState() {
    int i = 0;
    int w = textureSize(uState, 0).x;
    #define GET(i) texelFetch(uState, ivec2(i % w, i / w), 0).r
    #define BOOL(name) name = bool(GET(i)); i += 1;
    #define INT(name) name = int(GET(i)); i += 1;
    #define FLOAT(name) name = GET(i); i += 1;
    #define IVEC2(name) INT(name.x) INT(name.y)
    #define MAT3(name) \
        FLOAT(name[0][0]) FLOAT(name[0][1]) FLOAT(name[0][2]) \
        FLOAT(name[1][0]) FLOAT(name[1][1]) FLOAT(name[1][2]) \
        FLOAT(name[2][0]) FLOAT(name[2][1]) FLOAT(name[2][2])
    STATE
    #undef BOOL
    #undef INT
    #undef FLOAT
    #undef IVEC2
    #undef MAT3
    #undef GET
}

// Store the state variables in outColor
void storeState(inout float outColor) {
    int w = textureSize(uState, 0).x;
    int i = int(gl_FragCoord.x) + int(gl_FragCoord.y) * w;
    int j = 0;
    #define SET(j, v) if (i == j) outColor = float(v)
    #define BOOL(name) SET(j, name); j += 1;
    #define INT(name) SET(j, name); j += 1;
    #define FLOAT(name) SET(j, name); j += 1;
    #define IVEC2(name) INT(name.x) INT(name.y)
    #define MAT3(name) \
        FLOAT(name[0][0]) FLOAT(name[0][1]) FLOAT(name[0][2]) \
        FLOAT(name[1][0]) FLOAT(name[1][1]) FLOAT(name[1][2]) \
        FLOAT(name[2][0]) FLOAT(name[2][1]) FLOAT(name[2][2])
    STATE
    #undef BOOL
    #undef INT
    #undef FLOAT
    #undef IVEC2
    #undef MAT3
    #undef SET
}
