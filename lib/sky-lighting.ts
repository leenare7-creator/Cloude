import type {CloudSettings} from './cloud-model';

export type SkyTime='dawn'|'day'|'sunset'|'night';
export type SkyWeather='clear'|'cloudy'|'rain'|'storm';
/** Only changes lighting; the saved cloud's shape and experimental inputs stay intact. */
export function cloudInSky(s:CloudSettings,time:SkyTime,weather:SkyWeather):CloudSettings{
 const light={dawn:{tint:'#ffe2c7',mix:.5,x:12,shadow:40},day:{tint:'#f5f8fa',mix:.18,x:84,shadow:32},sunset:{tint:'#ffc294',mix:.55,x:88,shadow:48},night:{tint:'#8799c6',mix:.65,x:13,shadow:65}}[time];
 const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const original=rgb(s.color),tint=rgb(light.tint);
 const color='#'+original.map((v,i)=>Math.round(v*(1-light.mix)+tint[i]*light.mix).toString(16).padStart(2,'0')).join('');
 const cover={clear:0,cloudy:10,rain:19,storm:28}[weather];
 return {...s,color,lightX:light.x,shadow:Math.min(95,light.shadow+cover)};
}

export function skyExposure(time:SkyTime,weather:SkyWeather){
 return {dawn:.9,day:1,sunset:.86,night:.62}[time]*{clear:1,cloudy:.94,rain:.86,storm:.72}[weather];
}
