// A compact interpretation of the references, not a survey of the actual campus.
// Eye-height camera stops and safe, outdoor waypoints keep movement fully guided.
export const route = [
  { name: 'The amphitheater', subtitle: 'Where the story begins', object: 'A note on the limestone', position: [0, 1.72, 17], look: [-1.3, 1.45, 4.5], marker: [-1.3, 0.91, 7.4], via: [[1, 1.72, 25], [0, 1.72, 21]], duration: 4200 },
  { name: 'The glass courtyard', subtitle: 'A different perspective', object: 'An envelope by the window', position: [18, 1.72, -4], look: [25, 2.1, -16], marker: [23.8, 1.08, -13], via: [[10, 1.72, 16], [17, 1.72, 9], [18, 1.72, 1]], duration: 5200 },
  { name: 'The breezeway', subtitle: 'Follow the light', object: 'A note beneath the bridge', position: [9, 1.72, -25], look: [-3, 1.8, -30], marker: [-1.6, 1.03, -29.4], via: [[16, 1.72, -12], [16, 1.72, -20]], duration: 4600 },
  { name: 'Under the oaks', subtitle: 'A moment in the shade', object: 'Something left on the bench', position: [-12, 1.72, -24], look: [-21, 1.8, -20], marker: [-20.3, 0.97, -22], via: [[1, 1.72, -26], [-6, 1.72, -26]], duration: 4600 },
  { name: 'The gathering stones', subtitle: 'A familiar little corner', object: 'An envelope on the stone', position: [-24, 1.72, -9], look: [-26, 1.4, 1], marker: [-25.1, 0.85, -1.5], via: [[-17, 1.72, -20], [-24, 1.72, -16]], duration: 4400 },
  { name: 'The timber atrium', subtitle: 'A little closer now', object: 'A note at the foot of the stairs', position: [-21, 1.72, 14], look: [-24, 2.4, 26], marker: [-23.5, 1.02, 22], via: [[-22, 1.72, -4], [-19, 1.72, 4], [-20, 1.72, 10]], duration: 4900 },
  { name: 'The last courtyard', subtitle: 'Every clue leads to someone', object: 'One last envelope', position: [-4, 1.72, 29], look: [2, 1.7, 34], marker: [0.1, 0.95, 33], via: [[-20, 1.72, 10], [-11.5, 1.72, 10], [-8, 1.72, 21]], duration: 5000 }
];
export const introShot = { position: [5, 1.9, 28.5], look: [0, 3.5, -7] };
export const revealShot = { position: [2, 1.75, 29.3], look: [2, 1.75, 33.8] };
