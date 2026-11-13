// Bulsa light colors from docs/bulsa-design-review.md.
// Keep the existing internal name while migrating the visible brand.
export const LightColors = {
  background: "#F8F5EF",
  surface: "#FFFFFF",
  text: "#382D29",
  muted: "#685A53",
  accent: "#8A533A",
  warning: "#984F40",
  summary: "#624435",
  onSummary: "#FFFFFF",
  summaryMuted: "#F8EDE4",
  onAccent: "#FFFFFF",
  selected: "#E9CDB1",
  track: "#EADFD5",
  income: "#426B50",
  soft: "#F2E4D4",
  excluded: "#F0E9E1",
  switchThumb: "#FFFFFF",
};

export type BulsaColors = typeof LightColors;
export const DarkColors: BulsaColors = {
  background: '#211B18', surface: '#332A25', soft: '#49382E', excluded: '#332A25',
  text: '#F8F1E9', muted: '#D6C6B9', accent: '#D8AD8D', warning: '#F0B2A3',
  summary: '#49382E', onSummary: '#F8F1E9', summaryMuted: '#D6C6B9',
  onAccent: '#382D29', selected: '#49382E', track: '#685348', income: '#A9D2AD',
  switchThumb: '#F8F1E9',
};
