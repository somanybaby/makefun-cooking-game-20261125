// Bootstrap for Golden Ladle Kitchen: size the canvas, wire keyboard
// and mouse, and run the game loop. The canvas is a fixed 1280x800
// logical stage, scaled to the window with devicePixelRatio sharpness.

import { Game } from './game.js';

const LOGICAL_W = 1280;
const LOGICAL_H = 800;

const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);
const game = new Game(canvas, {
  shot: params.get('shot'),
  seed: params.get('seed') || '1',
});
window.__game = game; // handy for play-testing from the console

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = Math.min(
    window.innerWidth / LOGICAL_W,
    window.innerHeight / LOGICAL_H,
  );
  canvas.style.width = `${LOGICAL_W * scale}px`;
  canvas.style.height = `${LOGICAL_H * scale}px`;
  canvas.width = Math.round(LOGICAL_W * scale * dpr);
  canvas.height = Math.round(LOGICAL_H * scale * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform((canvas.width / LOGICAL_W), 0, 0, (canvas.height / LOGICAL_H), 0, 0);
}

window.addEventListener('resize', resize);
resize();

// -- keyboard ---------------------------------------------------------------
const KEYMAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
};

window.addEventListener('keydown', (e) => {
  game.sound.unlock();
  const dir = KEYMAP[e.code];
  if (dir) {
    game.keys[dir] = true;
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyE' || e.code === 'Space') {
    if (game.state === 'title') game.startGame();
    else if (game.state === 'dayEnd' || game.state === 'gameOver') game.startGame();
    else game.interact();
    e.preventDefault();
  } else if (e.code === 'Enter') {
    if (game.state === 'title') game.startGame();
    else if (game.state === 'dayEnd') game.startDay(game.day + 1);
    else if (game.state === 'gameOver') game.startGame();
  } else if (e.code === 'KeyR') {
    if (game.state === 'dayEnd') game.startDay(game.day + 1);
    else if (game.state === 'gameOver' || game.state === 'playing' || game.state === 'paused') game.startGame();
  } else if (e.code === 'KeyP') {
    if (game.state === 'playing') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'playing';
  } else if (e.code === 'KeyM') {
    game.sound.toggleMute();
  } else if (e.code === 'KeyQ') {
    game.clearPlate();
  }
});

window.addEventListener('keyup', (e) => {
  const dir = KEYMAP[e.code];
  if (dir) game.keys[dir] = false;
});

// -- mouse -------------------------------------------------------------------
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * LOGICAL_W,
    y: ((e.clientY - rect.top) / rect.height) * LOGICAL_H,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  game.sound.unlock();
  const p = canvasPoint(e);
  if (game.state === 'title') {
    game.startGame();
    return;
  }
  if (game.state === 'dayEnd') {
    game.startDay(game.day + 1);
    return;
  }
  if (game.state === 'gameOver') {
    game.startGame();
    return;
  }
  if (game.state !== 'playing') return;
  // Clicking a nearby station uses it; clicking the floor walks there.
  const station = game.chef.nearestStation(game.nearbyStations());
  if (station) {
    const inside =
      p.x >= station.x - 10 && p.x <= station.x + station.w + 10 &&
      p.y >= station.y - 10 && p.y <= station.y + station.h + 10;
    if (inside) {
      game.interact();
      return;
    }
  }
  game.chef.target = { x: p.x, y: p.y };
});

// -- loop --------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
