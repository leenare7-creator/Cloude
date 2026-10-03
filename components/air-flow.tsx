"use client";
import {useEffect,useRef} from 'react';
import {cloudState,type CloudSettings} from '@/lib/cloud-model';

// A visual explanation of the model's inputs, rather than a fluid simulation.
export function AirFlow({settings,step}:{settings:CloudSettings;step:number}){
 const canvas=useRef<HTMLCanvasElement>(null),latest=useRef(settings);
 latest.current=settings;
 const state=cloudState(settings);
 const origin=60-settings.height/2500*16;
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
   const rx=Math.min(width*.29,125)*(1-force*.58),ry=26+force*48;
   const alpha=1-condensation*.76;
   ctx.save();ctx.translate(cx,cy);
   // Smoothly deforming transparent parcel with a lit blue rim.
   ctx.beginPath();
   for(let i=0;i<=72;i++){const a=i/72*Math.PI*2,wave=1+Math.sin(a*3+time*2)*.055+Math.cos(a*5-time)*.035;const x=Math.cos(a)*rx*wave,y=Math.sin(a)*ry*wave;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
   ctx.closePath();
   const body=ctx.createRadialGradient(-rx*.2,-ry*.35,2,0,0,rx*1.1);
   body.addColorStop(0,`rgba(178,235,255,${.16*alpha})`);body.addColorStop(.65,`rgba(76,177,236,${.22*alpha})`);body.addColorStop(1,'rgba(168,230,255,0)');
   ctx.fillStyle=body;ctx.fill();ctx.strokeStyle=`rgba(206,245,255,${.48*alpha})`;ctx.lineWidth=1.2;ctx.shadowColor='#9bdcff';ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;
   // Deterministic particle phases: no popping or re-seeding on input changes.
   for(let i=0;i<64;i++){
    const lane=Math.sin(i*12.9898),phase=(time+i*.61803398875)%1;
    const point=(p:number)=>{
     const fan=lane*rx*(.18+p*.95)*(1-force*.6);
     const swirl=Math.sin(p*Math.PI*2+i)*rx*.20*Math.sin(force*Math.PI);
     return {x:fan+swirl,y:ry*.7-p*(ry*1.5+force*18)};
    };
    const p=point(phase),tail=point(Math.max(0,phase-.07));
    const fade=Math.sin(phase*Math.PI)*alpha;
    ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(p.x,p.y);ctx.strokeStyle=`rgba(205,244,255,${fade*.42})`;ctx.lineWidth=1.1;ctx.stroke();
    ctx.beginPath();ctx.arc(p.x,p.y,1.1+(i%3)*.35,0,Math.PI*2);ctx.fillStyle=`rgba(224,250,255,${fade*.8})`;ctx.fill();
   }
   ctx.restore();
   // Cooling turns vapor into droplets on seeds; converge into the existing cloud.
   if(model.cooled&&s.nuclei>0){
    const targetY=height*(.53-s.height/2500*.16),targetX=width*.5;
    const count=Math.ceil(4+s.nuclei*.4),strength=Math.min(1,s.nuclei/20)*condensation;
    for(let i=0;i<count;i++){
     const p=(time*.7+i*.381966)%1,lane=Math.sin(i*9.73);
     const startX=cx+lane*rx*.65,endX=targetX+lane*width*(.10+.10*(1-force));
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
  <div className="air-flow-label" style={{top:`${origin}%`}}><span>{state.visibility>.5?'물방울이 모여': '공기'}</span><small>{step===1?'위로 끌어 봐':state.cooled?(settings.nuclei>0?'씨앗에 물이 맺혀':'씨앗을 기다려'):'공기를 더 올려 봐'}</small></div>
 </div>;
}
