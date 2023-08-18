import './style.css';
import render from './render';

function update() {
  requestAnimationFrame(update);
  render();
}

update();
