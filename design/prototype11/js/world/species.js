// Plants you can put in the ground: flowers and trees only. Art = Twemoji sprites (art/tw).
// h = full-grown height (px) · thirst = water a plant needs to grow from sprout to full size
// deciduous trees change with the seasons; overlay = little sprites on the crown (blossom, apples)

export const SPECIES = {
  // flowers
  tulip: { name: 'Tulip', cat: 'Flowers', sprite: 'tulip', h: 45, head: 18, thirst: 40 },
  sunflower: { name: 'Sunflower', cat: 'Flowers', sprite: 'sunflower', h: 200, head: 60, thirst: 60, followsSun: true },
  daisy: { name: 'Daisy', cat: 'Flowers', sprite: 'daisy', h: 35, head: 12, thirst: 35 },
  rose: { name: 'Rose', cat: 'Flowers', sprite: 'rose', h: 60, head: 18, thirst: 45 },
  hibiscus: { name: 'Hibiscus', cat: 'Flowers', sprite: 'hibiscus', h: 120, head: 30, thirst: 45 },
  hyacinth: { name: 'Hyacinth', cat: 'Flowers', sprite: 'hyacinth', h: 30, head: 14, thirst: 40 },
  blossom: { name: 'Cherry blossom', cat: 'Flowers', sprite: 'blossom', h: 40, head: 12, thirst: 40 },
  lotus: { name: 'Lotus (water)', cat: 'Flowers', sprite: 'lotus', h: 30, head: 30, thirst: 30, aquatic: true },
  // trees
  oak: { name: 'Oak tree', cat: 'Trees', sprite: 'deciduous', h: 1000, thirst: 130, deciduous: true },
  maple: { name: 'Maple tree', cat: 'Trees', sprite: 'deciduous', h: 900, thirst: 120, deciduous: true, autumn: 'red', overlay: { sprite: 'maple', seasons: [2], n: 6 } },
  pine: { name: 'Pine tree', cat: 'Trees', sprite: 'evergreen', h: 1200, thirst: 130 },
  palm: { name: 'Palm tree', cat: 'Trees', sprite: 'palm', h: 900, thirst: 120 },
  sakura: { name: 'Blossom tree', cat: 'Trees', sprite: 'deciduous', h: 600, thirst: 120, deciduous: true, overlay: { sprite: 'blossom', seasons: [0, 1], n: 9 } },
  appletree: { name: 'Apple tree', cat: 'Trees', sprite: 'deciduous', h: 500, thirst: 120, deciduous: true, overlay: { sprite: 'apple', seasons: [1, 2], n: 7, fruit: 'apple' } },
};
export const SPECIES_CATS = ['Flowers', 'Trees'];
export const SPECIES_ICON = Object.fromEntries(Object.entries(SPECIES).map(([k, d]) => [k, d.sprite]));
/** Old species (v3) → the closest new one. */
export const SPECIES_MIGRATE = { birch: 'oak', cherry: 'sakura', apple: 'appletree', orange: 'appletree', willow: 'oak', baobab: 'oak', cypress: 'pine', deadtree: 'oak', poppy: 'hibiscus', lavender: 'hyacinth', dandelion: 'daisy', lily: 'lotus' };
