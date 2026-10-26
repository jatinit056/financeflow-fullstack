/**
 * Chart colours and chrome. Series colours come from a colour-blind-validated categorical
 * palette; an entity keeps its colour on every chart (income is always blue).
 */
export const SERIES = {
  income: '#2a78d6',
  expenses: '#eb6834',
  balance: '#1baf7a',
};

export const CHROME = {
  grid: '#e7ebe7',
  axis: '#cdd5ce',
  tick: '#66706b',
  cursor: 'rgba(24, 35, 31, 0.05)',
  crosshair: '#9aa49f',
  surface: '#ffffff',
};

export const axisTick = { fill: CHROME.tick, fontSize: 12 };
