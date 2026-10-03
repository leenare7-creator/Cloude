"use client";

import {useEffect,useRef} from 'react';
import type {CloudSettings} from '@/lib/cloud-model';
import {cloudState} from '@/lib/cloud-model';
import {drawCloud,subscribeCloudTexture} from '@/lib/cloud-render';

export function CloudThree({settings,interactive=false,onReady}:{settings:CloudSettings;interactive?:boolean;onReady?:(ready:boolean)=>void}){
  const host=useRef<HTMLDivElement>(null);
  const settingsRef=useRef(settings);
  settingsRef.current=settings;
  const interactiveRef=useRef(interactive);interactiveRef.current=interactive;

  useEffect(()=>{
    let disposed=false,frame=0;
    let cleanup=()=>{};
    onReady?.(false);

    // The saved image's density field defines one continuous silhouette.
    // Separate translucent sprites caused the circular seams in the screenshot.
    import('three').then(THREE=>{
      if(disposed||!host.current)return;
      const mount=host.current;
      const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
      renderer.setClearColor(0x000000,0);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.domElement.className='cloud-three-canvas';
      mount.appendChild(renderer.domElement);

      const scene=new THREE.Scene();
      const camera=new THREE.OrthographicCamera(-5,5,3,-3,.1,100);
      camera.position.z=10;
      const cloudCanvas=document.createElement('canvas');
      // The GPU texture keeps a fixed size while the CPU preview may be smaller.
      cloudCanvas.width=960;cloudCanvas.height=576;
      const rasterCanvas=document.createElement('canvas');
      const cloudContext=cloudCanvas.getContext('2d')!;
      const texture=new THREE.CanvasTexture(cloudCanvas);
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.minFilter=THREE.LinearFilter;
      texture.magFilter=THREE.LinearFilter;
      const geometry=new THREE.PlaneGeometry(10,6,24,12);
      const positions=geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i)/5,y=positions.getY(i)/3;
        positions.setZ(i,.18*(1-x*x)*(1-y*y));
      }
      positions.needsUpdate=true;
      geometry.computeVertexNormals();
      const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});
      scene.add(new THREE.Mesh(geometry,material));

      let needsCheck=true,contextOkay=true,lastKey='',reportedReady=false;
      const redraw=()=>{
        if(disposed)return;
        drawCloud(rasterCanvas,settingsRef.current,interactiveRef.current);
        cloudContext.clearRect(0,0,cloudCanvas.width,cloudCanvas.height);
        cloudContext.imageSmoothingEnabled=true;cloudContext.imageSmoothingQuality='high';
        cloudContext.drawImage(rasterCanvas,0,0,cloudCanvas.width,cloudCanvas.height);
        texture.needsUpdate=true;
        needsCheck=true;
      };
      const unsubscribe=subscribeCloudTexture(redraw);
      const resize=new ResizeObserver(()=>{
        const rect=mount.getBoundingClientRect();
        const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
        renderer.setSize(width,height,false);
        camera.left=-3*width/height;camera.right=3*width/height;
        camera.updateProjectionMatrix();
        needsCheck=true;
      });
      resize.observe(mount);
      redraw();
      const contextLost=(event:Event)=>{event.preventDefault();contextOkay=false;reportedReady=false;onReady?.(false)};
      const contextRestored=()=>{contextOkay=true;redraw()};
      renderer.domElement.addEventListener('webglcontextlost',contextLost);
      renderer.domElement.addEventListener('webglcontextrestored',contextRestored);

      const animate=()=>{
        if(disposed)return;
        const s=settingsRef.current;
        const key=[s.humidity,s.height,s.nuclei,s.wind,s.energy,s.angle,s.color,s.shadow,s.depth,s.lightX,s.cloudType,s.growth,interactiveRef.current].join('|');
        if(key!==lastKey){lastKey=key;redraw()}
        if(contextOkay){
          try{
            renderer.render(scene,camera);
            if(needsCheck){
              needsCheck=false;
              const state=cloudState(s);
              let visible=false;
              if(state.formed&&state.visibility>.015&&!reportedReady){
                const gl=renderer.getContext(),pixel=new Uint8Array(4);
                const width=renderer.domElement.width,height=renderer.domElement.height;
                for(let y=0;y<5&&!visible;y++)for(let x=0;x<7&&!visible;x++){
                  gl.readPixels(Math.floor(width*(.2+x*.1)),Math.floor(height*(.3+y*.1)),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
                  visible=pixel[3]>8;
                }
              }
              const next=state.formed&&(reportedReady||visible);if(next!==reportedReady){reportedReady=next;onReady?.(next);}
            }
          }catch(error){
            console.error('Cloud WebGL rendering failed',error);
            onReady?.(false);
            return;
          }
        }
        frame=requestAnimationFrame(animate);
      };
      frame=requestAnimationFrame(animate);
      cleanup=()=>{
        cancelAnimationFrame(frame);
        unsubscribe();resize.disconnect();
        renderer.domElement.removeEventListener('webglcontextlost',contextLost);
        renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);
        geometry.dispose();material.dispose();texture.dispose();renderer.dispose();renderer.domElement.remove();
      };
    }).catch(error=>{console.error('Cloud Three.js initialization failed',error);onReady?.(false)});

    return()=>{disposed=true;cleanup()};
  },[onReady]);

  return <div ref={host} className="cloud-three" aria-hidden="true"/>;
}
