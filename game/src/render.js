// All drawing for Golden Ladle Kitchen. One job: turn the game state
// into a readable kitchen on a 1280x800 canvas — counters, food, chef,
// tickets, timer — everything hand-drawn with canvas vector shapes.

import { INGREDIENTS } from './recipes.js';
import { STATIONS, FLOOR } from './kitchen.js';
import { clamp } from './random.js';

const W = 1280;
const H = 800;

// Small canvas helpers ----------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function text(ctx, str, x, y, size, color, weight = 700, align = 'center') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function heart(ctx, x, y, s, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -5, -10, 0, -5);
  ctx.bezierCurveTo(5, -10, 9, -3, 0, 5);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#e4573d';
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

// One ingredient, drawn as a little vector snack. --------------------------
export function drawIngredient(ctx, id, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  const u = s / 32; // unit so the drawing scales with s
  switch (id) {
    case 'bun': {
      ctx.fillStyle = '#e9a94f';
      ctx.beginPath();
      ctx.arc(0, 2 * u, 13 * u, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c98a35';
      ctx.fillRect(-13 * u, 2 * u, 26 * u, 4 * u);
      ctx.fillStyle = '#fff3d0';
      for (const [sx, sy] of [[-6, -6], [0, -9], [6, -6], [-2, -3], [3, -3]]) {
        ellipse(ctx, sx * u, sy * u, 1.3 * u, 1.3 * u);
        ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = '#8a5a33';
      roundRect(ctx, -14 * u, -6 * u, 28 * u, 12 * u, 5 * u);
      ctx.fill();
      ctx.fillStyle = '#5f3a1d';
      for (const [sx, sy] of [[-8, -2], [0, 2], [8, -2], [4, -4], [-3, 3]]) {
        ellipse(ctx, sx * u, sy * u, 1.4 * u, 1.1 * u);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(-12 * u, -5 * u, 24 * u, 2 * u);
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#7cc24a';
      ctx.beginPath();
      ctx.moveTo(-14 * u, 4 * u);
      for (let i = 0; i <= 4; i++) {
        const px = -14 * u + i * 7 * u;
        ctx.quadraticCurveTo(px + 3.5 * u, -8 * u, px + 7 * u, 4 * u);
      }
      ctx.lineTo(14 * u, 8 * u);
      ctx.lineTo(-14 * u, 8 * u);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4d8a2a';
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.moveTo(0, 6 * u);
      ctx.lineTo(0, -2 * u);
      ctx.stroke();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#e4573d';
      ctx.beginPath();
      ctx.arc(0, 0, 12 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f28a70';
      ctx.beginPath();
      ctx.arc(0, 0, 8 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e4573d';
      ctx.beginPath();
      ctx.arc(-3 * u, 0, 3 * u, 0, Math.PI * 2);
      ctx.arc(3 * u, 0, 3 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7cc24a';
      ellipse(ctx, 0, -11 * u, 4 * u, 2 * u);
      ctx.fill();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.moveTo(-13 * u, 8 * u);
      ctx.lineTo(13 * u, 8 * u);
      ctx.lineTo(0, -9 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d9a41f';
      for (const [sx, sy] of [[-5, 3], [4, 4], [0, -2]]) {
        ellipse(ctx, sx * u, sy * u, 1.6 * u, 1.6 * u);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// A plate with a stack of ingredients on it, drawn in profile. -----------
export function drawPlateStack(ctx, items, x, y, w) {
  const plateW = w;
  // Plate.
  ctx.fillStyle = '#f4f1e8';
  ellipse(ctx, x, y, plateW / 2, 9);
  ctx.fill();
  ctx.fillStyle = '#d8d2c0';
  ellipse(ctx, x, y - 1, plateW / 2 - 6, 6);
  ctx.fill();
  // Stack, bottom first, each layer slightly narrower and higher.
  let ly = y - 4;
  const layerH = 9;
  items.forEach((id, i) => {
    const lw = plateW - 10 - i * 6;
    ly -= layerH;
    ctx.save();
    ctx.translate(x, ly);
    ctx.scale(lw / 64, 1);
    drawIngredient(ctx, id, 0, 0, 30);
    ctx.restore();
  });
}

// The whole scene ----------------------------------------------------------
export function drawScene(ctx, game) {
  drawFloor(ctx, game);
  drawWall(ctx);
  drawStations(ctx, game);
  drawChef(ctx, game);
  drawParticles(ctx, game);
  drawFloats(ctx, game);
  drawHud(ctx, game);
  drawPrompt(ctx, game);
  drawToast(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  else if (game.state === 'paused') drawPaused(ctx, game);
  else if (game.state === 'dayEnd') drawDayEnd(ctx, game);
  else if (game.state === 'gameOver') drawGameOver(ctx, game);
}

function drawFloor(ctx, game) {
  ctx.fillStyle = '#c98f5f';
  ctx.fillRect(0, FLOOR.y, W, H - FLOOR.y);
  const tile = 64;
  for (let y = FLOOR.y; y < H; y += tile) {
    for (let x = 0; x < W; x += tile) {
      const even = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = even ? '#d9a271' : '#c98f5f';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, FLOOR.y, W, 4);
  // A worn rug where the chef runs.
  ctx.fillStyle = 'rgba(120,60,30,0.16)';
  roundRect(ctx, 420, 500, 440, 260, 18);
  ctx.fill();
  // Potted herb on the floor, pure decoration.
  drawPot(ctx, 1215, 745);
}

function drawPot(ctx, x, y) {
  ctx.fillStyle = '#b0563a';
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 14);
  ctx.lineTo(x + 16, y - 14);
  ctx.lineTo(x + 11, y + 8);
  ctx.lineTo(x - 11, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5da244';
  for (const [dx, dy, r] of [[-8, -20, 7], [0, -26, 8], [9, -20, 7]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWall(ctx) {
  // Cream wall with a mint tile backsplash behind the top counters.
  ctx.fillStyle = '#f3e6c8';
  ctx.fillRect(0, 96, W, 100);
  ctx.fillStyle = '#a8c8b0';
  for (let x = 0; x < W; x += 42) {
    ctx.fillRect(x, 96, 40, 100);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let x = 0; x < W; x += 42) {
    ctx.fillRect(x, 96, 40, 4);
  }
  // Hanging lamps over the ingredient wall.
  for (const lx of [120, 536, 904]) {
    ctx.strokeStyle = '#7a5a38';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 96);
    ctx.lineTo(lx, 106);
    ctx.stroke();
    ctx.fillStyle = '#f7c948';
    ctx.beginPath();
    ctx.moveTo(lx - 16, 106);
    ctx.lineTo(lx + 16, 106);
    ctx.lineTo(lx + 9, 120);
    ctx.lineTo(lx - 9, 120);
    ctx.closePath();
    ctx.fill();
  }
  // Framed menu poster on the wall.
  ctx.fillStyle = '#fff8e6';
  roundRect(ctx, 1030, 108, 210, 76, 8);
  ctx.fill();
  ctx.strokeStyle = '#c98a35';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, "TODAY'S MENU", 1135, 124, 13, '#8a5a33');
  text(ctx, 'Sunny Burger · Cheesy Melt', 1135, 144, 12, '#5a4632', 600);
  text(ctx, 'Garden Stack · Double Trouble', 1135, 163, 12, '#5a4632', 600);
}

function drawStations(ctx, game) {
  for (const s of STATIONS) {
    if (s.kind === 'bin') drawBin(ctx, game, s);
    else if (s.kind === 'grill') drawGrill(ctx, game, s);
    else if (s.kind === 'assembly') drawAssembly(ctx, game, s);
    else if (s.kind === 'trash') drawTrash(ctx, game, s);
    else if (s.kind === 'serve') drawServe(ctx, game, s);
  }
}

function counterBase(ctx, s, topColor, frontColor) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, s.x + 4, s.y + 6, s.w, s.h, 10);
  ctx.fill();
  ctx.fillStyle = frontColor;
  roundRect(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.fill();
  ctx.fillStyle = topColor;
  roundRect(ctx, s.x, s.y, s.w, 18, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(s.x + 8, s.y + 2, s.w - 16, 3);
}

function drawBin(ctx, game, s) {
  counterBase(ctx, s, '#e8c48d', '#a9713f');
  const ing = INGREDIENTS[s.id];
  drawIngredient(ctx, s.id, s.x + s.w / 2, s.y + 40, 44);
  text(ctx, s.label, s.x + s.w / 2, s.y + s.h - 12, 12, '#fff2d8');
  // A few spare pieces piled in the bin.
  drawIngredient(ctx, s.id, s.x + 30, s.y + 44, 22);
  drawIngredient(ctx, s.id, s.x + s.w - 30, s.y + 44, 22);
  void ing;
}

function drawGrill(ctx, game, s) {
  counterBase(ctx, s, '#6b7280', '#4b5563');
  // Two slots.
  for (let i = 0; i < 2; i++) {
    const slot = game.kitchen.grill[i];
    const cx = s.x + 58 + i * 100;
    const cy = s.y + 42;
    ctx.fillStyle = '#2d333d';
    roundRect(ctx, cx - 42, cy - 24, 84, 48, 8);
    ctx.fill();
    // Heat bars.
    ctx.strokeStyle = slot.state === 'cooking' ? '#ff9a3c' : '#5a6270';
    ctx.lineWidth = 3;
    for (let b = -1; b <= 1; b++) {
      ctx.beginPath();
      ctx.moveTo(cx - 34, cy + b * 12);
      ctx.lineTo(cx + 34, cy + b * 12);
      ctx.stroke();
    }
    if (slot.state === 'cooking' || slot.state === 'done') {
      const prog = game.kitchen.grillProgress(slot);
      drawIngredient(ctx, 'patty', cx, cy - 2, 40);
      if (slot.state === 'cooking') {
        // Progress ring.
        ctx.strokeStyle = '#f7c948';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 26, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.stroke();
      } else {
        text(ctx, 'READY!', cx, cy - 34, 12, '#7cf29a');
        ctx.strokeStyle = '#7cf29a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 26, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (slot.state === 'burnt') {
      ctx.fillStyle = '#1f2937';
      roundRect(ctx, cx - 18, cy - 10, 36, 20, 6);
      ctx.fill();
      text(ctx, 'BURNT', cx, cy - 30, 11, '#ff9a9a');
    } else {
      text(ctx, 'empty', cx, cy, 11, 'rgba(255,255,255,0.45)', 600);
    }
  }
  text(ctx, s.label, s.x + s.w / 2, s.y + s.h - 12, 12, '#fff2d8');
}

function drawAssembly(ctx, game, s) {
  counterBase(ctx, s, '#e8c48d', '#a9713f');
  // Chopping board.
  ctx.fillStyle = '#f3e6c8';
  roundRect(ctx, s.x + 18, s.y + 26, s.w - 36, 56, 8);
  ctx.fill();
  if (game.kitchen.plate.length === 0) {
    text(ctx, 'plate', s.x + s.w / 2, s.y + 38, 13, '#b9a684', 600);
    drawPlateStack(ctx, [], s.x + s.w / 2, s.y + 62, 120);
  } else {
    drawPlateStack(ctx, game.kitchen.plate, s.x + s.w / 2, s.y + 66, 150);
  }
  text(ctx, s.label, s.x + s.w / 2, s.y + s.h - 12, 12, '#fff2d8');
}

function drawTrash(ctx, game, s) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, s.x + 4, s.y + 6, s.w, s.h, 10);
  ctx.fill();
  ctx.fillStyle = '#5b6b7a';
  roundRect(ctx, s.x, s.y + 8, s.w, s.h - 8, 10);
  ctx.fill();
  ctx.fillStyle = '#7b8b9a';
  roundRect(ctx, s.x - 4, s.y, s.w + 8, 14, 7);
  ctx.fill();
  text(ctx, s.label, s.x + s.w / 2, s.y + s.h - 14, 12, '#e8eef2');
}

function drawServe(ctx, game, s) {
  const flash = game.kitchen.serveFlash > 0;
  const err = game.kitchen.serveError > 0;
  const shake = err ? Math.sin(game.time * 40) * 3 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  counterBase(ctx, s, '#c94f3d', '#8f2f22');
  // Red-and-white striped awning.
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c94f3d' : '#fff2d8';
    ctx.fillRect(s.x + 8 + i * 41, s.y - 14, 41, 16);
  }
  // Heat lamps.
  for (const lx of [s.x + 70, s.x + s.w / 2, s.x + s.w - 70]) {
    ctx.fillStyle = flash ? '#ffe9a8' : '#ffb347';
    ctx.beginPath();
    ctx.arc(lx, s.y + 30, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,179,71,0.25)';
    ctx.beginPath();
    ctx.arc(lx, s.y + 30, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  // The bell.
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.arc(s.x + s.w / 2, s.y + 62, 16, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(s.x + s.w / 2 - 16, s.y + 62, 32, 4);
  ctx.fillStyle = '#d9a41f';
  ellipse(ctx, s.x + s.w / 2, s.y + 70, 20, 4);
  ctx.fill();
  text(ctx, 'SERVE  •  RING THE BELL', s.x + s.w / 2, s.y + s.h - 12, 13, '#ffe9c9');
  ctx.restore();
}

function drawChef(ctx, game) {
  const chef = game.chef;
  const x = chef.x;
  const y = chef.y + chef.bob;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, chef.x, chef.y + 24, 26, 8);
  ctx.fill();
  // Body / apron.
  ctx.fillStyle = '#f4f1e8';
  roundRect(ctx, x - 20, y - 8, 40, 34, 12);
  ctx.fill();
  ctx.fillStyle = '#3f6fb5';
  roundRect(ctx, x - 13, y + 2, 26, 24, 8);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(x, y - 20, 15, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 9, y - 32, 8, 0, Math.PI * 2);
  ctx.arc(x, y - 36, 9, 0, Math.PI * 2);
  ctx.arc(x + 9, y - 32, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 13, y - 34, 26, 8);
  // Eyes look where the chef faces.
  ctx.fillStyle = '#2b2b2b';
  ellipse(ctx, x - 5 + chef.dir * 2, y - 21, 2, 3);
  ctx.fill();
  ellipse(ctx, x + 5 + chef.dir * 2, y - 21, 2, 3);
  ctx.fill();
  // Carried goods float above the hat.
  if (chef.carryingPlate) {
    drawPlateStack(ctx, chef.carryPlate, x, y - 60, 88);
  } else if (chef.carry.length) {
    const n = chef.carry.length;
    chef.carry.forEach((id, i) => {
      const bx = x + (i - (n - 1) / 2) * 34;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(bx, y - 54, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,70,50,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawIngredient(ctx, id, bx, y - 54, 24);
    });
  }
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a * 0.8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloats(ctx, game) {
  for (const f of game.floats) {
    const a = clamp(f.life / f.maxLife, 0, 1);
    ctx.globalAlpha = a;
    text(ctx, f.txt, f.x, f.y, f.size, f.color, 800);
    ctx.globalAlpha = 1;
  }
}

// HUD: title, order tickets, timer, hearts, score. -------------------------
function drawHud(ctx, game) {
  ctx.fillStyle = '#33241a';
  ctx.fillRect(0, 0, W, 96);
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(0, 92, W, 4);

  // Left: name, day, score.
  text(ctx, 'GOLDEN LADLE', 20, 26, 22, '#f7c948', 800, 'left');
  text(ctx, `DAY ${game.day}  •  SCORE $${game.score}`, 20, 56, 15, '#fff2d8', 700, 'left');
  text(ctx, `SERVED ${game.served}  •  BEST $${game.best}`, 20, 78, 12, 'rgba(255,242,216,0.65)', 600, 'left');

  // Centre: order tickets.
  const tickets = game.orders.orders;
  const tw = 168;
  const gap = 10;
  const totalW = tickets.length * tw + (tickets.length - 1) * gap;
  let tx = (W - totalW) / 2;
  if (tickets.length === 0) {
    text(ctx, 'No orders yet — the kitchen is calm…', W / 2, 48, 14, 'rgba(255,242,216,0.6)', 600);
  }
  tickets.forEach((order, i) => {
    drawTicket(ctx, order, tx, 10, tw, 76, game);
    tx += tw + gap;
    void i;
  });

  // Right: timer clock + hearts + combo.
  const cx = W - 74;
  const cy = 44;
  const frac = clamp(game.timeLeft / game.shiftLength, 0, 1);
  ctx.fillStyle = '#fff2d8';
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = frac < 0.17 ? '#e4573d' : '#3f6fb5';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff2d8';
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();
  const mm = Math.floor(Math.max(0, game.timeLeft) / 60);
  const ss = Math.floor(Math.max(0, game.timeLeft) % 60);
  text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, cx, cy + 1, 13, frac < 0.17 ? '#c0392b' : '#33241a', 800);
  // Hearts under the clock.
  for (let h = 0; h < 3; h++) {
    heart(ctx, W - 108 + h * 26, 84, 15, h < game.hearts);
  }
  // Combo flame.
  if (game.combo >= 2) {
    ctx.fillStyle = '#ff8c1a';
    roundRect(ctx, W - 218, 16, 96, 26, 13);
    ctx.fill();
    text(ctx, `COMBO x${game.combo}`, W - 170, 30, 13, '#fff2d8', 800);
  }
  if (game.sound.muted) {
    text(ctx, 'MUTED (M)', W - 218, 78, 11, 'rgba(255,242,216,0.6)', 600);
  }
}

function drawTicket(ctx, order, x, y, w, h, game) {
  const frac = game.orders.patienceFraction(order);
  const urgent = frac < 0.25;
  const pop = 1 + (1 - order.pop) * 0.25;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(pop, pop);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = urgent && Math.floor(game.time * 6) % 2 === 0 ? '#ffe1d6' : '#fff8e6';
  roundRect(ctx, 0, 0, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#c98a35';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const r = order.recipe;
  text(ctx, r.name.toUpperCase(), w / 2, 13, 12, '#5a4632', 800);
  // Ingredient dots.
  const dotGap = 26;
  const dw = r.needs.length * dotGap;
  r.needs.forEach((id, i) => {
    const dx = (w - dw) / 2 + i * dotGap + dotGap / 2;
    drawIngredient(ctx, id, dx, 34, 22);
  });
  // Patience bar.
  ctx.fillStyle = '#e5dcc4';
  roundRect(ctx, 10, h - 20, w - 20, 8, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#7cc24a' : frac > 0.25 ? '#f7c948' : '#e4573d';
  roundRect(ctx, 10, h - 20, (w - 20) * frac, 8, 4);
  ctx.fill();
  text(ctx, `$${r.price}`, w - 12, h - 30, 12, '#8a5a33', 800, 'right');
  ctx.restore();
}

function drawPrompt(ctx, game) {
  if (game.state !== 'playing' || !game.prompt) return;
  const chef = game.chef;
  const label = game.prompt;
  ctx.font = '700 14px "Trebuchet MS", "Segoe UI", sans-serif';
  const w = ctx.measureText(label).width + 28;
  const x = clamp(chef.x - w / 2, 8, W - w - 8);
  // A carried plate stacks above the chef's hat; lift the bubble clear of it.
  const y = chef.y - (chef.carryingPlate ? 132 : 96);
  ctx.fillStyle = 'rgba(51,36,26,0.92)';
  roundRect(ctx, x, y, w, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.moveTo(chef.x - 7, y + 28);
  ctx.lineTo(chef.x + 7, y + 28);
  ctx.lineTo(chef.x, y + 38);
  ctx.closePath();
  ctx.fill();
  text(ctx, label, x + w / 2, y + 15, 14, '#fff2d8', 700);
}

function drawToast(ctx, game) {
  if (!game.toast || game.toastLife <= 0) return;
  ctx.globalAlpha = clamp(game.toastLife / 0.5, 0, 1);
  ctx.font = '700 16px "Trebuchet MS", "Segoe UI", sans-serif';
  const w = ctx.measureText(game.toast).width + 36;
  ctx.fillStyle = 'rgba(51,36,26,0.9)';
  roundRect(ctx, (W - w) / 2, 208, w, 34, 17);
  ctx.fill();
  text(ctx, game.toast, W / 2, 226, 16, '#ffe9a8', 700);
  ctx.globalAlpha = 1;
}

// Overlays ------------------------------------------------------------------
function overlayPanel(ctx, w, h) {
  ctx.fillStyle = 'rgba(20,12,6,0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff8e6';
  roundRect(ctx, (W - w) / 2, (H - h) / 2, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = '#c98a35';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawTitle(ctx, game) {
  overlayPanel(ctx, 640, 480);
  const cx = W / 2;
  const top = (H - 480) / 2;
  text(ctx, 'GOLDEN LADLE', cx, top + 64, 46, '#8a5a33', 800);
  text(ctx, 'A one-cook rush kitchen', cx, top + 108, 18, '#a9713f', 600);
  drawPlateStack(ctx, ['bun', 'patty', 'lettuce', 'tomato'], cx, top + 168, 220);
  const lines = [
    'Move with WASD / arrows, or click the floor.',
    'E (or click a counter) grabs ingredients — grill the patty!',
    'Stack the dish on the assembly plate, carry it to SERVE.',
    'Serve before the ticket runs out. 3 missed tickets ends the shift.',
  ];
  lines.forEach((line, i) => text(ctx, line, cx, top + 226 + i * 28, 15, '#5a4632', 600));
  const pulse = 0.75 + Math.sin(game.time * 4) * 0.25;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#c94f3d';
  roundRect(ctx, cx - 150, top + 356, 300, 52, 26);
  ctx.fill();
  text(ctx, 'CLICK OR PRESS ENTER TO COOK', cx, top + 383, 16, '#fff2d8', 800);
  ctx.globalAlpha = 1;
  if (game.best > 0) text(ctx, `Best score so far: $${game.best}`, cx, top + 440, 14, '#8a5a33', 700);
}

function drawPaused(ctx, game) {
  overlayPanel(ctx, 420, 180);
  text(ctx, 'PAUSED', W / 2, H / 2 - 30, 34, '#8a5a33', 800);
  text(ctx, 'Press P to get back to the stove', W / 2, H / 2 + 22, 15, '#5a4632', 600);
  void game;
}

function drawDayEnd(ctx, game) {
  overlayPanel(ctx, 560, 380);
  const cx = W / 2;
  const top = (H - 380) / 2;
  text(ctx, `DAY ${game.day} COMPLETE!`, cx, top + 56, 34, '#8a5a33', 800);
  // Stars.
  for (let i = 0; i < 3; i++) {
    drawStar(ctx, cx - 70 + i * 70, top + 128, 26, i < game.stars);
  }
  text(ctx, `Score $${game.score}  •  Served ${game.served} dishes`, cx, top + 190, 18, '#5a4632', 700);
  text(ctx, game.stars === 3 ? 'A flawless shift — the regulars are cheering!' : game.stars === 2 ? 'A solid shift — the kitchen kept up.' : 'The kitchen survived. Barely.', cx, top + 226, 15, '#a9713f', 600);
  text(ctx, 'Press R for the next day, or ENTER to replay this one', cx, top + 300, 15, '#5a4632', 700);
}

function drawStar(ctx, x, y, r, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#f7c948' : '#e5dcc4';
  ctx.fill();
  ctx.strokeStyle = '#c98a35';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawGameOver(ctx, game) {
  overlayPanel(ctx, 560, 360);
  const cx = W / 2;
  const top = (H - 360) / 2;
  text(ctx, 'SHIFT OVER', cx, top + 60, 36, '#c94f3d', 800);
  text(ctx, 'Three tickets walked out hungry.', cx, top + 112, 17, '#5a4632', 600);
  text(ctx, `Score $${game.score}  •  Served ${game.served} dishes`, cx, top + 168, 18, '#5a4632', 700);
  text(ctx, 'Press R to try the shift again', cx, top + 240, 16, '#8a5a33', 700);
  if (game.best > 0) text(ctx, `Best score: $${game.best}`, cx, top + 280, 14, '#a9713f', 700);
}
