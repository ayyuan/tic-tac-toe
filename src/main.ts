import './style.css';
import render from './render';

let lastTime = performance.now();
function update(now: number) {
  // NOTE: for 1st frame time will be off
  const delta = now - lastTime;
  lastTime = now;

  render(delta);

  requestAnimationFrame(update);
}

requestAnimationFrame(update)
