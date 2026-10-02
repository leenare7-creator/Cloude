import { NextResponse } from "next/server";
import { latestClouds, saveCloud } from "@/lib/clouds";
import { cloudState, deriveCloud, type CloudSettings,type CloudFlow,type LiftSource } from "@/lib/cloud-model";

export async function GET(request:Request){
  const raw=new URL(request.url).searchParams.get("before");
  const before=raw===null?undefined:Number(raw);
  if(raw!==null&&(!Number.isSafeInteger(before)||Number(before)<=0))return NextResponse.json({error:"페이지 번호가 올바르지 않아요."},{status:400});
  try{return NextResponse.json(await latestClouds(before),{headers:{"Cache-Control":"no-store"}})}
  catch(e){console.error("cloud library read",e);return NextResponse.json({error:"구름 도서관을 불러오지 못했어요. 다시 시도해 주세요."},{status:503})}
}
export async function POST(request:Request){
  try{
    const data=await request.json() as Record<string,unknown>;
    const maker=typeof data.maker==="string"?data.maker.trim():"";
    const isInt=(v:unknown,min:number,max:number,step:number)=>Number.isInteger(v)&&Number(v)>=min&&Number(v)<=max&&Number(v)%step===0;
    const version=data.modelVersion===2;
    if(!maker||[...maker].length>12||/[<>\r\n]/.test(maker)||!isInt(data.humidity,0,100,1)||!isInt(data.height,0,2500,1)||!isInt(data.nuclei,0,100,1)||!isInt(data.angle,0,359,1)||!isInt(data.shadow,0,100,1)||!isInt(data.depth,0,100,1)||!isInt(data.lightX,0,100,1)||!isInt(data.energy,0,100,1)||!isInt(data.skyLevel,0,100,1)||!isInt(data.wind??({streak:0,ripple:33,rise:67,spread:100}[String(data.flow) as CloudFlow]),0,100,1)||!['rise','spread','ripple','streak'].includes(String(data.flow))||typeof data.color!=="string"||!/^#[0-9a-fA-F]{6}$/.test(data.color)||(version&&(!['sun','front','mountain','night','upper'].includes(String(data.liftSource))||!isInt(data.growth,0,100,1))))return NextResponse.json({error:"입력값을 다시 확인해 주세요."},{status:400});
    const {humidity,height,nuclei,angle,shadow,depth,lightX,energy}=data as Record<string,number>;
    const settings=deriveCloud({humidity,height,nuclei,angle,shadow,depth,lightX,energy,wind:Number(data.wind??({streak:0,ripple:33,rise:67,spread:100}[String(data.flow) as CloudFlow])),skyLevel:Number(data.skyLevel),color:data.color as string,layer:'low',flow:data.flow as CloudFlow,rain:0,cloudType:'cumulus',...(version?{modelVersion:2 as const,liftSource:data.liftSource as LiftSource,growth:Number(data.growth)}:{})} satisfies CloudSettings);
    if(!cloudState(settings).formed)return NextResponse.json({error:"구름이 완성된 뒤 올릴 수 있어요."},{status:400});
    return NextResponse.json({cloud:await saveCloud({...settings,maker,decoration:version?JSON.stringify({modelVersion:2,liftSource:settings.liftSource,growth:settings.growth}):"none"})},{status:201});
  }catch(e){console.error("cloud library write",e);return NextResponse.json({error:"구름을 올리지 못했어요. 잠시 뒤 다시 눌러 주세요."},{status:503})}
}
