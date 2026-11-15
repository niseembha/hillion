// Traced from references/map-and-route.pdf, rendered at 2200px wide.
// North is -Z, east is +X. One map pixel = 0.12 world units.
export const mapPoint = (x, y, height = 1.72) => [(x - 1000) * 0.12, height, (y - 700) * 0.12];
export const footprints = [
  // Photos show a much wider field and a grass apron before the eastern walkway.
  { name: 'Brinkmann Field', rect: [416.667, 933.333, 750, 1600], field: true },
  { name: 'Phillips Family Gymnasium', rect: [690, 765, 778, 863] },
  { name: 'Phillips Family Athletic Center', rect: [650, 640, 775, 745] },
  { name: 'Ginsburg Natatorium', rect: [610, 640, 650, 725] },
  { name: 'Rotunda', rect: [808, 672, 860, 765] },
  { name: 'Rotunda north wing', rect: [866, 575, 911, 672] },
  { name: 'Levy Middle School', rect: [912, 688, 1030, 736] },
  { name: 'Levy south wing', rect: [912, 736, 958, 816] },
  { name: 'STEM + Innovation Center', rect: [794, 422, 969, 540] },
  { name: 'Crossman Dining Hall', rect: [999, 480, 1132, 560] },
  { name: 'Fulton Upper School', rect: [1180, 572, 1380, 649] },
  { name: 'Fulton north wing', rect: [1245, 515, 1320, 572] },
  { name: 'Korenvaes Upper School', rect: [1192, 396, 1375, 470] },
  { name: 'MPAC', rect: [1478, 580, 1630, 700] },
  { name: 'Fine Arts Building', rect: [1064, 683, 1138, 815] },
  { name: 'Montgomery Library', rect: [1180, 720, 1278, 798] }
].map(item => ({ ...item, minX: mapPoint(item.rect[0],0)[0], maxX: mapPoint(item.rect[2],0)[0], minZ: mapPoint(0,item.rect[1])[2], maxZ: mapPoint(0,item.rect[3])[2] }));
