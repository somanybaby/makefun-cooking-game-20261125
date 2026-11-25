// The order board: tickets arrive, wait with a patience bar, and must
// be served before they run out. One job only: own the list of orders.

import { recipesForDay, plateMatchesRecipe } from './recipes.js';
import { clamp } from './random.js';

let nextOrderId = 1;

export class OrderBoard {
  constructor(rng, day) {
    this.rng = rng;
    this.day = day;
    this.orders = [];
    // Seconds between new tickets; the kitchen gets busier as the day goes on.
    this.spawnInterval = day === 1 ? 13 : 11;
    this.spawnTimer = 2.0;
    this.maxOrders = 4;
    this.patience = day === 1 ? 45 : 40;
  }

  reset(day) {
    this.day = day;
    this.orders = [];
    this.spawnInterval = day === 1 ? 13 : 11;
    this.spawnTimer = 2.0;
    this.maxOrders = 4;
    this.patience = day === 1 ? 45 : 40;
  }

  // Pick a recipe, weighted so the day's new dish shows up but the
  // classics still dominate.
  rollRecipe() {
    const pool = recipesForDay(this.day);
    const weights = pool.map((r) => (r.day === this.day && this.day > 1 ? 2 : 3));
    let total = weights.reduce((a, b) => a + b, 0);
    let roll = this.rng.next() * total;
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  addOrder(forcedRecipe = null, patienceLeft = null) {
    if (this.orders.length >= this.maxOrders) return null;
    const recipe = forcedRecipe || this.rollRecipe();
    const order = {
      id: nextOrderId++,
      recipe,
      patience: patienceLeft === null ? this.patience : patienceLeft,
      maxPatience: this.patience,
      born: Date.now(),
      // A ticket wobbles in when it arrives; render uses this.
      pop: 0,
    };
    this.orders.push(order);
    return order;
  }

  // Advance timers. Returns the orders that just expired.
  update(dt) {
    const expired = [];
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      if (this.orders.length < this.maxOrders) this.addOrder();
      this.spawnTimer = this.spawnInterval;
    }
    for (const order of this.orders) {
      order.patience -= dt;
      order.pop = Math.min(1, order.pop + dt * 4);
      if (order.patience <= 0) expired.push(order);
    }
    if (expired.length) {
      this.orders = this.orders.filter((o) => o.patience > 0);
    }
    return expired;
  }

  // The first open order this plate completes, or null.
  findMatch(plate) {
    for (const order of this.orders) {
      if (plateMatchesRecipe(plate, order.recipe)) return order;
    }
    return null;
  }

  serve(order) {
    this.orders = this.orders.filter((o) => o.id !== order.id);
  }

  // Fraction of patience left, 0..1, for the ticket's bar.
  patienceFraction(order) {
    return clamp(order.patience / order.maxPatience, 0, 1);
  }

  isEmpty() {
    return this.orders.length === 0;
  }
}
