// Camera math is independent of rendering so pacing and framing can be tested.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
export const WALK_SPEED=6.2;
export const TURN_RATE=1.35; // radians / second, including the final note turn
export const walkDuration=length=>Math.max(3000,Math.min(18500,length/WALK_SPEED*1000));

// Integral of a raised-cosine velocity ramp: steady pace between soft starts/stops.
export function walkingProgress(t,ramp=.12){
  t=clamp(t);
  if(t<ramp)return (t/2-ramp*Math.sin(Math.PI*t/ramp)/(2*Math.PI))/(1-ramp);
  if(t>1-ramp)return 1-walkingProgress(1-t,ramp);
  return (t-ramp/2)/(1-ramp);
}

export function notePose(stop,reading=false,narrow=false){
  const marker=stop.marker,dx=stop.position[0]-marker[0],dz=stop.position[2]-marker[2];
  const length=Math.hypot(dx,dz)||1,ux=dx/length,uz=dz/length,distance=reading?1.05:2.05;
  const position=[marker[0]+ux*distance,reading?1.6:1.72,marker[2]+uz*distance];
  // Reading composition leaves the note above the mobile panel / left of desktop UI.
  const right=[uz,0,-ux],offset=reading&&!narrow?.12:0;
  const look=[marker[0]+right[0]*offset,marker[1]+.035-(reading&&narrow?.30:0),marker[2]+right[2]*offset];
  return {position,look};
}

export function walkingTarget(curve,u,length,marker){
  const point=curve.getPointAt(u),ahead=curve.getPointAt(Math.min(1,u+3.2/Math.max(length,1)));
  let dx=ahead.x-point.x,dz=ahead.z-point.z;
  if(Math.hypot(dx,dz)<.001){const t=curve.getTangentAt(u);dx=t.x;dz=t.z;}
  const distance=Math.hypot(dx,dz)||1;
  const forward=[dx/distance,-.025,dz/distance];
  const nx=marker[0]-point.x,ny=marker[1]+.035-point.y,nz=marker[2]-point.z,nl=Math.hypot(nx,ny,nz)||1;
  // Only an actual clue motivates the final turn. No arbitrary scenic scans.
  const weight=smooth(1-(1-u)*length/6.5);
  let direction=[forward[0]*(1-weight)+nx/nl*weight,forward[1]*(1-weight)+ny/nl*weight,forward[2]*(1-weight)+nz/nl*weight];
  const dl=Math.hypot(...direction)||1;direction=direction.map(n=>n/dl);
  return [point.x+direction[0]*4,point.y+direction[1]*4,point.z+direction[2]*4];
}

// A person leaving a close note steps around its plinth, never through it.
// Only insert this short sidestep when the direct departure would hit the object.
export function departureWaypoints(stop,from,next,blocked=()=>false){
  if(!stop)return [];
  const m=stop.marker,dx=next[0]-from[0],dz=next[2]-from[2],ll=dx*dx+dz*dz;
  if(ll<.01)return [];
  const t=clamp(((m[0]-from[0])*dx+(m[2]-from[2])*dz)/ll);
  if(t<=0||Math.hypot(from[0]+t*dx-m[0],from[2]+t*dz-m[2])>1.02)return [];
  const l=Math.sqrt(ll),ux=(from[0]-m[0]),uz=(from[2]-m[2]),ul=Math.hypot(ux,uz)||1;
  const options=[];
  for(const sign of [-1,1]){
    const sx=-dz/l*sign,sz=dx/l*sign,bx=ux/ul+sx,bz=uz/ul+sz,bl=Math.hypot(bx,bz);
    if(bl<.1)continue;
    const mid=[m[0]+bx/bl*1.5,1.72,m[2]+bz/bl*1.5],side=[m[0]+sx*1.7,1.72,m[2]+sz*1.7];
    if(blocked(mid)||blocked(side))continue;
    const score=Math.hypot(mid[0]-from[0],mid[2]-from[2])+Math.hypot(side[0]-mid[0],side[2]-mid[2])+Math.hypot(next[0]-side[0],next[2]-side[2]);
    options.push({points:[mid,side],score});
  }
  return options.sort((a,b)=>a.score-b.score)[0]?.points||[];
}
