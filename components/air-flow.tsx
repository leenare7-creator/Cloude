"use client";
import {useEffect,useRef} from 'react';
import {cloudState,type CloudSettings} from '@/lib/cloud-model';

// A visual explanation of the model's inputs, rather than a fluid simulation.
export function AirFlow({settings}:{settings:CloudSettings}){
 const canvas=useRef<HTMLCanvasElement>(null),latest=useRef(settings);
 latest.current=settings;
 const state=cloudState(settings);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  const ctx=el.getContext('2d');if(!ctx)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 790px)');
  let width=1,height=1,frame=0,last=0,time=0,force=latest.current.energy/100,condensation=cloudState(latest.current).visibility;
  const resize=()=>{const box=el.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,2);el.width=Math.round(width*dpr);el.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const draw=(now:number)=>{
   const dt=Math.min((now-last)/1000||0, .05);last=now;
   const s=latest.current,model=cloudState(s),blend=1-Math.exp(-dt*12);
   force+=(s.energy/100-force)*blend;condensation+=(model.visibility-condensation)*blend;
   if(!document.hidden&&!motion.matches)time+=dt*(.22+force*.5);
   ctx.clearRect(0,0,width,height);
   const cx=width*(mobile.matches?.43:.5),cy=height*(.60-s.height/2500*.16);
   const sourceSpan=Math.min(width*.13,52)*(1-force*.45),baseY=cy+height*.10;
   const rise=Math.min(height*(.12+force*.36),baseY-65);
   const spread=Math.min(width*.28,145)*Math.pow(1-force,1.6)+7;
   const alpha=1-condensation*.80;
   // Open streamlines start across a band, never at a bright point or boundary.
   // Stable phases and continuous geometry avoid popping as strength changes.
   for(let i=0;i<36;i++){
    const lane=(i/35-.5)*2,seed=Math.sin(i*19.73),phase=(time+i*.61803398875)%1;
    const point=(t:number)=>{
     const outward=lane*spread*Math.pow(t,1.35);
     const curl=Math.sin(t*3.6+time*.4+seed*2)*Math.sin(t*Math.PI)*(8+10*(1-force));
     const x=cx+lane*sourceSpan+outward+curl;
     const y=baseY-rise*t+Math.sin(t*4+seed)*Math.sin(t*Math.PI)*(5+9*(1-force))+seed*6;
     return {x,y};
    };
    const path=(from:number,to:number)=>{
     ctx.beginPath();for(let j=0;j<=20;j++){const p=point(from+(to-from)*j/20);if(j===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)}
    };
    // A diffuse full strand supplies the visible shape. Brightness travels along it.
    path(0,1);const start=point(0),end=point(1);
    const haze=ctx.createLinearGradient(start.x,start.y,end.x,end.y);
    haze.addColorStop(0,'rgba(214,240,255,0)');haze.addColorStop(.25,`rgba(214,240,255,${alpha*.035})`);haze.addColorStop(.7,`rgba(214,240,255,${alpha*.055})`);haze.addColorStop(1,'rgba(214,240,255,0)');
    ctx.strokeStyle=haze;ctx.lineWidth=9;ctx.lineCap='round';ctx.stroke();
    const from=Math.max(0,phase-.38),to=phase,tail=point(from),head=point(to);
    if(to-from<.002)continue;
    path(from,to);
    const streak=ctx.createLinearGradient(tail.x,tail.y,head.x,head.y),fade=Math.sin(phase*Math.PI)*alpha;
    streak.addColorStop(0,'rgba(239,249,255,0)');streak.addColorStop(.45,`rgba(239,249,255,${fade*.30})`);streak.addColorStop(.85,`rgba(239,249,255,${fade*.20})`);streak.addColorStop(1,'rgba(239,249,255,0)');
    ctx.strokeStyle=streak;ctx.lineWidth=.85+(i%3)*.28;ctx.shadowColor='rgba(208,237,255,.3)';ctx.shadowBlur=3;ctx.stroke();ctx.shadowBlur=0;
   }
   // Cooling turns vapor into droplets on seeds; converge into the existing cloud.
   if(model.cooled&&s.nuclei>0){
    const targetY=height*(.53-s.height/2500*.16),targetX=width*.5;
    const count=Math.ceil(4+s.nuclei*.4),strength=Math.min(1,s.nuclei/20)*condensation;
    for(let i=0;i<count;i++){
     const p=(time*.7+i*.381966)%1,lane=Math.sin(i*9.73);
     const startX=cx+lane*sourceSpan,endX=targetX+lane*width*(.10+.10*(1-force));
     const x=startX+(endX-startX)*p,y=cy+(targetY-cy)*p-Math.sin(p*Math.PI)*18;
     const fade=Math.sin(p*Math.PI)*strength;
     ctx.beginPath();ctx.arc(x,y,1+p*2,0,Math.PI*2);ctx.fillStyle=`rgba(239,250,255,${fade*.65})`;ctx.fill();
    }
   }
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);observer.disconnect()};
 },[]);
 return <div className={`air-flow-graphic${state.visibility>.5?' is-condensing':''}`} aria-label={`공기 흐름: 솟는 힘 ${settings.energy}, ${state.formed?'물방울이 구름으로 모이는 중':state.cooled?'차가워진 공기':'올라가는 공기'}`}>
  <canvas ref={canvas} aria-hidden="true"/>
  <svg className="air-flow-rise-arrow" viewBox="0 0 24 28" aria-hidden="true" style={{top:`calc(${70-settings.height/2500*16}% - 8px)`,opacity:.58*(1-state.visibility*.8)}}><path d="M12 1 2 12 H8 V27 H16 V12 H22 Z"/></svg>

 </div>;
}
