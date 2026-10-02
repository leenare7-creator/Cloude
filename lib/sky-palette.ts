import {cloudState,type CloudSettings} from './cloud-model';

export function skyPalette(s:CloudSettings){
  const visible=s.modelVersion===2?cloudState(s).visibility:cloudState(s).formed?Math.min(1,.08+.92*Math.pow(s.nuclei/65,.7)):0;
  const level=s.skyLevel??(s.layer==='high'?100:s.layer==='mid'?50:0);
  const cover=(s.flow==='spread'?.32:s.flow==='ripple'?.15:.035)*(1-level*.006)*visible*(s.modelVersion===2?.6+(s.growth??35)/125:1);
  const rain=s.rain/100*.52;
  const veil=(s.flow==='spread'?Math.max(0,(level-56)/44)*.23:0)*visible;
  return {top:`rgba(56,84,110,${Math.min(.78,cover+rain).toFixed(3)})`,bottom:`rgba(177,197,212,${Math.min(.7,cover*.62+rain*.8).toFixed(3)})`,veil:`rgba(237,246,249,${veil.toFixed(3)})`};
}

export function skyBackground(s:CloudSettings){
  const p=skyPalette(s);
  return `linear-gradient(180deg,${p.veil},transparent),linear-gradient(180deg,${p.top},${p.bottom}),url('/sky.png')`;
}
