import type { CloudType,CloudLayer,CloudFlow,LiftSource } from './cloud-model';

export type CloudRecord = {id:number;maker:string;humidity:number;height:number;nuclei:number;decoration:string;angle:number;color:string;shadow:number;depth:number;lightX:number;rain:number;cloudType:CloudType;layer:CloudLayer;skyLevel:number;flow:CloudFlow;wind:number;energy:number;createdAt:string;liftSource?:LiftSource;growth?:number;modelVersion?:2};
const endpoint='https://cttqhovktdonopsycnyp.supabase.co/rest/v1/cloud_library';
// Supabase publishable keys are intended for public use. Access is restricted by table grants and RLS.
const publishableKey='sb_publishable_ml0UzaQA5j42pXmm9eAq-Q_UXlL6StQ';
const headers={'apikey':publishableKey,'Content-Type':'application/json'};
type Row=Omit<CloudRecord,'lightX'|'cloudType'|'skyLevel'|'createdAt'> & {light_x:number;cloud_type:CloudType;sky_level:number;created_at:string};
const sources=['sun','front','mountain','night','upper'];
const fromRow=(row:Row):CloudRecord=>{
  const {light_x,cloud_type,sky_level,created_at,...rest}=row;
  let meta:{modelVersion?:2;liftSource?:LiftSource;growth?:number}={};
  try{const data=JSON.parse(row.decoration) as Record<string,unknown>;if(data.modelVersion===2&&sources.includes(String(data.liftSource))&&Number.isInteger(data.growth)&&Number(data.growth)>=0&&Number(data.growth)<=100)meta={modelVersion:2,liftSource:data.liftSource as LiftSource,growth:Number(data.growth)}}catch{}
  return {...rest,lightX:light_x,cloudType:cloud_type,skyLevel:sky_level,createdAt:created_at,...meta};
};
export async function latestClouds(before?:number):Promise<{clouds:CloudRecord[];nextCursor:number|null}> {
  const url=new URL(endpoint);url.searchParams.set('select','*');url.searchParams.set('order','id.desc');url.searchParams.set('limit','25');if(before)url.searchParams.set('id',`lt.${before}`);
  const response=await fetch(url,{headers,cache:'no-store'});
  if(!response.ok)throw Error(`Cloud library read failed: ${response.status}`);
  const rows=await response.json() as Row[];const clouds=rows.slice(0,24).map(fromRow);
  return {clouds,nextCursor:rows.length>24?clouds[clouds.length-1].id:null};
}
export async function cloudsByIds(ids:number[]):Promise<CloudRecord[]> {
  const unique=[...new Set(ids)].filter(id=>Number.isSafeInteger(id)&&id>0).slice(0,30);
  if(unique.length===0)return [];
  const url=new URL(endpoint);url.searchParams.set('select','*');url.searchParams.set('id',`in.(${unique.join(',')})`);url.searchParams.set('limit','30');
  const response=await fetch(url,{headers,cache:'no-store'});
  if(!response.ok)throw Error(`Cloud library read failed: ${response.status}`);
  return (await response.json() as Row[]).map(fromRow);
}
export async function saveCloud(cloud:Omit<CloudRecord,'id'|'createdAt'>):Promise<CloudRecord> {
  const {lightX,cloudType,skyLevel,liftSource,growth,modelVersion,...rest}=cloud;
  const response=await fetch(endpoint,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({...rest,light_x:lightX,cloud_type:cloudType,sky_level:skyLevel}),cache:'no-store'});
  if(!response.ok)throw Error(`Cloud library write failed: ${response.status}`);
  const rows=await response.json() as Row[];if(!rows[0])throw Error('Cloud library returned no record');return fromRow(rows[0]);
}
