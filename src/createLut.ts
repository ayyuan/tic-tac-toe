const _ = 10;
const X = 20;
const O = 30;

type Cell = typeof _ | typeof X | typeof O;
type Board = [
  Cell, Cell, Cell,
  Cell, Cell, Cell,
  Cell, Cell, Cell,
];
type BestMove = {
  move: number,
  score: number
};

function move(board: Board, player: Cell, position: number): Board {
  return board.map((cell, ndx) => ndx === position ? player : cell) as Board;
}

function hasWon(board: Board, player: Cell) {
  const winningIndices = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  return winningIndices.some(
    indices => indices.every(ndx => board[ndx] === player)
  );
}

// returns 1 if won, -1 if lost, 0 otherwise
function evalScore(board: Board, player: Cell) {
  // player won
  if ( hasWon( board, player ) ) return 100;
  // player lost / opponent won
  if ( hasWon( board, flipPlayer(player) ) ) return -100;
  // tie or game hasnt ended
  return 0;
}

function nextPlayer(board: Board) {
  // assumes X always goes 1st
  const numXs = board.filter(cell => cell === X).length;
  const numOs = board.filter(cell => cell === O).length;
  return numOs < numXs ? O : X;
}

function flipPlayer(player: Cell) {
  return player === X ? O : X;
}

function randomChoice<T>(list: T[]): T {
  return list[ Math.floor( Math.random() * list.length ) ];
}

function minimax(
  board: Board,
  player: Cell,
  maxPlayer: Cell,
  alpha = -Infinity,
  beta = +Infinity,
  depth = 0
): BestMove {
  const availableMoves = board
    .map((cell, ndx) => cell === _ ? ndx : cell)
    .filter(cell => cell !== X && cell !== O);
  const score = evalScore(board, maxPlayer);

  if (availableMoves.length === 0 || score !== 0) {
    // game has ended
    return {
      move: -1,
      score,
    };
  }

  const possibleOutcomes = availableMoves.map( avai => {
    // alpha-beta pruning
    if (alpha > beta) {
      return {
        move: -1,
        score: 0,
      };
    }

    let score = minimax( move(board, player, avai), flipPlayer(player), maxPlayer, alpha, beta, depth + 1 ).score;
    // adjusting score based on depth
    // as a maximizer we want to:
    //  - choose path that wins fastest or
    //  - choose path that loses slowest
    if (score !== 0) score -= depth * Math.sign(score);
    
    // updating alpha and beta
    if (player === maxPlayer) alpha = Math.max(score, alpha);
    else beta = Math.min(score, beta);

    return {
      move: avai,
      score,
    };
  }).filter(res => res.move !== -1);

  const bestMoves = possibleOutcomes.reduce((acc: BestMove[], curr: BestMove) => {
    if (player === maxPlayer) {
      // we want to maximize the score (win)
      if (curr.score > acc[0].score)
        return [curr];
      else if (curr.score === acc[0].score)
        return [...acc, curr];
      else
        return acc;
    } else {
      // we want to minimize the score (lose)
      if (curr.score < acc[0].score)
        return [curr];
      else if (curr.score === acc[0].score)
        return [...acc, curr];
      else
        return acc;
    }
  }, [{
    move: -1,
    score: player === maxPlayer ? -Infinity : +Infinity,
  }]);

  return randomChoice(bestMoves);
}

// generates all possible board configurations
function* generateBoards(): IterableIterator<Board> {
  function* generateBoard(curr: Cell[], index: number): IterableIterator<Board> {
    if (index === 9) {
      const numXs = curr.filter(cell => cell === X).length;
      const numOs = curr.filter(cell => cell === O).length;
      const isValidBoard = (numXs === numOs || numOs + 1 === numXs);
        // below condition implicitly implied above
        /* && (numOs <= 4 && numXs <= 5); */
      if (!isValidBoard) return;

      yield curr as Board;
      return;
    }

    const symbols: Cell[] = [_, X, O];
    for (const sym of symbols) {
      yield* generateBoard([...curr, sym], index + 1);
    }
  }

  yield* generateBoard([], 0);
}

function encoding(board: Board) {
  const map = {
    [_]: 0,
    [X]: 1,
    [O]: 2,
  };
  let enc = 0;
  for (let i = 0; i < 9; i++) {
    enc += map[ board[i] ] * Math.pow(3, i);
  }
  return enc;
}

function rotateBoard90CW(board: Board): Board {
  return [
    board[6], board[3], board[0],
    board[7], board[4], board[1],
    board[8], board[5], board[2],
  ];
}

function rotatePos90CCW(pos: number) {
  const map = {
    0: 6, 1: 3, 2: 0,
    3: 7, 4: 4, 5: 1,
    6: 8, 7: 5, 8: 2,
  };
  return map[pos as keyof typeof map];
}

// to save computation we take advantage that many
// board configurations are just rotations of each other
function rotationExists(board: Board, lut: Float32Array) {
  let rotBoard = board;
  for (let rotCnt = 1; rotCnt < 4; rotCnt++) {
    rotBoard = rotateBoard90CW(rotBoard);
    let move = lut[ encoding(rotBoard) ];
    if (move !== -1) {
      // undoing rotations by rotating in other way
      for (let i = 0; i < rotCnt; i++) move = rotatePos90CCW(move);
      lut[ encoding(board) ] = move;
      return true;
    }
  }
  return false;
}

export default function createLut(width: number, height: number) {
  if (width * height < Math.pow(3, 9))
    throw new Error('dimensions too small');
  
  const lut = new Float32Array( width * height );
  lut.fill(-1);

  const gen = generateBoards();
  // ideal move for an empty board should be in 1 of the 4 corners
  // but our current algo. doesn't have enough heuristics to determine
  // this since an ideal game would always end in a tie so our algo.
  // scores all the starting moves equally
  const emptyBoard = gen.next().value;
  lut[ encoding(emptyBoard) ] = randomChoice([0, 2, 6, 8]);

  for (const board of gen) {
    if (rotationExists(board, lut)) continue;
    const player = nextPlayer(board);    
    lut[ encoding(board) ] = minimax( board, player, player ).move;
  }
  return lut;
}

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  const board: Board = [
    _, _, X,
    O, X, _,
    X, O, _,
  ];

  it('move', () => {
    const b: Board = [
      _, _, _,
      O, X, _,
      X, O, _,
    ];
    expect( move(b, X, 2) ).toStrictEqual(board);
  });

  it('hasWon', () => {
    expect( hasWon(board, O) ).toBe(false);
    expect( hasWon(board, X) ).toBe(true);
  });

  it('evalScore', () => {
    expect( evalScore(board, X) ).toBe(100);
    expect( evalScore(board, O) ).toBe(-100);
  });

  it('nextPlayer', () => {
    expect( nextPlayer(board) ).toBe(O);
  });

  it('flipPlayer', () => {
    expect( flipPlayer(X) ).toBe(O);
    expect( flipPlayer(O) ).toBe(X);
  });

  it('encoding', () => {
    const expected = 0*1 + 0*3 + 1*9 + 2*27 + 1*81 + 0*243 +1*729 + 2*2187 + 0*6561;
    expect( encoding(board) ).toBe( expected );
  });

  it('rotateBoard90CW', () => {
    const expected: Board = [
      X, O, _,
      O, X, _,
      _, _, X,
    ];
    expect( rotateBoard90CW(board) ).toStrictEqual(expected);
  });

  it('rotatePos90CCW', () => {
    expect( rotatePos90CCW(8) ).toBe(2);
  });

  it('rotationExists', () => {
    const b1: Board = [
      _, X, _,
      _, _, X,
      O, O, X,
    ];
    // b2 is b1 rotated 90 CW
    const b2: Board = [
      O, _, _,
      O, _, X,
      X, X, _,
    ];

    const b1Enc = encoding(b1);
    const b2Enc = encoding(b2);

    const lut = new Float32Array( Math.max(b1Enc, b2Enc) + 1 );
    lut.fill(-1);
    // b2 exists in LUT but b1 doesn't
    lut[b2Enc] = 8;

    // b1 not in LUT yet
    expect( lut[b1Enc] ).toBe(-1);
    expect( rotationExists(b1, lut) ).toBe(true);
    // now b1 should be in LUT with appropriate move
    expect( lut[b1Enc] ).toBe(2);
  });

  it('generateBoards', () => {
    const boards = [ ...generateBoards() ];
    expect( boards ).toContainEqual(board);
    expect( boards.length ).toBe(6046);
  });

  // indirectly testing minimax() through createLut()
  describe('createLut and minimax', () => {
    const lut = createLut( 1, Math.pow(3, 9) );

    it('best counter to 1st move to corner', () => {
      // optimal move for O should be in middle
      const b: Board = [
        X, _, _,
        _, _, _,
        _, _, _,
      ];
      expect( lut[ encoding(b) ] ).toBe(4);
    });

    it('optimal starting move', () => {
      // optimal move should be in one of the corners
      const b: Board = [
        _, _, _,
        _, _, _,
        _, _, _,
      ];
      expect( [0, 2, 6, 8] ).toContain( lut[ encoding(b) ] );
    });


    it('win', () => {
      // optimal move for O should be 2 to win
      const b: Board = [
        X, _, _,
        X, O, X,
        O, X, O,
      ];
      expect( lut[ encoding(b) ] ).toBe(2);
    });

    it('forcing a win', () => {
      // optimal move for X should be 6 to force a win
      const b: Board = [
        O, O, X,
        X, _, O,
        _, _, X,
      ];
      expect( lut[ encoding(b) ] ).toBe(6);
    });

    it('doomed to lose', () => {
      // no optimal moves here, both available moves are equally bad (doomed to lose)
      const b: Board = [
        O, O, X,
        X, _, O,
        X, _, X,
      ];
      expect( [4, 7] ).toContain( lut[ encoding(b) ] );
    });

    it('blocking opponent', () => {
      // optimal move for O should be 2 to block X
      const b: Board = [
        _, X, _,
        _, _, X,
        O, O, X,
      ];
      expect( lut[ encoding(b) ] ).toBe(2);
    });

    it('rotated board', () => {
      // same board as in 'minimax5' test but rotated
      const rot: Board = [
        O, _, _,
        O, _, X,
        X, X, _,
      ];
      expect( lut[ encoding(rot) ] ).toBe(8);
    });
  });
}
