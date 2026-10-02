import {CloudSettings} from './cloud-model';
import {drawCloud,waitForCloudTexture} from './cloud-render';
import {skyPalette} from './sky-palette';
function seeded(i:number){const x=Math.sin(i*91.73+23.61)*43758.5453;return x-Math.floor(x)}
export function paintRain(ctx:CanvasRenderingContext2D,s:CloudSettings,x:number,y:number,w:number,h:number){
  const count=Math.round(s.rain*.9);
  if(!count)return;
  ctx.save();ctx.lineCap='round';
  for(let i=0;i<count;i++){
    const dx=x+seeded(i+11)*w,dy=y+seeded(i+67)*h*.74;
    const len=h*(.045+seeded(i+127)*.055);
    ctx.strokeStyle=`rgba(221,246,255,${.25+s.rain/100*.43})`;
    ctx.lineWidth=Math.max(1,w*.0018);
    ctx.beginPath();ctx.moveTo(dx,dy);ctx.lineTo(dx-w*.018,dy+len);ctx.stroke();
  }
  ctx.restore();
}
async function skyImage(s:CloudSettings){const img=new Image();img.src=`/lift-${s.liftSource??'sun'}.webp`;await img.decode();return img}
export async function cloudPngBlob(s:CloudSettings,maker:string){
  const [sky]=await Promise.all([skyImage(s),waitForCloudTexture()]);
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;
  const ctx=canvas.getContext('2d')!;
  const scale=Math.max(canvas.width/sky.width,canvas.height/sky.height),sw=canvas.width/scale,sh=canvas.height/scale;
  ctx.drawImage(sky,(sky.width-sw)/2,(sky.height-sh)/2,sw,sh,0,0,1600,1000);
  const palette=skyPalette(s);
  const wash=ctx.createLinearGradient(0,0,0,1000);
  wash.addColorStop(0,palette.top);wash.addColorStop(1,palette.bottom);
  ctx.fillStyle=wash;ctx.fillRect(0,0,1600,1000);
  ctx.fillStyle=palette.veil;ctx.fillRect(0,0,1600,1000);
  const cloud=document.createElement('canvas');drawCloud(cloud,s,false,true);
  ctx.drawImage(cloud,200,120,1200,720);
  paintRain(ctx,s,320,565,970,355);
  const label=`${maker}의 구름`;
  ctx.font='bold 36px system-ui, sans-serif';
  const tw=ctx.measureText(label).width;
  ctx.fillStyle='rgba(9,62,91,.70)';ctx.beginPath();ctx.roundRect(55,900,tw+70,70,18);ctx.fill();
  ctx.fillStyle='#fff';ctx.fillText(label,90,948);
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('이미지를 만들 수 없어요.')),'image/png'));
}
