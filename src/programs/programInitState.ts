import quadProgram from './quadProgram';
import initStateFrag from '../shaders/initState.frag';

const programInitState = quadProgram(initStateFrag);
export default programInitState;
