// Development-only comparison cameras. Map pixels at the 2200px PDF render.
// Positions are approximate map registrations, NOT GPS or surveyed measurements.
import { mapPoint as p } from './campus-layout.js';
export const surveyViews = [
  { id:'field-north', clip:'01', seconds:20, point:[795,900], aim:[795,785,2.3], confidence:'medium', description:'Northbound: gym left, basketball lawn right, entrance canopy ahead.' },
  { id:'gym-doors', clip:'02', seconds:4, point:[790,777], aim:[770,777,2.1], confidence:'high', description:'East-facing glazed athletic entrance, seen across covered walk.' },
  { id:'covered-walk', clip:'03', seconds:4, point:[783,737], aim:[783,600,1.9], confidence:'high', description:'Northbound: athletic wall left, brick posts and planting right.' },
  { id:'vsi-turn', clip:'04', seconds:18, point:[785,601], aim:[792,548,2.1], confidence:'medium', description:'North beside VSI west wall; parking left, modern building right.' },
  { id:'vsi-soffit', clip:'04', seconds:28, point:[806,553], aim:[935,553,1.9], confidence:'medium', description:'East under timber soffit; VSI glazing left, low Rotunda wing right.' },
  { id:'vsi-court', clip:'04', seconds:48, point:[895,553], aim:[974,553,2], confidence:'high', description:'East: finned VSI facade left, tables and oak right, dining wall ahead.' },
  { id:'clock-approach', clip:'05', seconds:30, point:[958,591], aim:[1007,637,3], confidence:'medium', description:'Clocktower ahead at the turn into the quadrangle.' },
  { id:'quad-east', clip:'05', seconds:48, point:[1053,631], aim:[1168,610,2], confidence:'medium', description:'Flagstone walk toward the low covered Upper School frontage.' },
  { id:'upper-court', clip:'08', seconds:6, point:[1280,499], aim:[1348,499,2], confidence:'low', description:'Approximate north Fulton court: brick paving, trees, tables, covered exit.' },
  { id:'mpac-lawn', clip:'09', seconds:18, point:[1388,544], aim:[1482,595,5], confidence:'medium', description:'Southeast approach across lawn toward cantilevered MPAC, parking left.' },
  { id:'mpac-entry', clip:'09', seconds:40, point:[1492,607], aim:[1502,690,2.2], confidence:'medium', description:'South under limestone cantilever; recessed glass left, slim columns ahead.' }
].map(view => ({...view, position:p(...view.point), look:p(...view.aim)}));
