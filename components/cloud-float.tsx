import type {CSSProperties,ReactNode} from 'react';

/** Move the visual and its hit targets together, without changing saved coordinates. */
export function CloudFloat({wind=0,phase=0,paused=false,children}:{wind?:number;phase?:number;paused?:boolean;children:ReactNode}){
 const strength=Math.max(0,Math.min(100,wind))/100;
 const style={
  '--cloud-drift':`${5+strength*13}px`,
  '--cloud-bob':`${4+strength*3}px`,
  '--cloud-duration':`${18-strength*6}s`,
  '--cloud-delay':`${-(Math.abs(phase*.61803398875)%1)*18}s`,
  animationPlayState:paused?'paused':'running',
 } as CSSProperties;
 return <div className="cloud-float" style={style}>{children}</div>;
}
