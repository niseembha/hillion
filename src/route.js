import { mapPoint as p } from './campus-layout.js';
// Map fixes placement; source-local clip timestamps establish turns and views.
// See docs/campus-route-reconstruction.md for registration uncertainty.
export const route = [
  { name:'Brinkmann Field', subtitle:'From the sideline toward campus', object:'A note beside the field', position:p(798,1067), marker:p(788,1040,.91), look:p(789,980,2), via:[p(800,1090),p(798,1080)], duration:4200, followPath:true },
  { name:'Phillips Gymnasium / Rotunda', subtitle:'The gym on your left, the covered walk ahead', object:'An envelope beside the glass gym doors', position:p(790,777), marker:p(778,777,.91), look:p(769,777,2), via:[p(798,1000),p(798,946),p(795,915),p(790,878),p(790,821),p(790,792)], glance:{target:p(850,861,2),start:.32,end:.52,strength:.5}, duration:9000, followPath:true },
  { name:'STEM + Innovation Center', subtitle:'North along the covered walk, then east beneath VSI', object:'A note beside the VSI courtyard', position:p(862,558), marker:p(881,550,.91), look:p(908,539,3), via:[p(790,744),p(790,695),p(789,657),p(785,621),p(785,585),p(785,565),p(798,553),p(825,553),p(845,554)], followPath:true, duration:11000 },
  { name:'Briggs Clocktower', subtitle:'Around the oak into Foote Quadrangle', object:'An envelope near the clocktower', position:p(947,590), marker:p(962,601,.91), look:p(987,624,3), via:[p(891,553),p(922,553),p(938,561),p(946,575)], followPath:true, duration:5200 },
  { name:'Eastern Foote Quadrangle', subtitle:'Follow the flagstone walk east', object:'A note on the courtyard limestone', position:p(1124,627), marker:p(1150,614,.91), look:p(1175,607,2), via:[p(976,612),p(1016,620),p(1040,633),p(1070,637),p(1104,634)], followPath:true, surface:'flagstone', duration:6000 },
  { name:'Fulton Upper School', subtitle:'Through the shaded Upper School courtyards', object:'An envelope on the covered courtyard walk', position:p(1271,499), marker:p(1291,501,.91), look:p(1320,501,2), via:[p(1154,610),p(1166,583),p(1167,550),p(1193,521),p(1220,503),p(1245,499)], followPath:true, duration:7000 },
  { name:'Marshall Performing Arts Center', subtitle:'Across the lawn to the limestone overhang', object:'One last envelope at MPAC', position:p(1492,606), marker:p(1501,615,.91), look:p(1515,628,2.5), via:[p(1308,499),p(1338,507),p(1370,534),p(1410,557),p(1452,581),p(1478,593)], followPath:true, duration:7400 }
];
export const introShot = {position:p(800,1100),look:p(708,1085,2)};
export const revealShot = {position:p(1490,606,1.75),look:p(1501,615,1.75)};
