"use client";

import {useEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent} from "react";
import {CloudSun,Copy,Download,FolderOpen,Minus,Moon,Plus,Save,Sun,Trash2,Wind} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog,DialogContent,DialogDescription,DialogTitle} from "@/components/ui/dialog";
import {CloudSettings,CLOUD_TYPES} from "@/lib/cloud-model";
import {drawCloud,subscribeCloudTexture,waitForCloudTexture} from "@/lib/cloud-render";
import {latestSavedSkies,saveSharedSky,type SavedSkyRecord} from "@/lib/skies";
import {cloudInSky,skyExposure} from '@/lib/sky-lighting';
import {cloudsByIds} from "@/lib/clouds";

type RecordCloud=CloudSettings&{id:number;maker:string;decoration:string;createdAt:string};
type Weather="clear"|"cloudy"|"rain"|"storm";
type SunKind="round"|"radiant"|"soft";
type TimeOfDay="dawn"|"day"|"sunset"|"night";
type PlacedCloud={instanceId:number;cloudId:number;x:number;y:number;scale:number};
type DragState={kind:"tray"|"placed";cloudId:number;instanceId?:number;clientX:number;clientY:number;moved:boolean};
type SavedSky=SavedSkyRecord;

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const typeName=(id:CloudSettings["cloudType"])=>CLOUD_TYPES.find(type=>type.id===id)?.name??"구름";
const STORAGE_KEY="gureumso-saved-skies-v1";
const MIGRATION_KEY="gureumso-saved-skies-migrated-v2";

function CloudPicture({settings,small=false,exposure=1}:{settings:CloudSettings;small?:boolean;exposure?:number}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;let disposed=false;const render=()=>{if(!disposed)drawCloud(canvas,settings,small)};const frame=requestAnimationFrame(render);const unsubscribe=subscribeCloudTexture(render);return()=>{disposed=true;cancelAnimationFrame(frame);unsubscribe()}},[settings,small]);
 return <canvas ref={ref} className="sky-builder-cloud-canvas" style={{filter:`brightness(${exposure})`}} role="img" aria-label={`${typeName(settings.cloudType)} 구름`}/>;
}

const weatherOptions:[Weather,string,string][]=[
 ["clear","맑음","☀️"],["cloudy","흐림","⛅"],["rain","비","🌧️"],["storm","폭풍","⛈️"],
];
const sunOptions:[SunKind,string][]=[["round","동그란 해"],["radiant","반짝이는 해"],["soft","부드러운 해"]];
const timeOptions:[TimeOfDay,string][]=[["dawn","아침"],["day","낮"],["sunset","노을"],["night","밤"]];

export function SkyBuilder({clouds,loading}:{clouds:RecordCloud[];loading:boolean}){
 const [weather,setWeather]=useState<Weather>("clear"),[sunKind,setSunKind]=useState<SunKind>("radiant"),[time,setTime]=useState<TimeOfDay>("day");
 const [showPanHint,setShowPanHint]=useState(true);
 const [placed,setPlaced]=useState<PlacedCloud[]>([]),[selectedId,setSelectedId]=useState<number|null>(null),[drag,setDrag]=useState<DragState|null>(null),[message,setMessage]=useState("아래 구름을 끌어 하늘에 놓아 봐.");
 const [savedSkies,setSavedSkies]=useState<SavedSky[]>([]),[skiesLoading,setSkiesLoading]=useState(true),[skySaving,setSkySaving]=useState(false),[saveError,setSaveError]=useState(""),[extraClouds,setExtraClouds]=useState<RecordCloud[]>([]),[skyName,setSkyName]=useState(""),[saveOpen,setSaveOpen]=useState(false),[libraryOpen,setLibraryOpen]=useState(false),[imageBusy,setImageBusy]=useState(false),[imageMessage,setImageMessage]=useState("");
 const [pan,setPan]=useState(.5);
 const [isPanning,setIsPanning]=useState(false);
 const [openSetting,setOpenSetting]=useState<"weather"|"sun"|"time"|null>(null);
 const stageRef=useRef<HTMLDivElement>(null),sceneRef=useRef<HTMLDivElement>(null),nextId=useRef(1),dragStart=useRef({x:0,y:0});
 const panStart=useRef<{pointerId:number;x:number;value:number}|null>(null);
 const trayGesture=useRef<{pointerId:number;cloudId:number;x:number;y:number}|null>(null);
 const cloudsById=useMemo(()=>new Map([...extraClouds,...clouds].map(cloud=>[cloud.id,cloud])),[clouds,extraClouds]);
 const litClouds=useMemo(()=>new Map([...cloudsById].map(([id,cloud])=>[id,cloudInSky(cloud,time,weather)])),[cloudsById,time,weather]);
 const selected=placed.find(item=>item.instanceId===selectedId)??null;

 useEffect(()=>{const timer=window.setTimeout(()=>setShowPanHint(false),3000);return()=>window.clearTimeout(timer)},[]);

 useEffect(()=>{let cancelled=false;(async()=>{try{
  const remote=await latestSavedSkies();
  if(!localStorage.getItem(MIGRATION_KEY)){const raw=localStorage.getItem(STORAGE_KEY);if(raw){const local=JSON.parse(raw) as Array<Omit<SavedSky,"id">&{id?:unknown}>;if(Array.isArray(local)){for(const sky of local.slice(0,20)){if(sky.name&&Array.isArray(sky.placed))await saveSharedSky({name:String(sky.name).slice(0,18),weather:sky.weather,sunKind:sky.sunKind,time:sky.time,placed:sky.placed})}}}localStorage.setItem(MIGRATION_KEY,"1");localStorage.removeItem(STORAGE_KEY);if(!cancelled)setSavedSkies(await latestSavedSkies())}else if(!cancelled)setSavedSkies(remote);
 }catch{if(!cancelled)setMessage("저장된 하늘을 불러오지 못했어. 잠시 뒤 다시 열어 줘.")}finally{if(!cancelled)setSkiesLoading(false)}})();return()=>{cancelled=true}},[]);

 const pointInStage=(clientX:number,clientY:number)=>{
  const rect=stageRef.current?.getBoundingClientRect();
  if(!rect||clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom)return null;
  const scene=sceneRef.current?.getBoundingClientRect()??rect;
  return {x:clamp((clientX-scene.left)/scene.width*100,5,95),y:clamp((clientY-rect.top)/rect.height*100,12,76)};
 };
 const addCloud=(cloudId:number,x?:number,y=43)=>{
  if(x===undefined){const rect=stageRef.current?.getBoundingClientRect();x=rect?pointInStage(rect.left+rect.width/2,rect.top+rect.height*.43)?.x??50:50;}
  const instanceId=nextId.current++;
  setPlaced(items=>[...items,{instanceId,cloudId,x,y,scale:1}]);
  setSelectedId(instanceId);setMessage("구름을 잡아 옮기고, −와 +로 크기를 바꿔 봐.");
 };
 const startDrag=(event:React.PointerEvent,kind:DragState["kind"],cloudId:number,instanceId?:number)=>{
  event.preventDefault();event.stopPropagation();
  dragStart.current={x:event.clientX,y:event.clientY};
  if(instanceId)setSelectedId(instanceId);
  setDrag({kind,cloudId,instanceId,clientX:event.clientX,clientY:event.clientY,moved:false});
 };
 const startSkyPan=(event:ReactPointerEvent<HTMLDivElement>)=>{
  setSelectedId(null);
  const stage=stageRef.current,scene=sceneRef.current;
  if(!stage||!scene||scene.offsetWidth<=stage.offsetWidth)return;
  panStart.current={pointerId:event.pointerId,x:event.clientX,value:pan};
  setIsPanning(true);setShowPanHint(false);
  stage.setPointerCapture(event.pointerId);
 };
 const moveSkyPan=(event:ReactPointerEvent<HTMLDivElement>)=>{
  const start=panStart.current,stage=stageRef.current,scene=sceneRef.current;
  if(!start||start.pointerId!==event.pointerId||!stage||!scene)return;
  const travel=scene.offsetWidth-stage.offsetWidth;
  if(travel>0)setPan(clamp(start.value+(start.x-event.clientX)/travel,0,1));
 };
 const endSkyPan=(event:ReactPointerEvent<HTMLDivElement>)=>{
  if(panStart.current?.pointerId!==event.pointerId)return;
  panStart.current=null;setIsPanning(false);
  if(stageRef.current?.hasPointerCapture(event.pointerId))stageRef.current.releasePointerCapture(event.pointerId);
 };
 const startTrayTouch=(event:ReactPointerEvent<HTMLButtonElement>,cloudId:number)=>{
  if(event.pointerType==="mouse"){startDrag(event,"tray",cloudId);return}
  trayGesture.current={pointerId:event.pointerId,cloudId,x:event.clientX,y:event.clientY};
  event.currentTarget.setPointerCapture(event.pointerId);
 };
 const moveTrayTouch=(event:ReactPointerEvent<HTMLButtonElement>)=>{
  const pending=trayGesture.current;
  if(!pending||pending.pointerId!==event.pointerId)return;
  const dx=event.clientX-pending.x,dy=event.clientY-pending.y;
  if(Math.abs(dy)>9&&Math.abs(dy)>Math.abs(dx)*1.2){
   trayGesture.current=null;
   dragStart.current={x:pending.x,y:pending.y};
   setDrag({kind:"tray",cloudId:pending.cloudId,clientX:event.clientX,clientY:event.clientY,moved:true});
  }
 };
 const endTrayTouch=(event:ReactPointerEvent<HTMLButtonElement>)=>{
  const pending=trayGesture.current;
  if(!pending||pending.pointerId!==event.pointerId)return;
  trayGesture.current=null;
  if(Math.hypot(event.clientX-pending.x,event.clientY-pending.y)<9)addCloud(pending.cloudId);
 };

 useEffect(()=>{
  if(!drag)return;
  const move=(event:PointerEvent)=>{
   const moved=Math.hypot(event.clientX-dragStart.current.x,event.clientY-dragStart.current.y)>5;
   setDrag(current=>current?{...current,clientX:event.clientX,clientY:event.clientY,moved:current.moved||moved}:null);
   if(drag.kind==="placed"&&drag.instanceId){const point=pointInStage(event.clientX,event.clientY);if(point)setPlaced(items=>items.map(item=>item.instanceId===drag.instanceId?{...item,...point}:item))}
  };
  const up=(event:PointerEvent)=>{
   const point=pointInStage(event.clientX,event.clientY);
   if(drag.kind==="tray"&&point)addCloud(drag.cloudId,point.x,point.y);
   setDrag(null);
  };
  window.addEventListener("pointermove",move,{passive:true});window.addEventListener("pointerup",up,{once:true});window.addEventListener("pointercancel",up,{once:true});
  return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);window.removeEventListener("pointercancel",up)};
 },[drag]);

 const resizeSelected=(amount:number)=>{if(selectedId===null)return;setPlaced(items=>items.map(item=>item.instanceId===selectedId?{...item,scale:clamp(item.scale+amount,.5,1.8)}:item))};
 const removeSelected=()=>{if(selectedId===null)return;setPlaced(items=>items.filter(item=>item.instanceId!==selectedId));setSelectedId(null);setMessage("다른 구름도 하늘에 놓아 봐.")};
 const clearSky=()=>{setPlaced([]);setSelectedId(null);setMessage("빈 하늘이 되었어. 새 구름을 골라 봐.")};
 const dragCloud=drag?cloudsById.get(drag.cloudId):undefined;
 const saveSky=async()=>{
  const name=skyName.trim();
  if(!name){setMessage("하늘 이름을 적어 줘.");return}
  if(placed.length===0){setMessage("구름을 하나 이상 놓은 뒤 저장해 줘.");return}
  setSkySaving(true);setSaveError("");
  try{const saved=await saveSharedSky({name:name.slice(0,18),weather,sunKind,time,placed:placed.map(item=>({...item}))});setSavedSkies(items=>[saved,...items].slice(0,50));setSkyName(saved.name);setSaveOpen(false);setMessage(`‘${saved.name}’ 하늘을 모든 기기에서 볼 수 있게 저장했어.`)}catch{setSaveError("하늘을 저장하지 못했어. 잠시 뒤 다시 해 줘.")}finally{setSkySaving(false)}
 };
 const openLibrary=async()=>{setLibraryOpen(true);setSkiesLoading(true);try{setSavedSkies(await latestSavedSkies())}catch{setMessage("저장된 하늘을 불러오지 못했어. 잠시 뒤 다시 열어 줘.")}finally{setSkiesLoading(false)}};
 const loadSky=async(sky:SavedSky)=>{try{const missing=[...new Set(sky.placed.map(item=>item.cloudId))].filter(id=>!cloudsById.has(id));const fetched=await cloudsByIds(missing);if(fetched.length)setExtraClouds(items=>[...items,...fetched]);const validIds=new Set([...cloudsById.keys(),...fetched.map(item=>item.id)]);const available=sky.placed.filter(item=>validIds.has(item.cloudId));setWeather(sky.weather);setSunKind(sky.sunKind);setTime(sky.time);setPlaced(available);setSkyName(sky.name);setSelectedId(null);nextId.current=Math.max(1,...available.map(item=>item.instanceId+1));setLibraryOpen(false);setMessage(available.length===sky.placed.length?`‘${sky.name}’ 하늘을 다시 열었어.`:`‘${sky.name}’ 하늘의 일부 구름을 찾지 못했어.`)}catch{setMessage("구름을 불러오지 못했어. 다시 열어 줘.")}};
 const renderSky=async()=>{
  await waitForCloudTexture();
  const canvas=document.createElement("canvas");canvas.width=1600;canvas.height=1000;const ctx=canvas.getContext("2d")!;
  const palettes:Record<TimeOfDay,[string,string]>={dawn:["#506b9d","#ffe2b8"],day:["#238ed9","#d9eef6"],sunset:["#384f8e","#ffc36e"],night:["#07152e","#526792"]};
  const gradient=ctx.createLinearGradient(0,0,0,1000);gradient.addColorStop(0,palettes[time][0]);gradient.addColorStop(1,palettes[time][1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,1600,1000);
  if(weather!=="clear"){ctx.fillStyle=weather==="cloudy"?"rgba(73,96,114,.34)":weather==="rain"?"rgba(35,55,76,.52)":"rgba(14,27,43,.68)";ctx.fillRect(0,0,1600,1000)}
  const sunX=time==="dawn"?240:time==="sunset"?1360:time==="night"?250:1280,sunY=time==="dawn"||time==="sunset"?610:time==="night"?150:150,sunR=time==="night"?48:sunKind==="soft"?70:58;
  ctx.save();ctx.shadowColor=time==="night"?"#dbe8ff":"#ffe9a8";ctx.shadowBlur=sunKind==="soft"?70:38;ctx.fillStyle=time==="night"?"#eef2d5":time==="sunset"?"#ffae58":"#fff4bd";if(weather==="rain"||weather==="storm")ctx.globalAlpha=.12;
  if(time==="night"){
   // Moon silhouette from Lucide (ISC), matching the editor's Moon icon.
   ctx.translate(sunX-sunR,sunY-sunR);ctx.scale(sunR/12,sunR/12);
   ctx.fill(new Path2D("M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"));
  }else{ctx.beginPath();ctx.arc(sunX,sunY,sunR,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  for(const item of placed){const cloud=cloudsById.get(item.cloudId);if(!cloud)continue;const layer=document.createElement("canvas");drawCloud(layer,cloudInSky(cloud,time,weather),false,true);const width=520*item.scale,height=width*.6;ctx.save();ctx.filter=`brightness(${skyExposure(time,weather)})`;ctx.drawImage(layer,item.x/100*1600-width/2,item.y/100*1000-height/2,width,height);ctx.restore()}
  if(weather==="rain"||weather==="storm"){ctx.save();ctx.strokeStyle="rgba(218,245,255,.72)";ctx.lineWidth=3;for(let i=0;i<75;i++){const x=(i*179)%1660-30,y=(i*83)%800;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-18,y+72);ctx.stroke()}ctx.restore()}
  const label=(skyName.trim()||"나의 하늘").slice(0,18);ctx.font="700 34px system-ui, sans-serif";const width=ctx.measureText(label).width;ctx.fillStyle="rgba(12,55,80,.68)";ctx.beginPath();ctx.roundRect(48,908,width+72,62,18);ctx.fill();ctx.fillStyle="#fff";ctx.fillText(label,84,950);
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("이미지를 만들 수 없어요.")),"image/png"));
 };
 const downloadSky=async()=>{if(imageBusy)return;setImageBusy(true);setImageMessage("");try{const blob=await renderSky(),filename=`${(skyName.trim()||"나의-하늘").replace(/[\\/:*?"<>|]/g,"_")}.png`,file=new File([blob],filename,{type:"image/png"});if(navigator.share&&navigator.canShare?.({files:[file]})&&matchMedia("(pointer:coarse)").matches){await navigator.share({files:[file],title:"내가 만든 하늘"});setImageMessage("저장하거나 공유할 곳을 골랐어.")}else{const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);setImageMessage("하늘 그림을 저장했어.")}}catch(error){if(error instanceof Error&&error.name==="AbortError")return;setImageMessage("하늘 그림을 저장하지 못했어.")}finally{setImageBusy(false)}};
 const copySky=async()=>{if(imageBusy)return;setImageBusy(true);setImageMessage("");try{if(!navigator.clipboard?.write||typeof ClipboardItem==="undefined")throw Error("unsupported");const blob=await renderSky();await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);setImageMessage("하늘 그림을 복사했어.")}catch{setImageMessage("이 브라우저에서는 복사가 안 돼. 그림 저장을 이용해 줘.")}finally{setImageBusy(false)}};

 return <section className={`sky-builder time-${time} weather-${weather}`} aria-label="하늘 만들기 편집기">
  <div className="sky-editor-header"><div><h1>내가 만든 하늘</h1><p role="status">{message}</p></div>   <button className="sky-clear-button" onPointerDown={event=>event.stopPropagation()} onClick={clearSky} disabled={placed.length===0}><Trash2/> 하늘 비우기</button>
</div>
  <div className="sky-settings"><div className="sky-setting-tabs" aria-label="하늘 설정">
   {([['weather','날씨',weatherOptions.find(o=>o[0]===weather)?.[1]],['sun','해',time==='night'?'달빛':sunOptions.find(o=>o[0]===sunKind)?.[1]],['time','시간',timeOptions.find(o=>o[0]===time)?.[1]]] as const).map(([key,label,value])=><button key={key} aria-expanded={openSetting===key} aria-controls="sky-setting-panel" onClick={()=>setOpenSetting(openSetting===key?null:key)}><strong>{label}</strong><span>{value}</span><b aria-hidden="true">{openSetting===key?'−':'+'}</b></button>)}
  </div>   <div className="sky-builder-controls" id="sky-setting-panel">
    {openSetting==="weather"&&<div className="sky-control-group"><strong>날씨</strong><div>{weatherOptions.map(([value,label,icon])=><button key={value} className={weather===value?"active":""} aria-pressed={weather===value} onClick={()=>setWeather(value)}><span>{icon}</span>{label}</button>)}</div></div>}
    {openSetting==="sun"&&<div className="sky-control-group"><strong>해 모습</strong>{time==="night"&&<p className="moon-setting-note">밤에는 달빛이 구름을 비춰 줘.</p>}<div>{sunOptions.map(([value,label])=><button key={value} className={sunKind===value?"active":""} aria-pressed={sunKind===value} disabled={time==="night"} onClick={()=>setSunKind(value)}>{label}</button>)}</div></div>}
    {openSetting==="time"&&<div className="sky-control-group"><strong>시간</strong><div>{timeOptions.map(([value,label])=><button key={value} className={time===value?"active":""} aria-pressed={time===value} onClick={()=>setTime(value)}>{label}</button>)}</div></div>}
   </div>
</div>
  <div className="sky-builder-stage" ref={stageRef} onPointerDown={startSkyPan} onPointerMove={moveSkyPan} onPointerUp={endSkyPan} onPointerCancel={endSkyPan}>
   <div className="sky-builder-scene" ref={sceneRef} style={{"--sky-pan":pan} as React.CSSProperties}>
    <div className="sky-builder-glow" aria-hidden="true"/>
    <div className={`sky-builder-sun sun-${sunKind}`} aria-hidden="true">{time==="night"?<Moon/>:<Sun/>}</div>
    <div className="sky-builder-horizon" aria-hidden="true"/>
    {(weather==="rain"||weather==="storm")&&<div className="scene-rain" aria-hidden="true">{Array.from({length:42},(_,index)=><i key={index} style={{left:`${(index*37)%101}%`,animationDelay:`-${(index%11)*.11}s`,animationDuration:`${.62+(index%7)*.045}s`}}/>)}</div>}
    {weather==="storm"&&<div className="scene-lightning" aria-hidden="true"/>}
    {placed.map(item=>{const cloud=cloudsById.get(item.cloudId);if(!cloud)return null;return <button key={item.instanceId} className={`placed-cloud${selectedId===item.instanceId?" selected":""}`} style={{left:`${item.x}%`,top:`${item.y}%`,width:`${clamp(240*item.scale,125,430)}px`,zIndex:Math.round(item.scale*10)+3}} onPointerDown={event=>startDrag(event,"placed",item.cloudId,item.instanceId)} aria-label={`${cloud.maker}의 ${typeName(cloud.cloudType)}. 끌어서 옮기기`}><CloudPicture settings={litClouds.get(cloud.id)??cloud} exposure={skyExposure(time,weather)}/><span>{cloud.maker}</span></button>})}
   </div>
   {showPanHint&&<div className="sky-pan-hint" aria-hidden="true">← 하늘을 좌우로 쓸어 봐 →</div>}
   {isPanning&&<div className="sky-pan-position" aria-label="하늘에서 보고 있는 위치"><i style={{left:`${pan*72}%`}}/></div>}
   {selected&&<div className="cloud-size-tools" onPointerDown={event=>event.stopPropagation()}><button onClick={()=>resizeSelected(-.12)} aria-label="선택한 구름 작게"><Minus/></button><strong>구름 크기</strong><button onClick={()=>resizeSelected(.12)} aria-label="선택한 구름 크게"><Plus/></button><button className="remove" onClick={removeSelected} aria-label="선택한 구름 지우기"><Trash2/></button></div>}

  </div>
  <aside className="cloud-tray" aria-label="내가 만든 구름 목록">
   <div className="cloud-tray-heading"><div><CloudSun/><strong>내 구름들</strong><span>{clouds.length}개</span></div><p><Wind/> 구름을 잡고 위 하늘로 끌어 봐</p></div>
   <div className="cloud-tray-list">
    {loading?<div className="cloud-tray-empty">구름을 불러오는 중이야…</div>:clouds.length===0?<div className="cloud-tray-empty">먼저 ‘구름 제작소’에서 구름을 만들어 줘.</div>:clouds.map(cloud=><button key={cloud.id} className="tray-cloud" onPointerDown={event=>startTrayTouch(event,cloud.id)} onPointerMove={moveTrayTouch} onPointerUp={endTrayTouch} onPointerCancel={()=>{trayGesture.current=null}} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();addCloud(cloud.id)}}} aria-label={`${cloud.maker}의 ${typeName(cloud.cloudType)}. 하늘로 끌거나 눌러서 놓기`}><div><CloudPicture settings={cloud} small/></div><strong>{cloud.maker}</strong><span>{typeName(cloud.cloudType)}</span></button>)}
   </div>
  </aside>
  <div className="sky-builder-actions" aria-label="하늘 저장과 그림 관리">
   <button onClick={()=>setSaveOpen(true)} disabled={placed.length===0} aria-label="현재 하늘 저장"><Save/><span>하늘 저장</span></button>
   <button onClick={()=>void openLibrary()} aria-label={`저장된 하늘 ${savedSkies.length}개 열기`}><FolderOpen/><span>저장된 하늘</span>{savedSkies.length>0&&<b>{savedSkies.length}</b>}</button>
   <button onClick={()=>void downloadSky()} disabled={imageBusy||placed.length===0} aria-label="하늘 그림 저장"><Download/><span>그림 저장</span></button>
   <button onClick={()=>void copySky()} disabled={imageBusy||placed.length===0} aria-label="하늘 그림 복사"><Copy/><span>그림 복사</span></button>
  </div>
  {imageMessage&&<p className="sky-export-status" role="status">{imageMessage}</p>}
  {drag&&dragCloud&&<div className="drag-cloud-ghost" style={{left:drag.clientX,top:drag.clientY}} aria-hidden="true"><CloudPicture settings={dragCloud}/></div>}
  <Dialog open={saveOpen} onOpenChange={setSaveOpen}><DialogContent className="sky-save-dialog"><DialogTitle>이 하늘을 저장할까?</DialogTitle><DialogDescription>이름을 붙이면 다른 기기에서도 다시 열 수 있어.</DialogDescription><label htmlFor="sky-name">하늘 이름</label><Input id="sky-name" value={skyName} onChange={event=>setSkyName(event.target.value)} maxLength={18} placeholder="예: 비 오는 노을 하늘" onKeyDown={event=>{if(event.key==="Enter")void saveSky()}}/>{saveError&&<p className="error" role="alert">{saveError}</p>}<Button onClick={()=>void saveSky()} disabled={skySaving}><Save/> {skySaving?"저장하는 중…":"하늘 저장하기"}</Button></DialogContent></Dialog>
  <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}><DialogContent className="saved-sky-dialog"><DialogTitle>저장된 하늘</DialogTitle><DialogDescription>함께 만든 하늘을 어느 기기에서든 다시 열 수 있어.</DialogDescription>{skiesLoading?<p className="saved-sky-empty">하늘을 불러오는 중이야…</p>:savedSkies.length===0?<p className="saved-sky-empty">아직 저장한 하늘이 없어.</p>:<div className="saved-sky-list">{savedSkies.map(sky=><div className={`saved-sky-item time-${sky.time} weather-${sky.weather}`} key={sky.id}><button className="saved-sky-open" onClick={()=>void loadSky(sky)}><span>{sky.name}</span><small>{sky.placed.length}개의 구름 · {new Date(sky.savedAt).toLocaleDateString("ko-KR")}</small></button></div>)}</div>}</DialogContent></Dialog>
 </section>;
}
