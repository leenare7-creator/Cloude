export type SunAppearance='round'|'radiant'|'soft';
/** Shared optical treatment for the editor and saved image. */
export function drawSkySun(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,kind:SunAppearance,warm=false){
 const halo=kind==='soft'?5.5:kind==='radiant'?5:2.8;
 ctx.save();
 const glow=ctx.createRadialGradient(x,y,r*.35,x,y,r*halo);
 glow.addColorStop(0,warm?'rgba(255,209,132,.8)':'rgba(255,247,215,.85)');
 glow.addColorStop(.25,warm?'rgba(255,183,95,.35)':'rgba(255,242,199,.3)');
 glow.addColorStop(.6,'rgba(255,239,207,.08)');glow.addColorStop(1,'rgba(255,239,207,0)');
 ctx.fillStyle=glow;ctx.fillRect(x-r*halo,y-r*halo,r*halo*2,r*halo*2);
 if(kind==='radiant'){
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let i=0;i<3;i++){
   ctx.save();ctx.translate(x,y);ctx.rotate(i*Math.PI/3+.18);
   const beam=ctx.createLinearGradient(-r*4,0,r*4,0);
   beam.addColorStop(0,'rgba(255,250,225,0)');beam.addColorStop(.25,'rgba(255,250,225,.13)');beam.addColorStop(.4,'rgba(255,250,225,.32)');beam.addColorStop(.5,'rgba(255,255,245,.8)');beam.addColorStop(.6,'rgba(255,250,225,.32)');beam.addColorStop(.75,'rgba(255,250,225,.13)');beam.addColorStop(1,'rgba(255,250,225,0)');
   ctx.filter=`blur(${r*.07}px)`;ctx.fillStyle=beam;ctx.beginPath();ctx.ellipse(0,0,r*4,r*(i%2?.045:.085),0,0,Math.PI*2);ctx.fill();ctx.restore();
  }ctx.restore();
 }
 ctx.save();if(kind==='soft')ctx.filter=`blur(${r*.28}px)`;else ctx.filter=`blur(${r*.015}px)`;
 const disc=ctx.createRadialGradient(x-r*.22,y-r*.25,0,x,y,r);
 disc.addColorStop(0,kind==='radiant'?'#ffffff':warm?'#fff3cc':'#fffde9');
 disc.addColorStop(.78,warm?'#ffe0a0':'#fff9d6');disc.addColorStop(1,warm?'#ffba69':'#ffeeb2');
 ctx.fillStyle=disc;ctx.globalAlpha*=kind==='soft'?.62:1;ctx.beginPath();ctx.arc(x,y,kind==='soft'?r*.9:r,0,Math.PI*2);ctx.fill();ctx.restore();ctx.restore();
}
