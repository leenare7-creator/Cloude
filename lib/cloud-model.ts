export const CLOUD_TYPES=[
 {id:'cirrus',name:'권운',hint:'높이 떠 있는 깃털'},
 {id:'cirrocumulus',name:'권적운',hint:'작은 물결 무늬'},
 {id:'cirrostratus',name:'권층운',hint:'얇은 하늘 베일'},
 {id:'altocumulus',name:'고적운',hint:'중간 하늘의 조각'},
 {id:'altostratus',name:'고층운',hint:'넓게 덮인 회색빛'},
 {id:'stratocumulus',name:'층적운',hint:'겹겹이 모인 덩이'},
 {id:'stratus',name:'층운',hint:'낮게 깔린 이불'},
 {id:'cumulus',name:'적운',hint:'몽글몽글 솟은 구름'},
 {id:'nimbostratus',name:'난층운',hint:'비를 품은 두꺼운 층'},
 {id:'cumulonimbus',name:'적란운',hint:'높이 솟은 비구름'},
] as const;
export type CloudType=(typeof CLOUD_TYPES)[number]['id'];
export type CloudLayer='low'|'mid'|'high';
export type CloudFlow='rise'|'spread'|'ripple'|'streak';
export type LiftSource='sun'|'front'|'mountain'|'night'|'upper';
export type CloudSettings={humidity:number;height:number;nuclei:number;layer:CloudLayer;skyLevel:number;flow:CloudFlow;wind:number;energy:number;angle:number;color:string;shadow:number;depth:number;lightX:number;rain:number;cloudType:CloudType;liftSource?:LiftSource;growth?:number;modelVersion?:2};
export const DEFAULT_CLOUD:CloudSettings={humidity:0,height:0,nuclei:0,layer:'low',skyLevel:0,flow:'rise',wind:40,energy:50,growth:35,liftSource:'sun',modelVersion:2,angle:0,color:'#f5f8fa',shadow:35,depth:55,lightX:25,rain:0,cloudType:'cumulus'};
const clamp=(x:number,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(x:number,a:number,b:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export const layerFromLevel=(level:number):CloudLayer=>level<29?'low':level<71?'mid':'high';
export const liftName=(source:LiftSource)=>({sun:'햇볕이 데움',front:'찬 공기가 밀어 올림',mountain:'산을 넘음',night:'땅 가까이 식음',upper:'높은 공기가 움직임'})[source];
export const stabilityName=(energy:number)=>energy<34?'올라가지 못하고 퍼져':energy<68?'조금씩 위로 자라':'높이 솟아';
export const growthName=(growth:number)=>growth<35?'막 생겼어':growth<68?'자라고 있어':'오래 자랐어';
export type CloudInfluence={label:string;value:string;level:'결정적'|'큰 영향'|'보탬';reason:string};
const influence=(label:string,value:string,level:CloudInfluence['level'],reason:string):CloudInfluence=>({label,value,level,reason});
export function cloudInfluences(s:CloudSettings):CloudInfluence[]{
 const source=s.liftSource??'sun',growth=s.growth??35,water=`${s.humidity}%`,wind=`${s.wind}`,energy=`${s.energy}`,age=growthName(growth);
 const sourceItem=influence('공기를 올린 힘',liftName(source),'결정적','구름이 생기는 높이와 움직임의 시작을 정했어.');
 const seedItem=influence('구름 씨앗',`${s.nuclei}개`,'보탬','구름 알갱이의 촘촘함과 비의 양에 보탰어.');
 switch(s.cloudType){
  case 'cirrus':return [sourceItem,influence('높은 바람',wind,'큰 영향','센 바람이 얼음 구름을 길고 가늘게 늘였어.'),influence('자란 시간',age,'보탬','자라며 깃털 같은 결이 더 길어졌어.')];
  case 'cirrocumulus':return [sourceItem,influence('높은 바람',wind,'큰 영향','너무 세거나 약하지 않은 바람이 작은 덩이를 모았어.'),influence('자란 시간',age,'큰 영향','짧게 자라 작은 물결 모양이 남았어.'),seedItem];
  case 'cirrostratus':return [sourceItem,influence('높은 바람',wind,'큰 영향','약한 바람이 얼음 구름을 얇고 넓게 남겼어.'),influence('자란 시간',age,'큰 영향','오래 자라 하늘을 덮는 베일이 됐어.')];
  case 'altocumulus':return [sourceItem,influence('구름 높이',`${Math.round(cloudState(s).baseAltitude).toLocaleString()}m`,'큰 영향','산을 오른 공기가 가운데 하늘에서 작은 덩이로 모였어.'),influence('바람',wind,'보탬','구름 조각 사이의 간격과 늘어짐을 바꿨어.'),seedItem];
  case 'altostratus':return [sourceItem,influence('자란 시간',age,'큰 영향','넓게 올라간 공기가 회색 구름층으로 자랐어.'),influence('물',water,'큰 영향','물의 양이 구름층의 두께와 밝기를 바꿨어.'),influence('바람',wind,'보탬','구름층을 옆으로 더 펼쳤어.')];
  case 'nimbostratus':return [sourceItem,influence('자란 시간',age,'결정적','오래 자라 구름층이 두껍게 쌓였어.'),influence('물',water,'결정적','많은 물이 비를 품은 구름을 만들었어.'),seedItem];
  case 'stratocumulus':return [sourceItem,influence(source==='sun'?'위로 솟는 힘':'바람',source==='sun'?energy:wind,'큰 영향',source==='sun'?'솟는 힘이 약해 위보다 옆으로 퍼졌어.':'바람이 낮은 구름을 덩이진 층으로 모았어.'),influence('자란 시간',age,'보탬','덩이의 크기와 구름층의 두께를 바꿨어.'),seedItem];
  case 'stratus':return [sourceItem,influence('바람',wind,'큰 영향','약한 바람 속에서 낮은 구름이 이불처럼 퍼졌어.'),influence('자란 시간',age,'큰 영향','천천히 식으며 낮고 얇은 층을 만들었어.'),influence('물',water,'보탬','구름층의 짙기와 안개 같은 느낌을 바꿨어.')];
  case 'cumulonimbus':return [sourceItem,influence('위로 솟는 힘',energy,'결정적','강한 상승이 구름을 높은 탑처럼 키웠어.'),influence('자란 시간',age,'결정적','오래 자라 탑의 덩이가 넓고 두꺼워졌어.'),influence('물',water,'큰 영향','많은 물이 두꺼운 비구름을 만들었어.')];
  default:return [sourceItem,influence('위로 솟는 힘',energy,'큰 영향','따뜻한 공기가 위로 올라 몽글한 덩이를 만들었어.'),influence('자란 시간',age,'큰 영향','자란 시간만큼 구름 덩이가 넓고 두꺼워졌어.'),influence('물',water,'보탬','구름의 짙기와 물방울 양을 바꿨어.')];
 }
}
export const liftOrigins:Record<LiftSource,number>={sun:0,front:1850,mountain:1750,night:0,upper:5200};
const liftBonus:Record<LiftSource,number>={sun:0,front:4,mountain:1,night:12,upper:8};
// A classroom model of saturation while lifting, not a weather forecast.
export function cloudBase(humidity:number,source:LiftSource='sun'){if(humidity<=0)return Infinity;return Math.max(0,(100-humidity-liftBonus[source])/.028)}
function legacyBase(humidity:number){if(humidity<=0)return Infinity;const g=Math.log(humidity/100)+17.625*24/(243.04+24);const dew=243.04*g/(17.625-g);return Math.max(0,(24-dew)/.0078)}
export function cloudState(s:CloudSettings){
 if(s.modelVersion!==2){const base=legacyBase(s.humidity),cooled=s.height>0&&s.height>=base;return {base,cooled,formed:cooled&&s.nuclei>0,visibility:cooled&&s.nuclei>0?1:0,baseAltitude:base,topAltitude:base+600}}
 const source=s.liftSource??'sun',base=cloudBase(s.humidity,source),saturation=s.humidity+liftBonus[source]+s.height*.028;
 const cooled=s.height>0&&s.height>=base,formed=cooled&&s.nuclei>0;
 const visibility=formed?smooth(saturation,98,108)*smooth(s.nuclei,0,12):0;
 const baseAltitude=liftOrigins[source]+Math.min(s.height,base),growth=(s.growth??35)/100,buoyancy=s.energy/100;
 const vertical=source==='sun'?200+growth*(350+buoyancy*9300):source==='front'?350+growth*2400:source==='upper'?90+growth*430:180+growth*750;
 return {base,cooled,formed,visibility,baseAltitude,topAltitude:baseAltitude+vertical};
}
// Older published clouds keep their original classification and appearance.
export function cloudTypeFromConditions(s:Pick<CloudSettings,'layer'|'flow'|'humidity'|'energy'>):CloudType{
 if(s.layer==='high')return s.flow==='spread'?'cirrostratus':s.flow==='streak'?'cirrus':'cirrocumulus';
 if(s.layer==='mid')return s.flow==='spread'?'altostratus':'altocumulus';
 if(s.flow==='rise')return s.energy>=68&&s.humidity>=68?'cumulonimbus':'cumulus';
 if(s.flow==='ripple')return 'stratocumulus';
 if(s.flow==='streak')return 'stratus';
 return s.humidity>=78?'nimbostratus':'stratus';
}
export function deriveCloud(s:CloudSettings):CloudSettings{
 if(s.modelVersion!==2){const layer=layerFromLevel(s.skyLevel),cloudType=cloudTypeFromConditions({...s,layer});const lowRain=s.flow==='rise'&&s.energy>=68&&s.humidity>=68?Math.max(0,(s.humidity-58)*1.7+(s.energy-55)*.7):s.flow==='spread'&&s.humidity>=78?Math.max(0,(s.humidity-68)*2.1):0;const midRain=s.flow==='spread'&&s.humidity>90?(s.humidity-90)*2:0;const rain=cloudState(s).formed?lowRain*(1-smooth(s.skyLevel,18,49))+midRain*smooth(s.skyLevel,18,49)*(1-smooth(s.skyLevel,55,84)):0;return {...s,layer,cloudType,rain:Math.min(100,Math.round(rain*Math.pow(s.nuclei/100,.55)))}}
 const source=s.liftSource??'sun',growth=s.growth??35,state=cloudState(s),layer=layerFromLevel(clamp(state.baseAltitude/7000)*100);
 let cloudType:CloudType,flow:CloudFlow;
 if(source==='upper'){cloudType=s.wind>=68?'cirrus':s.wind<=30&&growth>=47?'cirrostratus':'cirrocumulus';flow=cloudType==='cirrus'?'streak':cloudType==='cirrostratus'?'spread':'ripple'}
 else if(source==='front'){cloudType=growth>=70&&s.humidity>=72?'nimbostratus':state.baseAltitude<1700&&growth<28?'stratus':'altostratus';flow='spread'}
 else if(source==='mountain'){cloudType=state.baseAltitude>=1900?'altocumulus':'stratocumulus';flow='ripple'}
 else if(source==='night'){cloudType=s.wind>=56?'stratocumulus':'stratus';flow=cloudType==='stratus'?'streak':'ripple'}
 else{cloudType=s.energy>=73&&growth>=69&&s.humidity>=68?'cumulonimbus':s.energy<36&&s.wind>=35?'stratocumulus':'cumulus';flow=cloudType==='stratocumulus'?'ripple':'rise'}
 const nucleiMaturity=.45+.55*smooth(s.nuclei,2,35),collision=1-.30*smooth(s.nuclei,45,100),wet=smooth(s.humidity,62,96),age=smooth(growth,48,100);
 const rain=state.formed?Math.round(clamp((cloudType==='nimbostratus'?68:cloudType==='cumulonimbus'?88:cloudType==='stratus'?12:0)*wet*age*nucleiMaturity*collision,0,100)):0;
 return {...s,liftSource:source,growth,layer,skyLevel:Math.round(clamp(state.baseAltitude/7000)*100),flow,cloudType,rain};
}
export function cloudStory(s:CloudSettings){
 if(s.modelVersion!==2)return '이 구름은 이전 실험에서 만든 작품이야.';
 const source=s.liftSource??'sun';
 const origin=({sun:'햇볕이 공기를 데워 위로 밀었어.',front:'찬 공기가 따뜻한 공기를 넓게 들어 올렸어.',mountain:'공기가 산을 넘으며 올라갔어.',night:'땅 가까운 공기가 천천히 식었어.',upper:'높은 하늘에서 차가운 공기가 움직였어.'} satisfies Record<LiftSource,string>)[source];
 const result=({cirrus:'위쪽 바람이 얼음 구름을 깃털처럼 길게 늘였어.',cirrocumulus:'높은 곳의 작은 덩이들이 잔물결처럼 모였어.',cirrostratus:'높은 얼음 구름이 얇은 베일처럼 퍼졌어.',altocumulus:'중간 높이에서 공기가 오르내리며 구름 조각이 생겼어.',altostratus:'넓게 오른 공기가 하늘에 회색 구름층을 펼쳤어.',nimbostratus:'구름층이 오래 두꺼워져 비가 내리기 시작했어.',stratocumulus:'더 오르지 못한 구름이 옆으로 퍼져 덩이 층을 만들었어.',stratus:'낮게 식은 공기가 구름 이불을 펼쳤어.',cumulus:'따뜻한 공기가 솟아 몽글몽글한 구름을 만들었어.',cumulonimbus:'따뜻한 공기가 계속 솟아 커다란 비구름 탑이 됐어.'} satisfies Record<CloudType,string>)[s.cloudType];
 return `${origin} ${result}`;
}
export const layerName=(layer:CloudLayer)=>({low:'낮은 하늘',mid:'가운데 하늘',high:'높은 하늘'})[layer];
export const flowName=(flow:CloudFlow)=>({rise:'위로 솟기',spread:'옆으로 펼치기',ripple:'작게 뭉치기',streak:'가늘게 흩어지기'})[flow];
