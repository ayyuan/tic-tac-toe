# tic-tac-toe
<p align="center">
  <img src="./tictactoe.gif" alt="tictactoe" />
</p>

TicTacToe but almost entirely in shader code. Uses a 2 pass rendering system.
The 1st pass is responsible for keeping track of the game state which is done
by rendering to a texture in a feedback loop. The 2nd pass samples from the
state texture and actually draws the board, game pieces, and text. Text rendering
is done via shadertoy's font texture. For rendering larger text gaussian blur
had to be applied to smooth out the letters (checkout the code to see a cool
optimization to gaussian blur using hardware filtering). Features 2 difficulty
modes: easy and hard. Easy mode just moves pieces randomly. Hard mode samples
a texture, which is basically just a lookup table (LUT) generated with the
minimax algorithm (with alpha-beta pruning), to determine the optimal move.

## Development
```bash
npm install # install dependencies (only need to be run once)
npm run dev # start dev server
```

## Build
```bash
npm run build
npm run preview # locally preview what you just built
```
