import quadProgram from './quadProgram';
import tictactoeFrag from './shaders/tictactoe.frag?raw';

const programTicTacToe = quadProgram(tictactoeFrag);
export default programTicTacToe;
