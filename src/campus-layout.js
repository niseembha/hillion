// Map authority: references/map-and-route.pdf, rendered 2200 × 1700.
// North = -Z; east = +X. Scale is illustrative, NOT a metric survey.
// Architecture pass: retain every map coordinate and double horizontal scale.
// The earlier .12 scale halved the open space around eye-height architecture.
export const MAP_SCALE = 0.24;
// Ground occupancy excludes open, roofed passages seen in clips 04 and 09.
export const mapPoint = (x, y, height = 1.72) => [(x - 1000) * MAP_SCALE, height, (y - 700) * MAP_SCALE];
export const footprints = [
  { name:'Brinkmann Field', rect:[670,935,795,1266], field:true },
  { name:'Phillips Family Gymnasium', rect:[690,762,775,862], custom:true },
  { name:'Phillips Family Athletic Center', rect:[650,638,775,762], height:7.4 },
  { name:'Ginsburg Natatorium', rect:[608,640,650,725], height:6 },
  { name:'Rotunda', rect:[807,670,857,765] },
  { name:'Rotunda north wing', rect:[866,575,911,672] },
  { name:'Rotunda cross wing', rect:[857,680,912,714] },
  { name:'Levy Middle School', rect:[912,688,1030,736] },
  { name:'Levy south wing', rect:[912,736,958,816] },
  { name:'STEM + Innovation Center', rect:[794,422,960,545], custom:true, height:8.2 },
  { name:'STEM southwest wing', rect:[794,570,819,632], custom:true, height:8.2 },
  { name:'Crossman Dining Hall', rect:[999,480,1132,560], height:6 },
  { name:'Fulton Upper School', rect:[1180,572,1380,649] },
  { name:'Fulton north wing', rect:[1245,515,1320,572] },
  { name:'Korenvaes Upper School', rect:[1192,396,1375,470] },
  // Western limestone volume overhangs a recessed ground-floor lobby.
  { name:'MPAC', rect:[1508,580,1630,700], canopy:[1478,580,1508,700], custom:true },
  { name:'Fine Arts Building', rect:[1064,683,1138,815] },
  { name:'Montgomery Library', rect:[1180,720,1278,798] }
].map(item => ({...item, minX:mapPoint(item.rect[0],0)[0], maxX:mapPoint(item.rect[2],0)[0], minZ:mapPoint(0,item.rect[1])[2], maxZ:mapPoint(0,item.rect[3])[2]}));
export const landmarks = {
  clocktower:mapPoint(1007,637,0),
  basketball:[805,835,895,910],
  vsiPassage:[788,545,832,568],
  upperCourt:[1237,477,1340,513]
};
