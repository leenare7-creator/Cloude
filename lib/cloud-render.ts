import {CloudSettings,cloudState,cloudTypeFromConditions} from './cloud-model';
const bitmapCache=new Map<string,HTMLCanvasElement>();
let photo:HTMLImageElement|undefined;
let photoReady=false;
const photoListeners=new Set<()=>void>();
export function subscribeCloudTexture(listener:()=>void){
  photoListeners.add(listener);
  if(!photo){photo=new Image();photo.onload=()=>{photoReady=true;bitmapCache.clear();photoListeners.forEach(fn=>fn())};photo.src='/cloud-texture.png'}
  if(photoReady)listener();
  return()=>photoListeners.delete(listener);
}
export function waitForCloudTexture(){
  if(photoReady)return Promise.resolve();
  return new Promise<void>(resolve=>{const unsubscribe=subscribeCloudTexture(()=>{unsubscribe();resolve()})});
}
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function hash(x:number,y:number,seed:number){let z=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,1442695041);z=Math.imul(z^(z>>>13),1274126177);return ((z^(z>>>16))>>>0)/4294967295}
function noise(x:number,y:number,seed:number){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),u),mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),u),v)}
function rgb(hex:string){const v=hex.replace('#','');return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16)]}
export function cloudBitmap(s:CloudSettings,small=false,large=false){
  // Render above the largest CSS display size so the soft cloud edges stay detailed
  // on high density mobile screens and wide desktop stages.
  const width=small?360:large?1280:960,height=small?216:large?768:576;
  const key=[width,s.humidity,s.height,s.nuclei,s.color,s.shadow,s.depth,s.lightX,s.cloudType,s.modelVersion===2?s.growth:'old',s.modelVersion===2?s.energy:'',s.modelVersion===2?s.wind:'',s.modelVersion===2?Math.round(s.angle/6):''].join('-');
  const cached=bitmapCache.get(key);if(cached)return cached;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:false})!;
  const img=ctx.createImageData(width,height),d=img.data;
  const state=cloudState(s),rise=clamp((s.height-state.base)/1300),wet=s.humidity/100,seed=31;
  const newModel=s.modelVersion===2,growth=(s.growth??35)/100,view=(newModel?Math.round(s.angle/6)*6:0)*Math.PI/180;
  const wind=clamp((s.wind??40)/100),energy=clamp(s.energy/100),nuclei=clamp(s.nuclei/100);
  const phase=s.humidity*.097+s.height*.0031+s.nuclei*.071;
  const type=s.cloudType||'cumulus';
  const wispy=type==='cirrus',cells=type==='cirrocumulus'||type==='altocumulus'||type==='stratocumulus';
  const sheet=type==='cirrostratus'||type==='altostratus'||type==='stratus'||type==='nimbostratus';
  const tower=type==='cumulonimbus';
  const microSeed=(Math.imul(s.humidity,73856093)^Math.imul(s.height,19349663)^(newModel?0:Math.imul(s.nuclei,83492791))^Math.imul(s.shadow,2654435761)^Math.imul(s.depth,104729)^Math.imul(s.lightX,49999))>>>0;
  const lobes=Array.from({length:newModel?18:10},(_,i)=>{const t=(i%(newModel?9:10))/(newModel?8:9),z=newModel?(i<9?-.32:.32)+Math.sin(i*1.71+phase)*.11:0;return {cx:((t-.5)*1.65)*Math.cos(view)+z*Math.sin(view)+Math.sin(phase*.6+i*2.1)*.025,cy:.055+Math.sin(i*2.13+phase*.45)*(.11+s.depth/1100)-.19*Math.sin(Math.PI*t)-z*.035,rx:(.22+.06*Math.sin(i*3.7+phase*.22))*(.84+wet*.32)*(newModel?.72+growth*.55:1),ry:(.29+.09*Math.cos(i*1.7+phase*.31))*(.72+s.depth/190)*(newModel?.78+energy*.22:1)}});
  const [red,green,blue]=rgb(s.color),shadow=s.shadow/100,depth=s.depth/100,light=s.lightX/100;
  const vapor=newModel?state.visibility*(.80+growth*.12+nuclei*.08):state.formed?.085+.915*Math.pow(s.nuclei/100,.82):.025+wet*.025;
  const offsetX=s.humidity*.011+s.height*.0007,offsetY=s.nuclei*.012+s.height*.0004;
  // Rising force mainly changes height; elapsed growth mainly fills and widens
  // the silhouette. Layers have less upward motion than cumulus towers.
  const verticalScale=newModel?(sheet?.88+energy*.11:wispy?.90+energy*.12:cells?.76+energy*.28:.62+energy*.65):1;
  const stretch=newModel?1+(wind-.4)*(wispy?.52:sheet?.40:.30)+growth*(sheet?.12:wispy?.07:cells?.08:.06):1;
  const shear=newModel?(wind-.4)*(wispy?.20:sheet?.11:.14):0;
  for(let py=0;py<height;py++){
    const y=((py/height-.5)*2.1)/verticalScale;
    for(let px=0;px<width;px++){
      const x=((px/width-.5)*2.35-shear*y)/stretch;
      if(Math.abs(x)>1.2||Math.abs(y)>.98)continue;
      // Fade at the visible canvas edge as well as in cloud space. Strong wind
      // otherwise stretches a band past the bitmap and leaves a cut-off edge.
      const frameEdge=clamp(Math.min(px,width-1-px)/(width*.105));
      let envelope=0;
      if(wispy){
        for(let strand=0;strand<12;strand++){
          const baseline=(strand-5.5)*.068+Math.sin(x*2.5+strand*1.9+phase*.15+view)*.043+x*(strand%2?-.08:.07)+Math.sin(x*10.3+strand*2.7)*.014;
          const distance=Math.abs(y-baseline);
          const strandX=x+(strand-5.5)*.034;
          const span=clamp((.93-Math.abs(strandX))/.38);
          const featherNoise=noise(x*13+strand*.91,y*25,seed+strand);
          const feathers=clamp((featherNoise-.22)*1.55)*(.76+noise(x*35+strand,y*20,seed+17)*.28);
          envelope=Math.max(envelope,Math.exp(-Math.pow(distance/(.013+strand*.0011),2))*span*feathers);
        }
      }else if(cells){
        const rows=type==='cirrocumulus'?5:type==='altocumulus'?3:2;
        const cols=type==='cirrocumulus'?14:type==='altocumulus'?9:6;
        for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
          const jitter=hash(col,row,microSeed),cx=(col-(cols-1)/2)*(1.95/cols)+(jitter-.5)*.035+Math.sin(view+row*.7)*.025;
          const cy=(row-(rows-1)/2)*(type==='stratocumulus'?.27:.20)+(hash(row,col,microSeed)-.5)*.045;
          const rx=(type==='stratocumulus'?.19:type==='altocumulus'?.125:.073)*(0.68+growth*.46)*(0.83+jitter*.4);
          const ry=rx*(type==='stratocumulus'?.78:.61);
          envelope=Math.max(envelope,Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2)));
        }
      }else if(sheet){
        const bands=type==='nimbostratus'?3:type==='altostratus'?2:1;
        for(let band=0;band<bands;band++){
          const center=(band-(bands-1)/2)*.19+Math.sin(x*3+band*2+phase*.12+view)*.04+(noise(x*3+band,y*2,seed+91)-.5)*.105;
          const width=type==='cirrostratus'?.22:type==='nimbostratus'?.29:type==='altostratus'?.24:.20;
          const thickness=width*(.58+growth*.43+noise(x*4+band,y*2,seed+41)*.34);
          envelope=Math.max(envelope,Math.exp(-Math.pow(Math.abs((y-center)/thickness),2.7))*Math.exp(-Math.pow(Math.abs(x/1.02),4)));
        }
        // Keep the broad sheet stable while breaking up its otherwise straight ends
        // with small, deterministic mist fragments.
        for(let puff=0;puff<12;puff++){
          const side=puff<6?-1:1,index=puff%6;
          const jitter=hash(index,puff,microSeed+71);
          const cx=side*(.87+jitter*.22),cy=(index-2.5)*.095+(hash(puff,index,microSeed+89)-.5)*.09;
          const rx=.12+jitter*.075,ry=.075+hash(index+3,puff,microSeed+97)*.075;
          envelope=Math.max(envelope,Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2))*(.42+jitter*.28));
        }
      }else if(tower){
        for(let l=0;l<15;l++){
          const t=l/14,cx=Math.sin(l*1.73+phase*.15+view)*(.11+t*.055),cy=.37-t*(newModel?.38+energy*.68:.87);
          const rx=(.22+(1-t)*.33+(t>.76?.13:0))*(newModel?.69+growth*.49:1),ry=.12+(1-t)*.06;
          envelope=Math.max(envelope,Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2)));
        }
        envelope=Math.max(envelope,Math.exp(-Math.pow(x/.96,4)-Math.pow((y-.34)/.15,2))*.94);
      }else{
        for(const l of lobes){const dx=(x-l.cx)/l.rx,dy=(y-l.cy)/l.ry;const value=Math.exp(-(dx*dx+dy*dy)*1.33);if(value>envelope)envelope=value}
        const bottom=Math.exp(-((x/.95)**2+((y-.22)/.25)**2)*1.25)*.78;
        envelope=clamp(Math.max(envelope,bottom)+bottom*.38);
      }
      envelope*=frameEdge;
      if(envelope<.08)continue;
      const n1=noise(x*7.4+offsetX,y*7.4+offsetY,seed),n2=noise(x*19+offsetX*2,y*19+offsetY*2,seed+17),n3=noise(x*(34+nuclei*12)+offsetX*3,y*(34+nuclei*12)+offsetY*3,microSeed),n4=noise(x*71+offsetX*5,y*71+offsetY*5,microSeed+113);
      const turbulence=(n1-.5)*(.26+depth*.15)+(n2-.5)*.13+(n3-.5)*(newModel?.045+nuclei*.035:.045)+(n4-.5)*(sheet?.045:.025);
      const density=envelope+turbulence-(wispy?.16:sheet?.22:.29-wet*.03-rise*.04)+(newModel?growth*.07:0);
      const alpha=clamp((density-.005)/(wispy?.32:sheet?.31:.22))*(.80+depth*.18)*vapor*(type==='cirrostratus'?.52:type==='nimbostratus'?1:.95);
      if(alpha<=.008)continue;
      const lightGradient=clamp(.77-y*.27+(light-.5)*x*.22+(n1-.5)*.23+(n2-.5)*.17+(n3-.5)*.09+(n4-.5)*.035);
      const underside=clamp((y+.03)*.84+.19)*(shadow*.88+depth*.13)+(type==='nimbostratus'? .24:type==='cumulonimbus'?.11:0)+(sheet?(n1-.5)*.08:0);
      const shade=clamp(lightGradient-underside,.1,1);
      const whiten=clamp(.28+shade*.73),diffuse=shade*.68+.28;
      const i=(py*width+px)*4;
      d[i]=clamp((red*diffuse+(255-red)*whiten*.19)/255)*255;
      d[i+1]=clamp((green*diffuse+(255-green)*whiten*.18)/255)*255;
      d[i+2]=clamp((blue*diffuse+(255-blue)*whiten*.2)/255)*255;
      d[i+3]=Math.round(alpha*255);
    }
  }
  if(photoReady&&photo){
    const texture=document.createElement('canvas');texture.width=width;texture.height=height;
    const tc=texture.getContext('2d',{willReadFrequently:true})!;
    tc.imageSmoothingEnabled=true;tc.imageSmoothingQuality='high';
    const scaleX=wispy?.92:sheet?1.12:cells?1.03:.83+wet*.17;
    const scaleY=wispy?.65:sheet?.74:cells?.85:.69+depth*.1+rise*.04;
    const dw=width*scaleX,dh=height*scaleY;
    const shift=Math.sin(phase*.87)*width*.016;
    if(wispy||sheet||cells){
      // A close crop of the photographic cloud supplies grain and soft light
      // inside each genus's own silhouette, without imposing a cumulus shape.
      tc.drawImage(photo,photo.width*.23,photo.height*.38,photo.width*.54,photo.height*.40,0,0,width,height);
    }else tc.drawImage(photo,(width-dw)/2+shift,(height-dh)/2-height*.025,dw,dh);
    const p=tc.getImageData(0,0,width,height).data;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      const procedural=d[i+3]/255;
      // The source photograph is fully opaque. Its alpha channel must never
      // define the silhouette, otherwise the cloud becomes a blurred rectangle.
      // Use it only as fine internal luminance and colour texture, clipped by
      // the density field calculated above.
      if(procedural<.004)continue;
      const brightness=(p[i]+p[i+1]+p[i+2])/765;
      const shadowFactor=1-shadow*.72*clamp((y/height-.25)*1.85);
      const contrast=1+(depth-.5)*.54;
      const sideLight=1+(light-.5)*(x/width-.5)*.44;
      const edge=clamp((.72-procedural)/.55)*clamp((procedural-.035)/.16);
      const photoBlend=(tower?.36:wispy?.30:sheet?.52:cells?.44:.58)*(1-edge*.34)*clamp((p[i+3]/255-.05)/.45);
      for(let channel=0;channel<3;channel++){
        const tint=[red,green,blue][channel]/248;
        const fringe=clamp((p[i+2]-p[i]-24)/70)*.88;
        const neutral=(p[i]+p[i+1]+p[i+2])/3;
        const photoChannel=mix(p[i+channel],neutral,fringe);
        const photographed=clamp(((photoChannel/255-.5)*contrast+.5)*tint*shadowFactor*sideLight);
        const rimLight=edge*(.10+.11*(1-shadow))*(channel===2?1.04:1);
        d[i+channel]=Math.round(clamp(mix(d[i+channel]/255,photographed,photoBlend)+rimLight)*255);
      }
      const textureDensity=.94+(brightness-.5)*.10;
      d[i+3]=Math.round(clamp(procedural*textureDensity)*255);
    }
  }
  ctx.putImageData(img,0,0);
  // High resolution canvases are large; retain only the most recent experiment states.
  if(bitmapCache.size>14)bitmapCache.delete(bitmapCache.keys().next().value!);
  bitmapCache.set(key,canvas);return canvas;
}
export function drawCloud(canvas:HTMLCanvasElement,s:CloudSettings,small=false,large=false){
  const bitmap=cloudBitmap(s,small,large);canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d')!,w=canvas.width,h=canvas.height;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.clearRect(0,0,w,h);
  const radians=(s.angle%360)*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
  const widthFactor=.62+.38*Math.abs(cos),facing=cos<0?-1:1;
  ctx.save();ctx.translate(w/2,h/2);
  if(s.modelVersion!==2)ctx.transform(widthFactor*facing,0,-sin*.13,1,sin*w*.035,0);
  const size=s.modelVersion===2?.84+.16*(s.nuclei/100):.44+.56*Math.pow(s.nuclei/100,.43);
  ctx.scale(size,size);
  // Preserve clouds published before formation conditions determined the genus.
  if(s.modelVersion===2||!cloudState(s).formed||s.cloudType!==cloudTypeFromConditions({...s,layer:s.layer})){ctx.drawImage(bitmap,-w/2,-h/2,w,h);ctx.restore();return}
  const level=s.skyLevel??(s.layer==='high'?100:s.layer==='mid'?50:0);
  const low=cloudTypeFromConditions({...s,layer:'low'}),mid=cloudTypeFromConditions({...s,layer:'mid'}),high=cloudTypeFromConditions({...s,layer:'high'});
  const transition=(value:number,start:number,end:number)=>{const t=clamp((value-start)/(end-start));return t*t*(3-2*t)};
  const mixLow=transition(level,20,47),mixHigh=transition(level,53,80);
  const layers:[CloudSettings['layer'],number][]=[['low',1-mixLow],['mid',mixLow*(1-mixHigh)],['high',mixHigh]];
  const flows=['streak','ripple','rise','spread'] as const;
  const wind=clamp((s.wind??({streak:0,ripple:33,rise:67,spread:100}[s.flow]))/100)*3;
  const first=Math.min(2,Math.floor(wind)),blend=wind-first;
  for(const [layerType,layerOpacity] of layers){
    if(layerOpacity<.005)continue;
    for(const [flow,flowOpacity] of [[flows[first],1-blend],[flows[first+1],blend]] as const){
      const opacity=layerOpacity*flowOpacity;
      if(opacity<.005)continue;
      const type=cloudTypeFromConditions({...s,layer:layerType,flow});
      ctx.globalAlpha=opacity;
      ctx.drawImage(type===s.cloudType?bitmap:cloudBitmap({...s,cloudType:type},small,large),-w/2,-h/2,w,h);
    }
  }
  ctx.restore();
}
