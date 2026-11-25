// The kitchen itself: where every station sits, the grill's two slots,
// the assembly counter's plate, the trash and the serving window.
// Pure layout + station state; the Game decides what an interaction does.

export const FLOOR = { x: 0, y: 196, w: 1280, h: 604 };
export const HUD_H = 96;

// Station rectangles (logical 1280x800 canvas). The top row is the
// ingredient wall; assembly, trash and serve sit mid-kitchen.
export const STATIONS = [
  { id: 'bun',     kind: 'bin',      label: 'BUNS',     x: 36,  y: 112, w: 168, h: 76 },
  { id: 'grill',   kind: 'grill',    label: 'GRILL',    x: 220, y: 112, w: 216, h: 76 },
  { id: 'lettuce', kind: 'bin',      label: 'LETTUCE',  x: 452, y: 112, w: 168, h: 76 },
  { id: 'tomato',  kind: 'bin',      label: 'TOMATO',   x: 636, y: 112, w: 168, h: 76 },
  { id: 'cheese',  kind: 'bin',      label: 'CHEESE',   x: 820, y: 112, w: 168, h: 76 },
  { id: 'assembly', kind: 'assembly', label: 'ASSEMBLY', x: 36,  y: 330, w: 330, h: 118 },
  { id: 'trash',   kind: 'trash',    label: 'TRASH',    x: 560, y: 350, w: 120, h: 92 },
  { id: 'serve',   kind: 'serve',    label: 'SERVE',    x: 900, y: 330, w: 344, h: 118 },
];

export function stationById(id) {
  return STATIONS.find((s) => s.id === id) || null;
}

// All solid rectangles the chef cannot walk through.
export function solids() {
  return STATIONS.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
}

const GRILL_COOK_TIME = 5; // seconds a patty needs on the grill
const GRILL_BURN_TIME = 10; // seconds past done before it burns

export class Kitchen {
  constructor() {
    // Two grill slots: 'empty' | 'cooking' | 'done' | 'burnt', with a timer.
    this.grill = [
      { state: 'empty', t: 0 },
      { state: 'empty', t: 0 },
    ];
    // Ingredients stacked on the assembly plate, bottom first.
    this.plate = [];
    this.serveFlash = 0; // counts down after a successful serve (bell ring)
    this.serveError = 0; // counts down after a wrong plate (shake)
  }

  reset() {
    this.grill = [
      { state: 'empty', t: 0 },
      { state: 'empty', t: 0 },
    ];
    this.plate = [];
    this.serveFlash = 0;
    this.serveError = 0;
  }

  update(dt) {
    for (const slot of this.grill) {
      if (slot.state === 'cooking') {
        slot.t += dt;
        if (slot.t >= GRILL_COOK_TIME) {
          slot.state = 'done';
          slot.t = 0;
        }
      } else if (slot.state === 'done') {
        slot.t += dt;
        if (slot.t >= GRILL_BURN_TIME) {
          slot.state = 'burnt';
          slot.t = 0;
        }
      } else if (slot.state === 'burnt') {
        // A burnt patty smokes out on its own after a while.
        slot.t += dt;
        if (slot.t >= 2.5) {
          slot.state = 'empty';
          slot.t = 0;
        }
      }
    }
    if (this.serveFlash > 0) this.serveFlash -= dt;
    if (this.serveError > 0) this.serveError -= dt;
  }

  // Grill helpers -------------------------------------------------------
  freeGrillSlot() {
    return this.grill.findIndex((s) => s.state === 'empty');
  }

  startPatty() {
    const i = this.freeGrillSlot();
    if (i === -1) return false;
    this.grill[i] = { state: 'cooking', t: 0 };
    return true;
  }

  donePattySlot() {
    return this.grill.findIndex((s) => s.state === 'done');
  }

  takePatty() {
    const i = this.donePattySlot();
    if (i === -1) return false;
    this.grill[i] = { state: 'empty', t: 0 };
    return true;
  }

  clearBurnt() {
    const i = this.grill.findIndex((s) => s.state === 'burnt');
    if (i === -1) return false;
    this.grill[i] = { state: 'empty', t: 0 };
    return true;
  }

  grillProgress(slot) {
    if (slot.state === 'cooking') return slot.t / GRILL_COOK_TIME;
    if (slot.state === 'done') return 1;
    return 0;
  }

  // Plate helpers -------------------------------------------------------
  plateIsFull() {
    return this.plate.length >= 4;
  }

  clearPlate() {
    this.plate = [];
  }
}
