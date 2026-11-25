// The chef: a cook on foot. Moves with keys or a click target, bumps
// into counters, and carries either loose ingredients (up to two) or
// one finished plate.

import { solids, FLOOR } from './kitchen.js';
import { clamp } from './random.js';

export const CHEF_RADIUS = 26;
const CHEF_SPEED = 300; // logical pixels per second
const MAX_CARRY = 2;

export class Chef {
  constructor() {
    this.x = 640;
    this.y = 580;
    this.dir = 0; // -1 left, 1 right, 0 still; the hat tilts with it
    this.moving = false;
    this.walkPhase = 0;
    this.target = null; // {x, y} click-to-move destination, or null
    this.carry = []; // ingredient ids, or [{plate:[...]}] for a plate
    this.carryPlate = null; // array of ingredient ids when carrying a plate
    this.bob = 0;
  }

  reset(x = 640, y = 580) {
    this.x = x;
    this.y = y;
    this.dir = 0;
    this.moving = false;
    this.walkPhase = 0;
    this.target = null;
    this.carry = [];
    this.carryPlate = null;
  }

  get carryingPlate() {
    return this.carryPlate !== null;
  }

  get handsFull() {
    return this.carryingPlate || this.carry.length >= MAX_CARRY;
  }

  get handsEmpty() {
    return !this.carryingPlate && this.carry.length === 0;
  }

  // Circle-vs-rectangle push-out against every counter.
  collide(nx, ny) {
    const r = CHEF_RADIUS;
    for (const s of solids()) {
      const cx = clamp(nx, s.x, s.x + s.w);
      const cy = clamp(ny, s.y, s.y + s.h);
      const dx = nx - cx;
      const dy = ny - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 === 0) {
          // Dead centre of a counter: push down out of it.
          ny = s.y + s.h + r;
        } else {
          const d = Math.sqrt(d2);
          nx = cx + (dx / d) * r;
          ny = cy + (dy / d) * r;
        }
      }
    }
    nx = clamp(nx, FLOOR.x + r, FLOOR.x + FLOOR.w - r);
    ny = clamp(ny, FLOOR.y + r, FLOOR.y + FLOOR.h - r);
    return { x: nx, y: ny };
  }

  update(dt, keys) {
    let mx = 0;
    let my = 0;
    if (keys.left) mx -= 1;
    if (keys.right) mx += 1;
    if (keys.up) my -= 1;
    if (keys.down) my += 1;

    if (mx !== 0 || my !== 0) {
      // Keyboard steering cancels a click target.
      this.target = null;
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    } else if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        this.target = null;
      } else {
        mx = dx / dist;
        my = dy / dist;
      }
    }

    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      const nx = this.x + mx * CHEF_SPEED * dt;
      const ny = this.y + my * CHEF_SPEED * dt;
      const pos = this.collide(nx, ny);
      this.x = pos.x;
      this.y = pos.y;
      if (mx < -0.1) this.dir = -1;
      else if (mx > 0.1) this.dir = 1;
      this.walkPhase += dt * 10;
      this.bob = Math.sin(this.walkPhase) * 2;
    } else {
      this.bob *= 0.8;
    }
  }

  // The station whose front edge the chef stands closest to, if near.
  nearestStation(stations, reach = 78) {
    let best = null;
    let bestD = Infinity;
    for (const s of stations) {
      // Distance from the chef to the station's front (bottom) edge centre.
      const cx = clamp(this.x, s.x, s.x + s.w);
      const cy = s.y + s.h;
      const d = Math.hypot(this.x - cx, this.y - cy);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return bestD <= reach ? best : null;
  }

  pickUp(ingredientId) {
    if (this.handsFull) return false;
    this.carry.push(ingredientId);
    return true;
  }

  dropAll() {
    const had = this.carryingPlate ? [...this.carryPlate] : [...this.carry];
    this.carry = [];
    this.carryPlate = null;
    return had;
  }

  takePlate(plate) {
    if (!this.handsEmpty) return false;
    this.carryPlate = [...plate];
    return true;
  }

  putPlateBack() {
    if (!this.carryingPlate) return null;
    const plate = this.carryPlate;
    this.carryPlate = null;
    return plate;
  }
}
