// Recipes and ingredients for Golden Ladle Kitchen.
// Every dish is an original house recipe: a name, the ingredients it
// needs (order does not matter), its price and the day it unlocks.

export const INGREDIENTS = {
  bun:     { id: 'bun',     name: 'Bun',     short: 'BUN',  color: '#e9a94f', dark: '#b97a28' },
  patty:   { id: 'patty',   name: 'Patty',   short: 'PAT',  color: '#8a5a33', dark: '#5f3a1d' },
  lettuce: { id: 'lettuce', name: 'Lettuce', short: 'LET',  color: '#7cc24a', dark: '#4d8a2a' },
  tomato:  { id: 'tomato',  name: 'Tomato',  short: 'TOM',  color: '#e4573d', dark: '#b03220' },
  cheese:  { id: 'cheese',  name: 'Cheese',  short: 'CHS',  color: '#f7c948', dark: '#d9a41f' },
};

export const INGREDIENT_IDS = ['bun', 'patty', 'lettuce', 'tomato', 'cheese'];

export const RECIPES = [
  {
    id: 'sunny',
    name: 'Sunny Burger',
    needs: ['bun', 'patty', 'lettuce'],
    price: 8,
    day: 1,
    blurb: 'The house classic.',
  },
  {
    id: 'melt',
    name: 'Cheesy Melt',
    needs: ['bun', 'patty', 'cheese'],
    price: 9,
    day: 1,
    blurb: 'Extra cheese, extra smile.',
  },
  {
    id: 'garden',
    name: 'Garden Stack',
    needs: ['bun', 'lettuce', 'tomato', 'cheese'],
    price: 8,
    day: 1,
    blurb: 'No grill, all crunch.',
  },
  {
    id: 'double',
    name: 'Double Trouble',
    needs: ['bun', 'patty', 'patty', 'cheese'],
    price: 12,
    day: 2,
    blurb: 'Two patties, one brave eater.',
  },
];

export function recipesForDay(day) {
  return RECIPES.filter((r) => r.day <= day);
}

// True when the plate holds exactly the recipe's ingredients,
// ignoring order but respecting counts (two patties need two).
export function plateMatchesRecipe(plate, recipe) {
  if (plate.length !== recipe.needs.length) return false;
  const counts = {};
  for (const item of plate) counts[item] = (counts[item] || 0) + 1;
  for (const need of recipe.needs) {
    if (!counts[need]) return false;
    counts[need] -= 1;
  }
  return true;
}

// How many of the recipe's ingredients the plate already holds.
// Used to show progress dots on an order ticket.
export function plateMatchCount(plate, recipe) {
  const counts = {};
  for (const item of plate) counts[item] = (counts[item] || 0) + 1;
  let matched = 0;
  for (const need of recipe.needs) {
    if (counts[need] > 0) {
      counts[need] -= 1;
      matched += 1;
    }
  }
  return matched;
}
