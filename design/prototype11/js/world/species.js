// Plant species for the living world. Sizes in px at maturity, growth in world days to mature.
// need: soil moisture it likes (0..1) · sun: 0..1 · cold: lowest °C it survives without damage
// leaves: [spring, summer, autumn, winter] colours (null = bare) · evergreen keeps leaves all year

const G = ['#7ccf5a', '#4f9f35', null, null];
export const SPECIES = {
  // ---- trees ----
  oak: { name: 'Oak', cat: 'Trees', form: 'tree', h: 760, days: 9, need: 0.3, cold: -25, trunk: '#6b4a2f', crown: 'round', leaves: ['#8fd46a', '#3f8f2c', '#c8782a', null], spread: 0.6, depth: 5, seeds: 'acorn' },
  birch: { name: 'Birch', cat: 'Trees', form: 'tree', h: 680, days: 6, need: 0.35, cold: -35, trunk: '#ecebe4', bark: '#2b2b2b', crown: 'narrow', leaves: ['#a6e07a', '#6cbf45', '#f2c230', null], spread: 0.42, depth: 5 },
  maple: { name: 'Maple', cat: 'Trees', form: 'tree', h: 720, days: 8, need: 0.35, cold: -30, trunk: '#5e3f28', crown: 'round', leaves: ['#9ad66d', '#4c9b34', '#e0412c', null], spread: 0.55, depth: 5, seeds: 'helicopter' },
  cherry: { name: 'Cherry blossom', cat: 'Trees', form: 'tree', h: 560, days: 6, need: 0.35, cold: -20, trunk: '#4a2f2a', crown: 'wide', leaves: ['#ffb7d2', '#5aa23c', '#d9773a', null], blossom: '#ffc4dc', spread: 0.75, depth: 5, petals: '#ffc4dc' },
  apple: { name: 'Apple tree', cat: 'Trees', form: 'tree', h: 540, days: 7, need: 0.4, cold: -25, trunk: '#5a3b26', crown: 'round', leaves: ['#f5f0f2', '#4c9b34', '#b88a2e', null], blossom: '#fff3f6', fruit: '#e8352b', fruitSeason: [1, 2], spread: 0.65, depth: 4 },
  orange: { name: 'Orange tree', cat: 'Trees', form: 'tree', h: 480, days: 7, need: 0.4, cold: -2, trunk: '#5a3b26', crown: 'round', leaves: ['#3f9a3a', '#3f9a3a', '#3f9a3a', '#3f9a3a'], evergreen: true, fruit: '#ff9a1a', fruitSeason: [2, 3], spread: 0.65, depth: 4 },
  willow: { name: 'Willow', cat: 'Trees', form: 'tree', h: 680, days: 7, need: 0.65, cold: -30, trunk: '#5b4a33', crown: 'droop', leaves: ['#b6e07a', '#7cbf4a', '#d0c050', null], spread: 0.6, depth: 4 },
  baobab: { name: 'Baobab', cat: 'Trees', form: 'tree', h: 640, days: 12, need: 0.12, cold: 0, trunk: '#9b7b62', crown: 'flat', leaves: ['#6aa840', '#6aa840', '#a0a040', null], thick: 2.6, spread: 0.9, depth: 4 },
  pine: { name: 'Pine', cat: 'Trees', form: 'conifer', h: 820, days: 8, need: 0.25, cold: -40, trunk: '#5a3b26', leaves: ['#2f6d3a', '#2f6d3a', '#2f6d3a', '#2f6d3a'], evergreen: true },
  cypress: { name: 'Cypress', cat: 'Trees', form: 'columnar', h: 760, days: 7, need: 0.3, cold: -15, trunk: '#5a3b26', leaves: ['#2c5e33', '#2c5e33', '#2c5e33', '#2c5e33'], evergreen: true },
  palm: { name: 'Palm', cat: 'Trees', form: 'palm', h: 720, days: 8, need: 0.25, cold: 2, trunk: '#9c7a52', leaves: ['#3fae3a', '#3fae3a', '#3fae3a', '#3fae3a'], evergreen: true, fruit: '#7a5230', fruitSeason: [1, 2] },
  deadtree: { name: 'Old dead tree', cat: 'Trees', form: 'tree', h: 600, days: 1, need: 0, cold: -60, trunk: '#6f6258', crown: 'round', leaves: [null, null, null, null], spread: 0.7, depth: 4, dead: true },
  // ---- shrubs ----
  bush: { name: 'Bush', cat: 'Shrubs', form: 'bush', h: 170, days: 3, need: 0.3, cold: -20, leaves: ['#7fcf5a', '#4c9b34', '#b5872f', '#6d7a5a'] },
  hedge: { name: 'Hedge', cat: 'Shrubs', form: 'hedge', h: 150, days: 3, need: 0.3, cold: -25, leaves: ['#4f9a3a', '#3d8530', '#4f8a30', '#4a7a3a'], evergreen: true },
  rose: { name: 'Rose bush', cat: 'Shrubs', form: 'bush', h: 150, days: 3, need: 0.4, cold: -15, leaves: ['#6fbf4a', '#3f8f2c', '#8a8a3a', null], flower: '#e8254a', flowerSeason: [0, 1] },
  blueberry: { name: 'Blueberry', cat: 'Shrubs', form: 'bush', h: 120, days: 3, need: 0.45, cold: -25, leaves: ['#7fcf5a', '#4c9b34', '#c0392b', null], fruit: '#4b5bd6', fruitSeason: [1] },
  fern: { name: 'Fern', cat: 'Shrubs', form: 'fern', h: 120, days: 2, need: 0.55, cold: -10, leaves: ['#7fd06a', '#4fa83a', '#b0902f', null] },
  bamboo: { name: 'Bamboo', cat: 'Shrubs', form: 'bamboo', h: 620, days: 2, need: 0.5, cold: -10, leaves: ['#8ed06a', '#5fb84a', '#8ab04a', '#7aa84a'], evergreen: true },
  // ---- flowers ----
  tulip: { name: 'Tulip', cat: 'Flowers', form: 'flower', head: 'tulip', h: 70, days: 1, need: 0.4, cold: -5, flower: '#ff3b5c', flowerSeason: [0], leaves: G },
  sunflower: { name: 'Sunflower', cat: 'Flowers', form: 'flower', head: 'sunflower', h: 230, days: 2, need: 0.4, cold: 2, flower: '#ffd23f', flowerSeason: [1, 2], leaves: G },
  daisy: { name: 'Daisy', cat: 'Flowers', form: 'flower', head: 'daisy', h: 50, days: 1, need: 0.35, cold: -5, flower: '#ffffff', flowerSeason: [0, 1, 2], leaves: G },
  poppy: { name: 'Poppy', cat: 'Flowers', form: 'flower', head: 'poppy', h: 70, days: 1, need: 0.25, cold: -5, flower: '#ff3a1f', flowerSeason: [0, 1], leaves: G },
  lavender: { name: 'Lavender', cat: 'Flowers', form: 'lavender', h: 80, days: 1.5, need: 0.2, cold: -15, flower: '#9b6bd6', flowerSeason: [1], leaves: ['#8aa88a', '#7a9a7a', '#7a8a6a', '#6a7a6a'] },
  dandelion: { name: 'Dandelion', cat: 'Flowers', form: 'flower', head: 'dandelion', h: 45, days: 0.8, need: 0.3, cold: -10, flower: '#ffd400', flowerSeason: [0, 1], leaves: G, spreads: 2.2 },
  lily: { name: 'Water lily', cat: 'Flowers', form: 'lily', h: 26, days: 1.5, need: 1, aquatic: true, cold: -5, flower: '#ffd0e4', flowerSeason: [1], leaves: ['#4fa83a', '#3f9a3a', '#7a8a3a', null] },
  // ---- crops ----
  wheat: { name: 'Wheat', cat: 'Crops', form: 'stalks', head: 'wheat', h: 120, days: 3, need: 0.35, cold: -5, leaves: ['#8ed06a', '#d8b84a', '#d8b84a', null] },
  corn: { name: 'Corn', cat: 'Crops', form: 'stalks', head: 'corn', h: 220, days: 3, need: 0.45, cold: 5, leaves: ['#7fcf5a', '#4f9f35', '#c8b050', null] },
  pumpkin: { name: 'Pumpkin', cat: 'Crops', form: 'vinecrop', h: 70, days: 3, need: 0.5, cold: 2, fruit: '#ff8a1a', fruitSize: 1, fruitSeason: [2], leaves: ['#7fcf5a', '#4f9f35', '#a89040', null] },
  watermelon: { name: 'Watermelon', cat: 'Crops', form: 'vinecrop', h: 60, days: 3, need: 0.55, cold: 8, fruit: '#3f9a3a', fruitSize: 1.1, stripes: true, fruitSeason: [1], leaves: ['#7fcf5a', '#4f9f35', '#a89040', null] },
  strawberry: { name: 'Strawberry', cat: 'Crops', form: 'vinecrop', h: 40, days: 2, need: 0.5, cold: -10, fruit: '#e8253a', fruitSize: 0.35, fruitSeason: [0, 1], leaves: G },
  carrot: { name: 'Carrot', cat: 'Crops', form: 'carrot', h: 60, days: 2, need: 0.45, cold: -5, leaves: ['#6fcf4a', '#4fae3a', '#6a9a3a', null] },
  tomato: { name: 'Tomato', cat: 'Crops', form: 'tomato', h: 150, days: 2.5, need: 0.5, cold: 5, fruit: '#e8352b', fruitSeason: [1, 2], leaves: ['#6fbf4a', '#3f8f2c', '#8a8a3a', null] },
  // ---- desert + other ----
  cactus: { name: 'Cactus', cat: 'Desert', form: 'cactus', h: 300, days: 10, need: 0.05, cold: -2, flower: '#ff6aa8', flowerSeason: [0], leaves: ['#3fa060', '#3fa060', '#3fa060', '#3fa060'], evergreen: true, drought: true },
  aloe: { name: 'Aloe', cat: 'Desert', form: 'rosette', h: 70, days: 4, need: 0.08, cold: 0, flower: '#ff8a1a', flowerSeason: [1], leaves: ['#6ab07a', '#6ab07a', '#6ab07a', '#6ab07a'], evergreen: true, drought: true },
  mushroom: { name: 'Mushroom', cat: 'Other', form: 'mushroom', h: 40, days: 0.5, need: 0.6, cold: -2, flower: '#e8352b', leaves: [null, null, null, null], shade: true, glow: true },
  reeds: { name: 'Reeds', cat: 'Other', form: 'reeds', h: 200, days: 2, need: 0.85, cold: -20, leaves: ['#8ab85a', '#6a9a3a', '#b8a050', '#a89a70'], evergreen: true },
  tallgrass: { name: 'Tall grass', cat: 'Other', form: 'tuft', h: 70, days: 1, need: 0.25, cold: -30, leaves: ['#86d65f', '#5aa83a', '#c2b552', '#a8a070'], evergreen: true, spreads: 1.5 },
  clover: { name: 'Clover', cat: 'Other', form: 'clover', h: 22, days: 0.6, need: 0.35, cold: -15, flower: '#ffffff', flowerSeason: [0, 1], leaves: ['#5fbf4a', '#4faa3a', '#6a9a3a', null], spreads: 1.4 },
};
export const SPECIES_CATS = ['Trees', 'Shrubs', 'Flowers', 'Crops', 'Desert', 'Other'];
export const SPECIES_ICON = {
  oak: '🌳', birch: '🌳', maple: '🍁', cherry: '🌸', apple: '🍎', orange: '🍊', willow: '🌿', baobab: '🌳', pine: '🌲', cypress: '🌲', palm: '🌴', deadtree: '🪵',
  bush: '🌿', hedge: '🟩', rose: '🌹', blueberry: '🫐', fern: '🌿', bamboo: '🎋',
  tulip: '🌷', sunflower: '🌻', daisy: '🌼', poppy: '🌺', lavender: '💜', dandelion: '🌼', lily: '🪷',
  wheat: '🌾', corn: '🌽', pumpkin: '🎃', watermelon: '🍉', strawberry: '🍓', carrot: '🥕', tomato: '🍅',
  cactus: '🌵', aloe: '🪴', mushroom: '🍄', reeds: '🌾', tallgrass: '🌱', clover: '☘️',
};
