export type SharedPlacedCloud={instanceId:number;cloudId:number;x:number;y:number;scale:number};
export type SharedWeather="clear"|"cloudy"|"rain"|"storm";
export type SharedSunKind="round"|"radiant"|"soft";
export type SharedTimeOfDay="dawn"|"day"|"sunset"|"night";
export type SavedSkyRecord={id:number;name:string;weather:SharedWeather;sunKind:SharedSunKind;time:SharedTimeOfDay;placed:SharedPlacedCloud[];savedAt:string};

const endpoint="https://cttqhovktdonopsycnyp.supabase.co/rest/v1/saved_skies";
const publishableKey="sb_publishable_ml0UzaQA5j42pXmm9eAq-Q_UXlL6StQ";
const headers={apikey:publishableKey,"Content-Type":"application/json"};
type Row={id:number;name:string;weather:SharedWeather;sun_kind:SharedSunKind;time_of_day:SharedTimeOfDay;placed:unknown;created_at:string};

const finite=(value:unknown,fallback:number)=>typeof value==="number"&&Number.isFinite(value)?value:fallback;
const fromRow=(row:Row):SavedSkyRecord=>({
 id:row.id,
 name:String(row.name).slice(0,18),
 weather:["clear","cloudy","rain","storm"].includes(row.weather)?row.weather:"clear",
 sunKind:["round","radiant","soft"].includes(row.sun_kind)?row.sun_kind:"radiant",
 time:["dawn","day","sunset","night"].includes(row.time_of_day)?row.time_of_day:"day",
 placed:Array.isArray(row.placed)?row.placed.flatMap((item,index)=>{
  if(!item||typeof item!=="object")return [];
  const value=item as Record<string,unknown>,cloudId=finite(value.cloudId,0);
  if(cloudId<=0)return [];
  return [{instanceId:Math.max(1,Math.round(finite(value.instanceId,index+1))),cloudId:Math.round(cloudId),x:Math.max(5,Math.min(95,finite(value.x,50))),y:Math.max(12,Math.min(76,finite(value.y,43))),scale:Math.max(.5,Math.min(1.8,finite(value.scale,1)))}];
 }):[],
 savedAt:row.created_at,
});

export async function latestSavedSkies():Promise<SavedSkyRecord[]>{
 const url=new URL(endpoint);url.searchParams.set("select","*");url.searchParams.set("order","id.desc");url.searchParams.set("limit","50");
 const response=await fetch(url,{headers,cache:"no-store"});
 if(!response.ok)throw Error(`Saved skies read failed: ${response.status}`);
 return (await response.json() as Row[]).map(fromRow);
}

export async function saveSharedSky(sky:Omit<SavedSkyRecord,"id"|"savedAt">):Promise<SavedSkyRecord>{
 const response=await fetch(endpoint,{method:"POST",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify({name:sky.name,weather:sky.weather,sun_kind:sky.sunKind,time_of_day:sky.time,placed:sky.placed}),cache:"no-store"});
 if(!response.ok)throw Error(`Saved skies write failed: ${response.status}`);
 const rows=await response.json() as Row[];
 if(!rows[0])throw Error("Saved skies returned no record");
 return fromRow(rows[0]);
}
