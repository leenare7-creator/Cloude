"use client";
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {BookOpen,Plus,Minus,RotateCcw,Sun,Moon,Hand,Cloud,RefreshCcw,Download,Copy,CloudSun} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {SkyBuilder} from '@/components/sky-builder';
import {CloudThree} from '@/components/cloud-three';
import {AirFlow} from '@/components/air-flow';
import {CloudSettings,DEFAULT_CLOUD,CLOUD_TYPES,cloudState,cloudStory,cloudInfluences,deriveCloud,liftName,stabilityName,growthName,type LiftSource} from '@/lib/cloud-model';
import {drawCloud,subscribeCloudTexture} from '@/lib/cloud-render';
import {cloudPngBlob} from '@/lib/cloud-export';
import {skyBackground} from '@/lib/sky-palette';

type RecordCloud=CloudSettings&{id:number;maker:string;decoration:string;createdAt:string};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const chapters=[
  {icon:'💧',name:'물 모으기',title:'하늘에 물을 모아 줘',copy:'하늘을 손가락으로 쓸어 봐. 눈에 보이지 않는 물이 조금씩 모여.',action:'하늘을 쓸어 물을 모으기',tip:'물이 많으면 구름이 더 쉽게 생겨.'},
  {icon:'↑',name:'공기 올리기',title:'무엇이 공기를 움직일까?',copy:'공기를 움직이는 원인을 골라 봐. 하늘 왼쪽을 위로 쓸어 공기를 올리고, 오른쪽을 위아래로 쓸어 솟는 힘을 바꿔 봐.',action:'공기를 끌고, 오른쪽에서 솟는 힘 바꾸기',tip:'햇볕은 공기를 위로 솟게 하고, 찬 공기는 넓게 밀어 올려. 산과 밤, 높은 하늘도 각자 다른 움직임을 만들어.'},
  {icon:'✧',name:'씨앗 뿌리기',title:'구름의 씨앗을 뿌려 줘',copy:'하늘을 톡톡 눌러 작은 입자를 뿌려 봐. 물방울이 달라붙을 자리가 생겨.',action:'하늘을 톡톡 눌러 씨앗 뿌리기',tip:'씨앗은 구름 알갱이의 수와 결에 보탬이 돼. 솟거나 퍼지는 방향은 앞에서 고른 공기의 움직임이 정해.'},
  {icon:'〰',name:'바람과 시간',title:'바람을 불고 구름을 키워 봐',copy:'하늘을 좌우로 쓸면 바람이 바뀌어. 위아래로 쓸면 구름이 자라는 시간이 달라져.',action:'좌우로 바람, 위아래로 시간',tip:'바람은 구름을 옆으로 늘이고, 자란 시간은 덩이의 폭과 두께를 바꿔.'},
  {icon:'☁',name:'결과 보기',title:'내 구름이 자란 이야기를 봐',copy:'앞에서 만든 조건이 어떤 구름으로 이어졌는지 살펴봐. 해와 시점을 움직이고 별명을 적어 도서관에 올려.',action:'구름을 둘러보고 이야기를 읽기',tip:'구름 모양과 비는 공기가 움직이고 물방울이 자란 결과야.'},
];
const typeName=(id:CloudSettings["cloudType"])=>CLOUD_TYPES.find(t=>t.id===id)?.name||"적운";
const weatherClass=(s:CloudSettings)=>!cloudState(s).formed?(s.layer==='high'?'high-sky':'clear-sky'):s.rain>20?'storm-sky':s.cloudType==='altostratus'||s.cloudType==='stratus'||s.cloudType==='stratocumulus'?'overcast-sky':s.cloudType==='cirrostratus'?'veiled-sky':s.layer==='high'?'high-sky':'clear-sky';
const sources:{id:LiftSource;icon:string;label:string}[]=[{id:'sun',icon:'☀',label:'햇볕'},{id:'front',icon:'↗',label:'찬 공기'},{id:'mountain',icon:'△',label:'산'},{id:'night',icon:'☾',label:'밤'},{id:'upper',icon:'✧',label:'높은 하늘'}];
function storyEffect(step:number,s:CloudSettings){
 const state=cloudState(s),source=s.liftSource??'sun';
 if(step===0)return {title:`물 ${s.humidity}%`,description:'물기가 많을수록 올라가며 식은 공기가 구름을 만들기 쉬워져.'};
 if(step===1)return {title:`${liftName(source)} · ${s.height.toLocaleString()}m · ${stabilityName(s.energy)}`,description:state.cooled?'공기가 움직이며 식었어. 움직이는 원인과 솟는 힘이 구름의 높이와 모양에 영향을 줘.':'공기를 더 높이 올리면 식으면서 물이 모일 수 있어.'};
 if(step===2)return {title:`씨앗 ${s.nuclei}개`,description:state.formed?'씨앗이 늘면 물방울이 맺힐 자리가 늘고, 구름의 크기와 작은 결이 조금씩 달라져.':'물을 모으고 공기를 더 높이 올려야 변화가 보이기 시작해.'};
 if(step===3)return {title:`바람 ${s.wind} · ${growthName(s.growth??35)}`,description:state.formed?`바람이 ${typeName(s.cloudType)}을(를) 옆으로 늘이고, 자란 시간이 두께를 바꿔. 구름 종류에 따라 변화의 폭은 달라.`:'아직 구름이 생기지 않았어. 물과 높이, 씨앗을 먼저 살펴봐.'};
 return {title:state.formed?`${typeName(s.cloudType)} 완성!`:'구름을 만드는 중',description:state.formed?`${cloudStory(s)} ${s.rain>0?'물방울이 커져 비도 내려.':'지금은 비가 내리지 않아.'}`:'물을 모으고, 공기를 올리고, 씨앗을 뿌려 봐.'};
}
const colors=[{name:'하얀빛',hex:'#f5f8fa'},{name:'노을빛',hex:'#ffe0bc'},{name:'새벽빛',hex:'#e1e8f4'},{name:'회색빛',hex:'#aab9c9'},{name:'분홍빛',hex:'#f7dce8'}];
function CloudCanvas({settings,small=false,preview=false}:{settings:CloudSettings;small?:boolean;preview?:boolean}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const canvas=ref.current;if(!canvas)return;let cancelled=false,visible=!small;const render=()=>{if(!cancelled&&visible)drawCloud(canvas,settings,small||preview)};const frame=requestAnimationFrame(render);const unsubscribe=subscribeCloudTexture(render);const observer=small?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;if(visible)render()},{rootMargin:'160px'}):null;observer?.observe(canvas);return()=>{cancelled=true;cancelAnimationFrame(frame);unsubscribe();observer?.disconnect()}},[settings,small,preview]);
  return <canvas ref={ref} className="cloud-canvas" role="img" aria-label={`${settings.angle}도 시점에서 본 구름`}/>;
}

function StageCloud({settings,interactive=false}:{settings:CloudSettings;interactive?:boolean}){
  const [threeReady,setThreeReady]=useState(false);
  const [showRendererStatus,setShowRendererStatus]=useState(false);
  useEffect(()=>setShowRendererStatus(new URLSearchParams(window.location.search).has('cloudDebug')),[]);
  const ready=useCallback((value:boolean)=>setThreeReady(value),[]);
  return <div className={`stage-cloud-stack${threeReady?' is-three-ready':''}`}>
    <div className={`stage-cloud-fallback${threeReady?' is-hidden':''}`}><CloudCanvas settings={settings} preview={interactive}/></div>
    <CloudThree settings={settings} interactive={interactive} onReady={ready}/>
    {showRendererStatus&&<span className="cloud-renderer-debug">{threeReady?'Three.js 구름':'기본 구름 표시 중'}</span>}
  </div>;
}

function RainLayer({settings,small=false}:{settings:CloudSettings;small?:boolean}){
  if(!cloudState(settings).formed||settings.rain===0)return null;
  const count=Math.round(settings.rain*(small?.25:.45));
  return <div className="rain-layer" aria-label={`비의 양 ${settings.rain}`} aria-hidden="true">{Array.from({length:count},(_,i)=>{
    const hash=(n:number)=>{const v=Math.sin(n*91.73+23.61)*43758.5453;return v-Math.floor(v)};
    return <i key={i} style={{left:`${10+hash(i+11)*80}%`,top:`${hash(i+67)*60}%`,animationDelay:`-${hash(i+123)*1.1}s`,animationDuration:`${.55+hash(i+177)*.45}s`}}/>;
  })}</div>;
}
function LiftScene({source}:{source:LiftSource}){
  return <div className="lift-scenes" aria-hidden="true">
    {sources.map(item=><div key={item.id} className={`lift-scene lift-scene-${item.id}${source===item.id?' active':''}`}/>)}
  </div>;
}
function GalleryCard({cloud,onOpen}:{cloud:RecordCloud;onOpen:()=>void}){return <article className="gallery-card"><button className="gallery-card-button" onClick={onOpen} aria-label={`${cloud.maker}의 구름 크게 보기`}><div className={`gallery-art ${weatherClass(cloud)}`} style={{backgroundImage:skyBackground(cloud)}}><LiftScene source={cloud.liftSource??'sun'}/><CloudCanvas settings={cloud} small/><RainLayer settings={cloud} small/></div><div className="gallery-meta"><strong>{cloud.maker}의 {typeName(cloud.cloudType)}</strong><span>물 {cloud.humidity}% · 높이 {cloud.height.toLocaleString()}m · 씨앗 {cloud.nuclei}{cloud.rain>0?` · 비 ${cloud.rain}`:''}</span></div></button></article>}
function InfluenceCard({settings,compact=false}:{settings:CloudSettings;compact?:boolean}){
 const items=cloudInfluences(settings);
 return <section className={`influence-card${compact?' compact':''}`} aria-label={`${typeName(settings.cloudType)}을 만든 주요 조건`}><div className="influence-heading"><div><span>WHY THIS CLOUD?</span><strong>왜 {typeName(settings.cloudType)}이 되었을까?</strong></div><small>위에 있을수록 더 크게 작용했어.</small></div><div className="influence-list">{items.map((item,index)=><div className="influence-item" key={`${item.label}-${index}`}><div className="influence-rank">{index+1}</div><div className="influence-copy"><strong>{item.label}<b>{item.value}</b></strong><p>{item.reason}</p></div><span className={`impact impact-${item.level.replace(' ','-')}`}>{item.level}</span></div>)}</div><p className="influence-note">구름 씨앗·바람처럼 종류를 직접 바꾸지 않아도 결, 크기, 비의 양을 바꾸는 조건이 있어.</p></section>;
}
const liftStrengthLabel=(energy:number)=>energy<34?'옆으로 퍼지려 해':energy<68?'조금씩 올라가':'높이 솟으려 해';
function Sky({step,settings,onChange,onVisitStep}:{step:number;settings:CloudSettings;onChange:(patch:Partial<CloudSettings>)=>void;onVisitStep:(step:number)=>void}){
  const stage=useRef<HTMLDivElement>(null),active=useRef(false),last=useRef<{x:number;y:number}>({x:0,y:0}),start=useRef<{x:number;y:number}>({x:0,y:0}),gesture=useRef<'water'|'height'|'seed'|'sun'|'pending'|'orbit'|'flow'|'level'|null>(null),gestureValue=useRef(0),windAtDown=useRef(67),levelAtDown=useRef(0),levelSensitivity=useRef(135),touches=useRef<Map<number,{x:number;y:number}>>(new Map()),pinch=useRef<number|null>(null);
  const [drawing,setDrawing]=useState(false),[mode,setMode]=useState<'add'|'remove'>('add');
  const state=cloudState(settings);
  const [colorsOpen,setColorsOpen]=useState(false);
  const missingStep=settings.humidity===0?0:!state.cooled?1:settings.nuclei===0?2:null;
  const norm=(e:React.PointerEvent)=>{const r=stage.current!.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)}};
  const pendingPatch=useRef<Partial<CloudSettings>>({}),patchFrame=useRef(0),changeRef=useRef(onChange);
  changeRef.current=onChange;
  const queueChange=(patch:Partial<CloudSettings>)=>{Object.assign(pendingPatch.current,patch);if(!patchFrame.current)patchFrame.current=requestAnimationFrame(()=>{patchFrame.current=0;const next=pendingPatch.current;pendingPatch.current={};changeRef.current(next)})};
  useEffect(()=>()=>cancelAnimationFrame(patchFrame.current),[]);
  const puff=(x:number,y:number)=>{const root=stage.current;if(!root)return;const node=document.createElement('span');node.className=`spark ${step===0?'drop':'seed'}`;node.style.left=`${x*100}%`;node.style.top=`${y*100}%`;node.textContent=step===0?'💧':'✧';node.setAttribute('aria-hidden','true');root.appendChild(node);node.addEventListener('animationend',()=>node.remove(),{once:true});setTimeout(()=>node.remove(),1900);while(root.querySelectorAll('.spark').length>24)root.querySelector('.spark')?.remove()};
  const interact=(e:React.PointerEvent,first=false)=>{
    const p=norm(e);
    if(step===0||(step===2&&gesture.current==='seed')){
      const distance=Math.hypot(p.x-last.current.x,p.y-last.current.y);
      // A full-width sweep adds about 13% water or 16 seeds, with no event-rate dependency.
      const spacing=step===0?.085:.065,key=step===0?'humidity':'nuclei';
      gestureValue.current=clamp(gestureValue.current+(mode==='add'?1:-1)*(first?1:distance/spacing),0,100);
      queueChange({[key]:Math.round(gestureValue.current)});
      if(first)puff(p.x,p.y);
      else if(distance>0){const count=Math.min(8,Math.max(1,Math.ceil(distance/.018)));for(let i=1;i<=count;i++)puff(last.current.x+(p.x-last.current.x)*i/count,last.current.y+(p.y-last.current.y)*i/count)}
    }else if(step===1){
      if(gesture.current==='level'&&!first){const totalY=p.y-start.current.y;onChange({energy:Math.round(clamp(levelAtDown.current-totalY*levelSensitivity.current,0,100))})}
      else if(gesture.current==='height')onChange({height:Math.round(clamp((.55-p.y)/.40,0,1)*2500)});
    }else if(step===3&&!first){
      const totalX=p.x-start.current.x,totalY=p.y-start.current.y;
      if(gesture.current==='level'||(gesture.current==='pending'&&Math.abs(totalY)>Math.abs(totalX)*1.15)){
        gesture.current='level';const value=Math.round(clamp(levelAtDown.current-totalY*levelSensitivity.current,0,100));
        onChange({growth:value});
      }else if(gesture.current==='flow'||Math.abs(totalX)>.012){
        gesture.current='flow';onChange({wind:Math.round(clamp(windAtDown.current+totalX*125,0,100))});
      }
    }else if(step===4&&gesture.current==='sun'){
      onChange({lightX:Math.round(p.x*100),shadow:Math.round(clamp((p.y-.08)/.52,0,1)*100)});
    }else if(step===4){
      if(gesture.current==='pending'&&Math.hypot(p.x-start.current.x,p.y-start.current.y)>.015)gesture.current='orbit';
      if(gesture.current==='orbit')onChange({angle:((Math.round(settings.angle+(p.x-last.current.x)*360)%360)+360)%360});
    }
    last.current=p;
  };
  const down=(e:React.PointerEvent)=>{
    e.preventDefault();stage.current?.setPointerCapture(e.pointerId);
    const p=norm(e);touches.current.set(e.pointerId,p);
    if(touches.current.size===2){const a=[...touches.current.values()];pinch.current=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);return}
    active.current=true;setDrawing(true);last.current=p;start.current=p;
    gestureValue.current=step===0?settings.humidity:settings.nuclei;
    const rail=(e.target as HTMLElement).closest('.sky-height-rail,.mobile-lift-swipe-zone');
    levelAtDown.current=step===1?settings.energy:settings.growth??35;
    windAtDown.current=settings.wind;
    levelSensitivity.current=rail?100*stage.current!.getBoundingClientRect().height/rail.getBoundingClientRect().height:135;
    gesture.current=step===0?'water':step===1?(rail?'level':'height'):step===2?'seed':step===3?(rail?'level':'pending'):(e.target as HTMLElement).closest('.sun-handle')?'sun':'pending';
    if(gesture.current!=='level')interact(e,true);
  };
  const move=(e:React.PointerEvent)=>{const p=norm(e);touches.current.set(e.pointerId,p);if(touches.current.size===2&&step===4){const a=[...touches.current.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch.current!==null){onChange({depth:Math.round(clamp(settings.depth+(d-pinch.current)*130,0,100))})}pinch.current=d;return}if(active.current)interact(e)};
  const up=(e:React.PointerEvent)=>{touches.current.delete(e.pointerId);pinch.current=null;active.current=false;setDrawing(false);gesture.current=null;if(stage.current?.hasPointerCapture(e.pointerId))stage.current.releasePointerCapture(e.pointerId)};
  const wheel=(e:React.WheelEvent)=>{if(step!==4)return;e.preventDefault();onChange({depth:Math.round(clamp(settings.depth-e.deltaY*.08,0,100))})};
  return <>
  <div className={`sky-stage step-${step} ${weatherClass(settings)}`} ref={stage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel} aria-label="직접 조작하는 나의 하늘" style={{backgroundImage:skyBackground(settings)}}>
    {step>=1&&<LiftScene source={settings.liftSource??'sun'}/>}
    <div className="sky-readouts"><span>물 {settings.humidity}%</span><span>높이 {settings.height.toLocaleString()}m</span><span>씨앗 {settings.nuclei}</span>{step===1&&<span aria-label={`솟는 힘 ${settings.energy}, ${liftStrengthLabel(settings.energy)}`}>솟는 힘 {settings.energy}</span>}{settings.rain>0&&<span>비 {settings.rain}</span>}</div>
    {step===1&&<div className="altitude-guide"><span>높이</span><span>0m</span></div>}

    <div className="cloud-position" style={{top:`${53-settings.height/2500*16}%`}}><StageCloud settings={settings} interactive={drawing}/><RainLayer settings={settings}/></div>
    {(step===1||step===2)&&<AirFlow settings={settings}/>}

    {step===4&&<div className="sun-handle" style={{left:`${settings.lightX}%`,top:`${8+settings.shadow*.52}%`}} aria-label="빛을 끌어 그림자 바꾸기">{settings.liftSource==='night'?<Moon size={22}/>:<Sun size={22}/>}<span>빛</span></div>}
    {(step===1||step===3)&&<div className="sky-height-rail" role="slider" tabIndex={0} aria-label={step===1?'공기를 위로 밀어 올리는 힘':'구름이 자란 시간'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={step===1?settings.energy:settings.growth??35} onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const key=step===1?'energy':'growth';onChange({[key]:clamp((step===1?settings.energy:settings.growth??35)+(e.key==='ArrowUp'?2:-2),0,100)})}}}><span>{step===1?'세게 솟아':'오래 자랐어'}</span><i className="rail-line"><b style={{bottom:`${step===1?settings.energy:settings.growth??35}%`}}/></i><span>{step===1?'조금씩 올라':'자라는 중'}</span><span>{step===1?'옆으로 퍼져':'막 생겼어'}</span></div>}
    {(step===1||step===3)&&<div className={`mobile-swipe-guide vertical${step===1?' mobile-lift-swipe-zone':''}`} aria-label={step===1?'오른쪽 하늘을 위아래로 쓸어 솟는 힘 조절':'하늘을 위아래로 쓸어 자라는 시간 조절'}><div className="swipe-guide-visual"><span>{step===1?'세게 솟아':'오래 자라'}</span><svg className="swipe-direction-arrow" viewBox="0 0 48 104" aria-hidden="true"><path d="M24 2 3 25 Q1 28 5 28 H17 V76 H5 Q1 76 3 79 L24 102 45 79 Q47 76 43 76 H31 V28 H43 Q47 28 45 25 Z"/></svg><span>{step===1?'옆으로 퍼져':'조금 자라'}</span></div></div>}
    {step===3&&<div className="mobile-swipe-guide horizontal"><svg className="swipe-direction-arrow" viewBox="0 0 104 48" aria-hidden="true"><path d="M2 24 25 3 Q28 1 28 5 V17 H76 V5 Q76 1 79 3 L102 24 79 45 Q76 47 76 43 V31 H28 V43 Q28 47 25 45 Z"/></svg><span>좌우로 쓸어 바람 바꾸기</span></div>}
    {step===3&&<div className="wind-hint" aria-hidden="true"><span>← 바람 약하게</span><i><b style={{left:`${settings.wind}%`}}/></i><span>세게 →</span></div>}
    {step===4&&<div className={`sky-colors${colorsOpen?' expanded':''}`} onPointerDown={e=>e.stopPropagation()}><button className="color-panel-toggle" aria-expanded={colorsOpen} onClick={()=>setColorsOpen(!colorsOpen)}><i style={{background:settings.color}}/> 구름 색 {colorsOpen?'접기':'바꾸기'}</button>{colorsOpen&&<div className="colors">{colors.map(c=><button key={c.hex} className={settings.color===c.hex?'picked':''} title={c.name} aria-label={c.name} aria-pressed={settings.color===c.hex} style={{background:c.hex}} onClick={()=>onChange({color:c.hex})}/>)}<label className="custom-color" title="직접 색 고르기">+<input type="color" aria-label="직접 색 고르기" value={settings.color} onChange={e=>onChange({color:e.target.value})}/></label></div>}</div>}

    {(step===0||step===2)&&<div className="sky-mode" onPointerDown={e=>e.stopPropagation()}><button className={mode==='add'?'active':''} onClick={()=>setMode('add')} aria-pressed={mode==='add'}><Plus size={16}/> 더하기</button><button className={mode==='remove'?'active':''} onClick={()=>setMode('remove')} aria-pressed={mode==='remove'}><Minus size={16}/> 빼기</button></div>}
    {step>=2&&missingStep!==null&&missingStep<step&&<div className="cloud-needs-help" onPointerDown={e=>e.stopPropagation()} role="status"><strong>{missingStep===0?'구름이 될 물을 먼저 모아 줘.':missingStep===1?`공기를 올려야 구름이 생겨. 지금은 ${settings.height.toLocaleString()}m야.`:'물방울이 맺힐 씨앗을 뿌려 줘.'}</strong><button onClick={()=>onVisitStep(missingStep)}>{missingStep===0?'물 모으러 가기':missingStep===1?'공기 올리러 가기':'씨앗 뿌리러 가기'} →</button></div>}
    <div className="sky-caption">{step===0?'물을 천천히 모아 보자':step===1?(state.formed?'물방울이 모여 구름이 됐어!':state.cooled?'공기가 식었어! 씨앗을 기다려':'공기를 더 높이 올려 보자'):step===2?(state.formed?'구름이 생겼어!':state.cooled?'씨앗을 기다리는 중!':'공기를 더 높이 올려 보자'):step===3?(state.formed?`${typeName(settings.cloudType)} 모양으로 자라고 있어!`:`이 조건에서 ${typeName(settings.cloudType)}이(가) 될 수 있어`):settings.rain>0?'물방울이 모여 비가 내려!':'내 구름을 둘러봐'}</div>
  </div>

  </>
}
function GestureCopy({step,action=false}:{step:number;action?:boolean}){
 const mobile=step===1?(action?'공기를 위로 쓸어 높이, 오른쪽 하늘을 쓸어 솟는 힘 바꾸기':'공기를 위로 스와이프하면 더 높이 올라가. 오른쪽 하늘 어디에서든 위아래로 쓸면 솟는 힘이 바뀌어.'):step===3?(action?'좌우로 스와이프해 바람, 위아래로 스와이프해 자란 시간 바꾸기':'하늘을 좌우로 스와이프하면 바람이 바뀌어. 위아래로 스와이프하면 구름이 자란 시간이 바뀌어.'):null;
 const text=action?chapters[step].action:chapters[step].copy;
 return mobile?<><span className="desktop-gesture-copy">{text}</span><span className="mobile-gesture-copy">{mobile}</span></>:text;
}
function StoryPanel({step,children}:{step:number;children:ReactNode}){
 const panel=useRef<HTMLElement>(null),content=useRef<HTMLDivElement>(null);
 const [scroll,setScroll]=useState({visible:false,size:100,top:0});
 useEffect(()=>{const el=panel.current,inner=content.current;if(!el||!inner)return;let frame=0;const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const range=el.scrollHeight-el.clientHeight,size=Math.max(10,el.clientHeight/el.scrollHeight*100);const next={visible:range>1,size,top:range>0?el.scrollTop/range*(100-size):0};setScroll(prev=>prev.visible===next.visible&&prev.size===next.size&&prev.top===next.top?prev:next)});};const observer=new ResizeObserver(update);observer.observe(el);observer.observe(inner);el.addEventListener('scroll',update,{passive:true});update();return()=>{cancelAnimationFrame(frame);observer.disconnect();el.removeEventListener('scroll',update)}},[]);
 return <div className="story-panel-shell"><section ref={panel} className={`control-panel${step===4?' result-story':''}`} tabIndex={step===4?0:undefined} aria-label={`Story ${step+1}`}><div ref={content} className="story-panel-content">{children}</div></section>{step===4&&scroll.visible&&<div className="story-scroll-track" aria-hidden="true"><div style={{height:`${scroll.size}%`,top:`${scroll.top}%`}}/></div>}</div>;
}
function StoryHeightReference(){
 const settings=DEFAULT_CLOUD;
 const storyReference=useRef<HTMLDivElement>(null);
 // Measure the natural second-story layout at the current panel width, even on other steps.
 useEffect(()=>{const reference=storyReference.current,grid=reference?.parentElement,panel=grid?.querySelector<HTMLElement>('.control-panel:not(.story-height-reference)');if(!grid||!panel||!reference)return;let frame=0,lastWidth=0;const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const width=panel.getBoundingClientRect().width;if(width<=0||Math.abs(width-lastWidth)<.5)return;lastWidth=width;reference.style.width=`${width}px`;const height=Math.ceil(reference.getBoundingClientRect().height);if(height>0)grid.style.setProperty('--story-height',`${height}px`)});};const observer=new ResizeObserver(measure);observer.observe(panel);observer.observe(reference);measure();return()=>{cancelAnimationFrame(frame);observer.disconnect()}},[]);
 return <div className="control-panel story-height-reference" ref={storyReference} aria-hidden="true" inert><div className="story-number">STORY 02 </div><h2>{chapters[1].title}</h2><p className="story-text"><GestureCopy step={1}/></p><div className="gesture-card"><Hand size={22}/><strong><GestureCopy step={1} action/></strong></div><div className="effect-card"><span>지금 바뀐 결과</span><strong>{storyEffect(1,settings).title}</strong><p>{storyEffect(1,settings).description}</p></div><div className="story-bottom"><p className="science-tip"><span>구름에 어떤 도움이 될까?</span>{chapters[1].tip}</p><p className="step-hint">위의 <b>{chapters[2].name}</b>을 눌러 다음 실험으로 가 봐.</p></div></div>;
}
export default function Home(){
 const [appTab,setAppTab]=useState<'factory'|'sky'>('factory');
 const [step,setStep]=useState(0),[unlocked,setUnlocked]=useState(0),[settings,setSettings]=useState<CloudSettings>(DEFAULT_CLOUD),[maker,setMaker]=useState(''),[clouds,setClouds]=useState<RecordCloud[]>([]),[cursor,setCursor]=useState<number|null>(null),[loading,setLoading]=useState(true),[moreLoading,setMoreLoading]=useState(false),[loadError,setLoadError]=useState(''),[saveError,setSaveError]=useState(''),[saving,setSaving]=useState(false),[published,setPublished]=useState(false),[selected,setSelected]=useState<RecordCloud|null>(null),[imageMessage,setImageMessage]=useState(''),[imageBusy,setImageBusy]=useState(false);
 const gallery=useRef<HTMLElement>(null),state=cloudState(settings),effect=storyEffect(step,settings);
 const change=(patch:Partial<CloudSettings>)=>{setSettings(prev=>deriveCloud({...prev,...patch}));setPublished(false);setSaveError('')};
 const load=useCallback(async(before?:number)=>{before?setMoreLoading(true):setLoading(true);setLoadError('');try{const r=await fetch(before?`/api/clouds?before=${before}`:'/api/clouds',{cache:'no-store'});const data=await r.json() as {clouds?:RecordCloud[];nextCursor?:number|null;error?:string};if(!r.ok||!data.clouds)throw Error(data.error||'다시 불러와 줘.');setClouds(prev=>before?[...prev,...data.clouds!]:data.clouds!);setCursor(data.nextCursor??null)}catch(e){setLoadError(e instanceof Error?e.message:'다시 불러와 줘.')}finally{setLoading(false);setMoreLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 const visitStep=(i:number)=>{setUnlocked(Math.max(unlocked,i));setStep(i);setSaveError('')};
 const restart=()=>{setStep(0);setUnlocked(0);setSettings(DEFAULT_CLOUD);setMaker('');setSaveError('');setPublished(false);window.scrollTo({top:0,behavior:'smooth'})};
 const publish=async()=>{const name=maker.trim();if(!name||[...name].length>12){setSaveError('만든 사람의 별명을 1~12글자로 적어 줘.');return}if(!state.formed){setSaveError('먼저 구름을 완성해 줘.');return}setSaving(true);setSaveError('');try{const r=await fetch('/api/clouds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...settings,maker:name})});const data=await r.json() as {cloud?:RecordCloud;error?:string};if(!r.ok||!data.cloud)throw Error(data.error||'다시 눌러 줘.');setClouds(prev=>[data.cloud!,...prev]);setPublished(true);setTimeout(()=>gallery.current?.scrollIntoView({behavior:'smooth'}),200)}catch(e){setSaveError(e instanceof Error?e.message:'다시 눌러 줘.')}finally{setSaving(false)}};
 const downloadPicture=async()=>{if(!selected||imageBusy)return;setImageBusy(true);setImageMessage('');try{const blob=await cloudPngBlob(selected,selected.maker);const filename=`${selected.maker.replace(/[\\/:*?"<>|]/g,'_')}-구름.png`;if(navigator.share&&navigator.canShare?.({files:[new File([blob],filename,{type:'image/png'})]})&&matchMedia('(pointer:coarse)').matches){await navigator.share({files:[new File([blob],filename,{type:'image/png'})],title:`${selected.maker}의 구름`});setImageMessage('저장할 곳을 골랐어.')}else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);setImageMessage('PNG 그림을 저장했어.')}}catch(e){if(e instanceof Error&&e.name==='AbortError')return;setImageMessage('그림을 저장하지 못했어. 다시 눌러 줘.')}finally{setImageBusy(false)}};
 const copyPicture=async()=>{if(!selected||imageBusy)return;setImageBusy(true);setImageMessage('');try{if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('unsupported');await navigator.clipboard.write([new ClipboardItem({'image/png':cloudPngBlob(selected,selected.maker)})]);setImageMessage('그림을 복사했어. 원하는 곳에 붙여 넣어 봐.')}catch{setImageMessage('이 브라우저에서는 그림 복사가 안 돼. 그림 저장을 이용해 줘.')}finally{setImageBusy(false)}};
 useEffect(()=>{const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();try{void Promise.resolve(context.registerTool({name:'publish_cloud',title:'구름 만들어 게시하기',description:'물, 상승 원인, 성장 시간, 바람과 씨앗을 조합하여 구름을 게시합니다. 열 가지 종류와 비는 입력 원인에서 계산됩니다.',inputSchema:{type:'object',properties:{humidity:{type:'integer',minimum:0,maximum:100},height:{type:'integer',minimum:0,maximum:2500},nuclei:{type:'integer',minimum:1,maximum:100},angle:{type:'integer',minimum:0,maximum:359},color:{type:'string'},shadow:{type:'integer',minimum:0,maximum:100},depth:{type:'integer',minimum:0,maximum:100},lightX:{type:'integer',minimum:0,maximum:100},skyLevel:{type:'integer',minimum:0,maximum:100},flow:{type:'string',enum:['rise','spread','ripple','streak']},energy:{type:'integer',minimum:0,maximum:100},growth:{type:'integer',minimum:0,maximum:100},liftSource:{type:'string',enum:['sun','front','mountain','night','upper']},modelVersion:{type:'integer',enum:[2]},wind:{type:'integer',minimum:0,maximum:100},maker:{type:'string',minLength:1,maxLength:12}},required:['humidity','height','nuclei','angle','color','shadow','depth','lightX','skyLevel','flow','energy','growth','liftSource','modelVersion','wind','maker'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input:unknown){const data=input as Record<string,unknown>;if(!data||typeof data!=='object'||Array.isArray(data))throw Error('입력값을 확인해 줘.');const r=await fetch('/api/clouds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json() as {cloud?:RecordCloud;error?:string};if(!r.ok||!result.cloud)throw Error(result.error||'구름을 올리지 못했어.');setClouds(prev=>[result.cloud!,...prev]);setSettings(result.cloud);setMaker(result.cloud.maker);setStep(4);setUnlocked(4);setPublished(true);return {id:result.cloud.id,maker:result.cloud.maker}}},{signal:lifecycle.signal})).catch(()=>{})}catch{}return()=>lifecycle.abort()},[]);
 return <main className={appTab==='sky'?'sky-tab-open':''}><Tabs value={appTab} onValueChange={value=>setAppTab(value as 'factory'|'sky')}><header className="site-header"><div className="logo"><span className="logo-symbol">◕</span> 구름 제작소</div><TabsList className="product-tabs" aria-label="구름 제작소 메뉴"><TabsTrigger value="factory"><Cloud size={17}/> 구름 제작소</TabsTrigger><TabsTrigger value="sky"><CloudSun size={17}/> 하늘 만들기</TabsTrigger></TabsList><button className="library-jump" onClick={()=>{setAppTab('factory');setTimeout(()=>gallery.current?.scrollIntoView({behavior:'smooth'}),60)}}><BookOpen size={18}/> 구름 도서관 <b>{clouds.length}</b></button></header><TabsContent value="factory" className="factory-tab"><div className="app-wrap"><div className="title-row"><div><span className="eyebrow">{step===4?'내 구름의 이야기':'구름 만들기'}</span><h1>{step===4?(state.formed?'내 구름이 완성됐어!':'구름이 생길 조건을 찾아봐'):'나만의 하늘을 만져 봐'}</h1><p>{step===4?(state.formed?`${typeName(settings.cloudType)} · ${cloudStory(settings)}`:'물, 공기의 높이, 씨앗을 차례로 살펴봐.'):'손으로 물을 모으고, 공기를 올려 열 가지 구름을 만나 봐.'}</p></div><div className="chapter-count">{String(step+1).padStart(2,'0')} <small>/ 05</small></div></div>
 <nav className="step-nav" aria-label="구름 만들기 단계">{chapters.map((c,i)=><button key={i} className={i===step?'current':''} onClick={()=>visitStep(i)} aria-current={i===step?'step':undefined}><span>{c.name}</span></button>)}</nav>
 <div className="studio-grid"><StoryHeightReference/><section className="sky-panel" data-step={step}>{step===1&&<div className="lift-source-picker" onPointerDown={e=>e.stopPropagation()}><strong>먼저, 누가 공기를 올릴까?</strong><small>고르면 배경과 구름 모양이 달라져.</small><div>{sources.map(source=><button key={source.id} aria-pressed={(settings.liftSource??'sun')===source.id} className={(settings.liftSource??'sun')===source.id?'active':''} onClick={()=>change({liftSource:source.id})}>{source.label}</button>)}</div></div>}<Sky step={step} settings={settings} onChange={change} onVisitStep={visitStep}/></section><StoryPanel step={step}><div className="story-number">STORY {String(step+1).padStart(2,'0')}</div><h2>{chapters[step].title}</h2><p className="story-text"><GestureCopy step={step}/></p>{step!==4&&<div className="gesture-card"><Hand size={22}/><strong><GestureCopy step={step} action/></strong></div>}
 {step===3&&<div className="path-hint"><strong>지금 구름이 자라는 길</strong><p>{liftName(settings.liftSource??'sun')} → {stabilityName(settings.energy)} → {growthName(settings.growth??35)}</p><small>하늘을 좌우로 쓸면 바람, 위아래로 쓸면 자란 시간이 부드럽게 달라져.</small></div>}
 {step!==4&&<div className="effect-card"><span>지금 바뀐 결과</span><strong>{effect.title}</strong><p>{effect.description}</p></div>}
 {step===4&&<div className="custom-tools">{state.formed&&<InfluenceCard settings={settings}/>}<div className="tool-row"><div><strong>구름을 보는 시점</strong><small>좌우로 끌어 360° 둘러보기</small></div><button className="reset-small" onClick={()=>change({angle:0})} aria-label="각도 되돌리기"><RefreshCcw size={16}/></button><b>{settings.angle}°</b></div><div className="tool-row"><div><strong>빛과 그림자</strong><small>하늘의 ‘빛’ 손잡이를 끌기</small></div><b>{settings.shadow}%</b></div><div className="depth-row"><div><strong>입체감</strong><small>구름 위에서 두 손가락을 벌리거나 마우스 휠 돌리기</small></div><div className="depth-actions"><button onClick={()=>change({depth:clamp(settings.depth-1,0,100)})} aria-label="입체감 줄이기"><Minus size={17}/></button><b>{settings.depth}</b><button onClick={()=>change({depth:clamp(settings.depth+1,0,100)})} aria-label="입체감 높이기"><Plus size={17}/></button></div></div><label className="maker-label" htmlFor="maker">만든 사람의 별명</label><Input id="maker" className="maker-input" value={maker} onChange={e=>{setMaker(e.target.value);setPublished(false)}} maxLength={12} placeholder="예: 하늘 탐험가" autoComplete="off"/><small className="name-hint">진짜 이름 대신 별명을 적어도 좋아.</small></div>}
 <div className="story-bottom"><p className="science-tip"><span>구름에 어떤 도움이 될까?</span>{chapters[step].tip}</p>{saveError&&<p className="error" role="alert">{saveError}</p>}{published&&<p className="success" role="status">구름 도서관에 올렸어! 아래에서 찾아 봐.</p>}{step<4?<p className="step-hint">위의 <b>{chapters[step+1].name}</b>을 눌러 다음 실험으로 가 봐.</p>:<div className="actions"><Button className="primary-action" onClick={publish} disabled={saving||published}>{saving?'올리는 중…':published?'올리기 완료':'도서관에 올리기'} <Cloud size={18}/></Button></div>}</div></StoryPanel></div>
 <section className="library" ref={gallery}><div className="library-heading"><div><span className="eyebrow">OUR CLOUDS</span><h2>구름 도서관 <span>{clouds.length}{cursor?'+':''}</span></h2><p>만들어진 구름이 이곳에 하나씩 쌓여.</p></div><div className="library-actions"><Button variant="outline" onClick={()=>setAppTab('sky')}><CloudSun size={17}/> 하늘 만들기</Button><Button variant="outline" onClick={restart}><RotateCcw size={16}/> 새 구름 만들기</Button></div></div>{loading?<div className="library-empty">구름들을 불러오는 중이야…</div>:loadError&&clouds.length===0?<div className="library-empty">{loadError} <button onClick={()=>void load()}>다시 불러오기</button></div>:clouds.length===0?<div className="library-empty">아직 만들어진 구름이 없어. 첫 구름을 올려 줘! ☁</div>:<div className="gallery-grid">{clouds.map(c=><GalleryCard cloud={c} key={c.id} onOpen={()=>{setSelected(c);setImageMessage('')}}/>)}</div>}{cursor&&<button className="more-button" disabled={moreLoading} onClick={()=>void load(cursor)}>{moreLoading?'불러오는 중…':'구름 더 보기 ↓'}</button>}{loadError&&clouds.length>0&&<p className="error">{loadError}</p>}</section><p className="parent-note">어른을 위한 설명 · 공기가 상승하며 팽창·냉각되고, 포화된 수증기가 작은 입자에 응결하는 과정을 놀이로 표현했습니다. 10가지 구름 분류는 공기를 올리는 원인, 물의 양, 성장 시간, 상승 안정도와 바람의 움직임을 바탕으로 한 교육용 모형입니다. 실제 기상 관측이나 예보를 대신하지 않습니다.</p></div><Dialog open={selected!==null} onOpenChange={open=>{if(!open){setSelected(null);setImageMessage('')}}}>
  {selected&&<DialogContent className="cloud-dialog" aria-describedby="cloud-dialog-description"><DialogTitle>{selected.maker}의 {typeName(selected.cloudType)}</DialogTitle><DialogDescription id="cloud-dialog-description">크게 보고 그림을 저장하거나 복사할 수 있어.</DialogDescription><div className={`detail-art ${weatherClass(selected)}`} style={{backgroundImage:skyBackground(selected)}}><LiftScene source={selected.liftSource??'sun'}/><CloudCanvas settings={selected}/><RainLayer settings={selected}/></div><div className="detail-stats"><span>물 {selected.humidity}%</span><span>높이 {selected.height.toLocaleString()}m</span><span>씨앗 {selected.nuclei}</span><span>시점 {selected.angle}°</span><span>{typeName(selected.cloudType)}</span>{selected.rain>0&&<span>비 {selected.rain}</span>}</div><p className="cloud-origin">{cloudStory(selected)}</p><InfluenceCard settings={selected} compact/><div className="detail-actions"><Button onClick={()=>void downloadPicture()} disabled={imageBusy}><Download size={18}/> 그림 저장</Button><Button variant="outline" onClick={()=>void copyPicture()} disabled={imageBusy}><Copy size={18}/> 그림 복사</Button></div>{imageMessage&&<p className="image-message" role="status">{imageMessage}</p>}</DialogContent>}
 </Dialog></TabsContent><TabsContent value="sky" className="sky-builder-tab">{appTab==='sky'&&<SkyBuilder clouds={clouds} loading={loading}/>}</TabsContent></Tabs></main>
}
