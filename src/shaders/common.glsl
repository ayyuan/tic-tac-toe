/*
  Features a cool way to manage state that I saw on shadertoy.

  Resources:

  State Variables - fad
  https://www.shadertoy.com/view/Dsjfzy
*/

// score states
const float NA          = -99.;
const float WIN         = 1.;
const float TIE         = 0.;
const float LOSE        = -1.;

// states for reset()
const float INIT        = 0.;
const float NEW_ROUND   = 1.;
const float TOGGLE_MODE = 2.;

const int   INVALID_POS      = -1;
const int   TEXT_GLOW        = 9;
const int   NO_GLOW          = INVALID_POS;
const int   NO_ANIMATE       = INVALID_POS;
const float ANIMATE_DURATION = 0.250; // in seconds

const float TEXT_RATIO = 2.;
const vec2  TEXT_SCALE = 0.05 * vec2(1.,TEXT_RATIO);

// win positions assuming the board is positioned as:
//       +   +   
//     0 | 1 | 2 
//   +---+---+---+
//     3 | 4 | 5 
//   +---+---+---+
//     6 | 7 | 8 
//       +   +   
// NOTE: 0 prefix means octal (base 8)
// horizontal wins
const int WIN_0TO2 = 0007; // 0b 000 000 111;
const int WIN_3TO5 = 0070; // 0b 000 111 000;
const int WIN_6TO8 = 0700; // 0b 111 000 000;
// vertical wins
const int WIN_0TO6 = 0111; // 0b 001 001 001;
const int WIN_1TO7 = 0222; // 0b 010 010 010;
const int WIN_2TO8 = 0444; // 0b 100 100 100;
// diagonal wins
const int WIN_0TO8 = 0421; // 0b 100 010 001;
const int WIN_2TO6 = 0124; // 0b 001 010 100;
// tie
const int TIE_POS  = 0777; // 0b 111 111 111;

// boundary limits
const float X_BOUND_LIMIT = 1.00;
const float Y_BOUND_LIMIT = 0.75;

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
    INT(animatePosition)   \
    FLOAT(animateTime)     \
    INT(xPositions)        \
    INT(oPositions)        \
    INT(winPositions)

// Declare the global variables
#define BOOL(name) bool name;
#define INT(name) int name;
#define FLOAT(name) float name;
STATE
#undef BOOL
#undef INT
#undef FLOAT

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
    glowPosition = NO_GLOW;
    isX = true;
    score = NA;

    xPositions = oPositions = winPositions = 0;
    
    animatePosition = NO_ANIMATE;
    animateTime = 0.;
}

bool containsXAt(int pos) {
    return ((xPositions >> pos) & 1) == 1;
}

bool containsOAt(int pos) {
    return ((oPositions >> pos) & 1) == 1;
}

int rcToPos(int row, int col) {
    return 3 * row + col;
}

// Set the global variables to their appropriate values
void loadState() {
    int i = 0;
    int w = textureSize(uState, 0).x;
    #define GET(i) texelFetch(uState, ivec2(i % w, i / w), 0).r
    #define BOOL(name) name = bool(GET(i)); i += 1;
    #define INT(name) name = int(GET(i)); i += 1;
    #define FLOAT(name) name = GET(i); i += 1;
    STATE
    #undef BOOL
    #undef INT
    #undef FLOAT
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
    STATE
    #undef BOOL
    #undef INT
    #undef FLOAT
    #undef SET
}
