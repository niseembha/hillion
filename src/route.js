import { mapPoint as p } from './campus-layout.js';
// Seven red marker centers and the intervening black path on the annotated PDF.
// Stops sit slightly before each envelope; all travel remains at eye height.
export const route = [
  { name: 'Brinkmann Field', subtitle: 'From the turf to the heart of campus', object: 'A note out on the field', position: [-44,1.72,65], marker:[-42.5,.91,61.5], look:[-40,1.5,55], via:[[-45,1.72,83],[-44,1.72,74]], duration:4200 },
  { name: 'Phillips Gymnasium / Rotunda', subtitle: 'Past the court, toward the gym', object: 'An envelope by the gym arcade', position:p(790,795), marker:p(802,760,.91), look:p(792,750,1.8), via:[[-39,1.72,49],[-31,1.72,34],[-25,1.72,29],[-25.2,1.72,21]], glance:{target:[-13.5,2,20],start:.52,end:.94,strength:.78}, duration:7800 },
  { name: 'STEM + Innovation Center', subtitle: 'North, then into the courtyard', object: 'A note beside the southern facade', position:p(840,554), marker:p(874,545,.91), look:p(885,530,2.2), via:[p(790,705),p(787,640),p(790,589),p(804,562)], duration:4600 },
  { name: 'Briggs Clocktower', subtitle: 'Into the heart of campus', object: 'An envelope beneath the clocktower', position:p(947,590), marker:p(962,589,.91), look:p(967,610,3.8), via:[p(891,552),p(926,552)], duration:4600 },
  { name: 'Eastern Foote Quadrangle', subtitle: 'Across the quadrangle', object: 'A note on the courtyard limestone', position:p(1117,627), marker:p(1150,614,.91), look:p(1160,607,1.5), via:[p(976,608),p(1014,628),p(1070,637)], duration:4400 },
  { name: 'Fulton Upper School', subtitle: 'Between Fulton and Korenvaes', object: 'An envelope on the north walkway', position:p(1248,501), marker:p(1281,497,.91), look:p(1281,510,1.6), via:[p(1156,599),p(1180,554),p(1215,518)], duration:4900 },
  { name: 'Marshall Performing Arts Center', subtitle: 'The final approach', object: 'One last envelope at MPAC', position:p(1438,587), marker:p(1470,605,.91), look:p(1490,619,2.3), via:[p(1310,501),p(1345,513),p(1390,549)], duration:5000 }
];
export const introShot = {position:[-46,1.9,92],look:[-32,3.2,22]};
export const revealShot = {position:p(1435,605,1.75),look:p(1470,605,1.75)};
