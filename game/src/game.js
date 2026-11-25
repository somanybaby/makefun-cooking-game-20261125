// Golden Ladle Kitchen: the game itself. One job: own the state
// machine (title / playing / paused / dayEnd / gameOver), the shift
// timer, scoring, and what happens when the chef uses a station.

import { Kitchen, stationById, STATIONS } from './kitchen.js';
import { Chef } from './chef.js';
import { OrderBoard } from './orders.js';
import { SoundBank } from './audio.js';
import { INGREDIENTS, recipesForDay } from './recipes.js';
import { makeRng, clamp, randomRange } from './random.js';
import { drawScene } from './render.js';

const SHIFT_LENGTH = 150; // seconds per day
const COMBO_WINDOW = 15; // seconds to keep a combo alive
const MAX_HEARTS = 3;

export class Game {
  constructor(canvas, query = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = makeRng(query.seed ? Number(query.seed) : (Date.now() % 2147483647));
    this.sound = new SoundBank();
    this.kitchen = new Kitchen();
    this.chef = new Chef();
    this.orders = new OrderBoard(this.rng, 1);
    this.state = 'title';
    this.time = 0; // wall clock for animation
    this.day = 1;
    this.score = 0;
    this.served = 0;
    this.hearts = MAX_HEARTS;
    this.combo = 0;
    this.comboTimer = 0;
    this.shiftLength = SHIFT_LENGTH;
    this.timeLeft = SHIFT_LENGTH;
    this.stars = 0;
    this.best = 0;
    try {
      this.best = Number(window.localStorage.getItem('golden-ladle-best') || 0) || 0;
    } catch (err) {
      this.best = 0;
    }
    this.particles = [];
    this.floats = [];
    this.prompt = null;
    this.toast = null;
    this.toastLife = 0;
    this.keys = { left: false, right: false, up: false, down: false };
    this.shot = query.shot || null;
    this.lastTickSecond = -1;
    this.dayServed = 0;
    if (this.shot) this.applyShot(this.shot);
  }

  // -- day lifecycle -------------------------------------------------------
  startDay(day) {
    this.day = day;
    this.kitchen.reset();
    this.chef.reset();
    this.orders.reset(day);
    this.score = 0;
    this.served = 0;
    this.dayServed = 0;
    this.hearts = MAX_HEARTS;
    this.combo = 0;
    this.comboTimer = 0;
    this.timeLeft = SHIFT_LENGTH;
    this.stars = 0;
    this.particles = [];
    this.floats = [];
    this.toast = null;
    this.state = 'playing';
  }

  startGame() {
    this.startDay(1);
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem('golden-ladle-best', String(this.best));
      } catch (err) {
        // Private mode: best score just lives for this visit.
      }
    }
  }

  endDay() {
    this.saveBest();
    // Stars from the day's score.
    const target = this.day === 1 ? [40, 70, 100] : [60, 95, 130];
    this.stars = this.score >= target[2] ? 3 : this.score >= target[1] ? 2 : this.score >= target[0] ? 1 : 0;
    this.state = 'dayEnd';
    this.sound.win();
    this.burst(this.chef.x, this.chef.y - 40, '#f7c948', 26);
  }

  failShift() {
    this.saveBest();
    this.state = 'gameOver';
    this.sound.expire();
  }

  // -- scoring --------------------------------------------------------------
  serveOrder(order) {
    const patienceBonus = Math.round((order.patience / order.maxPatience) * 4);
    const comboBonus = this.combo;
    const earned = order.recipe.price + patienceBonus + comboBonus;
    this.score += earned;
    this.served += 1;
    this.dayServed += 1;
    this.combo += 1;
    this.comboTimer = COMBO_WINDOW;
    const serve = stationById('serve');
    this.kitchen.serveFlash = 0.6;
    this.floats.push({
      x: serve.x + serve.w / 2,
      y: serve.y - 8,
      txt: `+$${earned}`,
      life: 1.4,
      maxLife: 1.4,
      size: 24,
      color: '#2f7d32',
    });
    this.burst(serve.x + serve.w / 2, serve.y + 40, '#f7c948', 18);
    this.sound.serve();
    this.orders.serve(order);
  }

  // -- main loop ------------------------------------------------------------
  update(dt) {
    this.time += dt;
    this.kitchen.update(dt);
    this.updateParticles(dt);
    this.updateFloats(dt);
    if (this.toastLife > 0) this.toastLife -= dt;

    if (this.state !== 'playing') {
      this.prompt = null;
      return;
    }

    // Shift clock.
    this.timeLeft -= dt;
    const second = Math.ceil(this.timeLeft);
    if (second !== this.lastTickSecond) {
      this.lastTickSecond = second;
      if (second <= 10 && second > 0) this.sound.tick();
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endDay();
      return;
    }

    // Combo decay.
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Orders.
    const expired = this.orders.update(dt);
    for (const order of expired) {
      this.hearts -= 1;
      this.combo = 0;
      this.sound.expire();
      this.showToast(`Order walked out: ${order.recipe.name}`);
      this.burst(640, 60, '#e4573d', 10);
      if (this.hearts <= 0) {
        this.failShift();
        return;
      }
    }

    // Grill ready ping.
    for (const slot of this.kitchen.grill) {
      if (slot.state === 'done' && !slot.pinged) {
        slot.pinged = true;
        this.sound.pattyReady();
      }
      if (slot.state !== 'done') slot.pinged = false;
    }

    this.chef.update(dt, this.keys);
    this.refreshPrompt();
  }

  render() {
    drawScene(this.ctx, this);
  }

  // -- interaction ----------------------------------------------------------
  refreshPrompt() {
    const station = this.chef.nearestStation(
      // All stations are candidates; the chef stands in front of one.
      this.nearbyStations(),
    );
    if (!station) {
      this.prompt = null;
      return;
    }
    this.prompt = this.actionLabel(station);
  }

  nearbyStations() {
    // The whole station list is tiny; every station is a candidate.
    return STATIONS;
  }

  actionLabel(station) {
    const chef = this.chef;
    const k = this.kitchen;
    switch (station.kind) {
      case 'bin': {
        if (chef.handsFull) return 'Hands full!';
        return `E — Grab ${INGREDIENTS[station.id].name}`;
      }
      case 'grill': {
        if (k.donePattySlot() !== -1) {
          return chef.handsFull ? 'Hands full!' : 'E — Take cooked patty';
        }
        if (k.freeGrillSlot() !== -1) return 'E — Start a patty';
        return 'Grill is full…';
      }
      case 'assembly': {
        if (chef.carryingPlate) return 'E — Put the plate down';
        if (!chef.handsEmpty) return 'E — Add to the plate';
        if (k.plate.length > 0) return 'E — Pick up the plate  •  Q — Clear it';
        return 'Bring ingredients here';
      }
      case 'serve': {
        if (chef.carryingPlate) return 'E — SERVE IT!';
        return 'Bring a finished plate here';
      }
      case 'trash': {
        if (!chef.handsEmpty) return 'E — Throw it away';
        return 'Trash';
      }
      default:
        return null;
    }
  }

  interact() {
    if (this.state !== 'playing') return;
    const station = this.chef.nearestStation(STATIONS);
    if (!station) return;
    const chef = this.chef;
    const k = this.kitchen;
    switch (station.kind) {
      case 'bin': {
        if (chef.pickUp(station.id)) {
          this.sound.pickup();
          this.spawnSteam(station);
        } else {
          this.sound.error();
        }
        break;
      }
      case 'grill': {
        if (k.donePattySlot() !== -1) {
          if (chef.pickUp('patty')) {
            k.takePatty();
            this.sound.pickup();
          } else {
            this.sound.error();
          }
        } else if (k.clearBurnt()) {
          this.sound.place();
          this.showToast('Cleared a burnt patty');
        } else if (k.startPatty()) {
          this.sound.grillStart();
          this.spawnSteam(station);
        } else {
          this.sound.error();
        }
        break;
      }
      case 'assembly': {
        if (chef.carryingPlate) {
          const plate = chef.putPlateBack();
          k.plate = plate;
          this.sound.place();
        } else if (!chef.handsEmpty) {
          if (k.plateIsFull()) {
            this.sound.error();
            this.showToast('The plate is full!');
          } else {
            const item = chef.carry.pop();
            k.plate.push(item);
            this.sound.place();
            this.spawnSteam(station);
          }
        } else if (k.plate.length > 0) {
          if (chef.takePlate(k.plate)) {
            k.clearPlate();
            this.sound.pickup();
          }
        }
        break;
      }
      case 'serve': {
        if (!chef.carryingPlate) break;
        const match = this.orders.findMatch(chef.carryPlate);
        if (match) {
          chef.dropAll();
          this.serveOrder(match);
        } else {
          k.serveError = 0.5;
          this.sound.error();
          this.showToast('No order wants this plate yet');
        }
        break;
      }
      case 'trash': {
        if (!chef.handsEmpty) {
          chef.dropAll();
          this.sound.place();
        }
        break;
      }
      default:
        break;
    }
    this.refreshPrompt();
  }

  clearPlate() {
    if (this.state !== 'playing') return;
    const station = this.chef.nearestStation(STATIONS);
    if (station && station.kind === 'assembly' && this.kitchen.plate.length > 0) {
      this.kitchen.clearPlate();
      this.sound.place();
      this.showToast('Plate cleared');
    }
  }

  // -- helpers ---------------------------------------------------------------
  showToast(msg) {
    this.toast = msg;
    this.toastLife = 2.2;
  }

  spawnSteam(station) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: station.x + station.w / 2 + randomRange(-20, 20),
        y: station.y + 20,
        vx: randomRange(-8, 8),
        vy: randomRange(-46, -22),
        life: randomRange(0.5, 0.9),
        maxLife: 0.9,
        r: randomRange(3, 6),
        color: '#ffffff',
      });
    }
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const ang = randomRange(0, Math.PI * 2);
      const sp = randomRange(40, 160);
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 40,
        life: randomRange(0.4, 0.9),
        maxLife: 0.9,
        r: randomRange(2, 5),
        color,
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  updateFloats(dt) {
    for (const f of this.floats) {
      f.y -= 34 * dt;
      f.life -= dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  // -- screenshot presets ----------------------------------------------------
  // ?shot=start|play|serve|rush&seed=N drops the kitchen into a fixed,
  // photogenic moment so screenshots are real renders of real states.
  applyShot(shot) {
    this.state = 'playing';
    this.timeLeft = SHIFT_LENGTH;
    this.score = 0;
    this.served = 0;
    this.hearts = MAX_HEARTS;
    this.combo = 0;
    this.kitchen.reset();
    this.chef.reset();
    const recipes = recipesForDay(shot === 'rush' ? 2 : 1);
    const byId = (id) => recipes.find((r) => r.id === id);
    this.orders.reset(shot === 'rush' ? 2 : 1);
    this.orders.orders = [];
    // No fresh tickets while the screenshot is staged.
    this.orders.spawnTimer = 9999;

    if (shot === 'start') {
      this.orders.addOrder(byId('sunny'), 45);
      this.chef.reset(640, 580);
    } else if (shot === 'play') {
      this.score = 24;
      this.served = 2;
      this.combo = 2;
      this.comboTimer = 10;
      this.timeLeft = 105;
      this.orders.addOrder(byId('sunny'), 28);
      this.orders.addOrder(byId('melt'), 36);
      this.orders.addOrder(byId('garden'), 20);
      this.kitchen.plate = ['bun', 'patty'];
      this.kitchen.grill[0] = { state: 'cooking', t: 2.5, pinged: false };
      this.chef.reset(330, 500);
      this.chef.carry = ['tomato'];
      this.chef.dir = 1;
    } else if (shot === 'serve') {
      this.score = 41;
      this.served = 4;
      this.combo = 3;
      this.comboTimer = 12;
      this.timeLeft = 82;
      this.orders.addOrder(byId('sunny'), 31);
      this.orders.addOrder(byId('garden'), 24);
      this.chef.reset(1070, 500);
      this.chef.carryPlate = ['bun', 'patty', 'lettuce'];
      this.chef.dir = 1;
      this.kitchen.serveFlash = 0.4;
    } else if (shot === 'rush') {
      this.day = 2;
      this.score = 87;
      this.served = 8;
      this.combo = 4;
      this.comboTimer = 8;
      this.timeLeft = 20;
      this.orders.reset(2);
      this.orders.addOrder(byId('double'), 6);
      this.orders.addOrder(byId('sunny'), 18);
      this.orders.addOrder(byId('melt'), 27);
      this.orders.addOrder(byId('garden'), 33);
      this.kitchen.plate = ['bun', 'patty'];
      this.kitchen.grill[0] = { state: 'done', t: 0, pinged: true };
      this.kitchen.grill[1] = { state: 'cooking', t: 1.5, pinged: false };
      this.chef.reset(330, 250);
      this.chef.carry = ['cheese'];
      this.chef.dir = 1;
    }
    this.refreshPrompt();
  }
}
