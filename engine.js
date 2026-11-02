(function(root){
'use strict';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const statuses = new Set(['answered','unanswered','skipped','not_applicable']);
const exactKeys = (value, keys) => isObject(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
function decode(data,payload){
 if(data.version!=='0.7'||!exactKeys(payload,['version','answers'])||payload.version!==data.version||!isObject(payload.answers))throw new Error('请使用本版题目的有效答卷');
 const ids=new Set(data.items.map(i=>i.id)),values={},states={};
 for(const key of Object.keys(payload.answers))if(!ids.has(key))throw new Error('答卷包含未知题目');
 for(const item of data.items){
  const a=Object.hasOwn(payload.answers,item.id)?payload.answers[item.id]:{status:'unanswered',value:null};
  if(!exactKeys(a,['status','value'])||!statuses.has(a.status))throw new Error('答案记录格式不正确');
  if(a.status==='answered'){
   if(!Number.isInteger(a.value)||a.value<1||a.value>5)throw new Error('答案不在有效范围内');
   values[item.id]=item.target_side==='left'?6-a.value:a.value;
  }else{
   if(a.value!==null)throw new Error('未作答项不能带有分数');
   values[item.id]=null;
  }
  states[item.id]=a.status;
 }
 return {values,states};
}
function compareKeys(a,b){for(let n=0;n<a.length;n++)if(a[n]!==b[n])return a[n]-b[n];return 0;}
function assignPrimary(keys){
 const entries=Object.entries(keys);
 if(!entries.length)return {primary:'P13',basis:'no_single_pattern',leaders:[]};
 const best=entries.reduce((top,[,key])=>compareKeys(key,top)>0?key:top,entries[0][1]);
 const leaders=entries.filter(([,key])=>compareKeys(key,best)===0).map(([id])=>id).sort();
 return {primary:leaders.length===1?leaders[0]:'P14',basis:leaders.length===1?'single_pattern':'joint_top_patterns',leaders};
}
function score(data,payload){
 const {values:v,states}=decode(data,payload),axes={},types={},keys={};
 for(const [axis,ids] of Object.entries(data.axes)){
  const pair=ids.map(id=>v[id]);
  if(pair.includes(null))axes[axis]={state:'insufficient',mean:null,difference:null};
  else{const mean=(pair[0]+pair[1])/2;axes[axis]={state:mean<2.5?'low':mean>3.5?'high':'mixed',mean,difference:Math.min(...pair)<=2&&Math.max(...pair)>=4};}
 }
 for(const p of data.personas.filter(p=>p.kind==='specific')){
  const missing=p.signals.filter(id=>v[id]===null);
  const supported=!missing.length&&p.required.every(id=>v[id]>=data.policy.core_min);
  const key=supported?[p.signals.reduce((sum,id)=>sum+p.weights[id]*(v[id]-1),0),Math.min(...p.required.map(id=>v[id])),v[p.discrimination_item]]:null;
  types[p.id]={state:key?'candidate':missing.length?'incomplete':'not_supported',target_scores:Object.fromEntries(p.signals.map(id=>[id,v[id]])),missing,rank_key:key,matching_index:key?key[0]*2.5:null};
  if(key)keys[p.id]=key;
 }
 const {primary,basis,leaders}=assignPrimary(keys),persona=data.personas.find(p=>p.id===primary);
 const missing=data.items.filter(i=>v[i.id]===null).map(i=>i.id),answered=Object.values(states).filter(s=>s==='answered').length;
 const mode=answered===0?'empty_default':missing.length?'partial_answers':'complete_answers';
 const description=primary==='P13'&&answered===0?persona.empty_description:primary==='P13'&&missing.length?persona.missing_description:persona.result_description;
 const levels=Object.values(keys).sort((a,b)=>compareKeys(b,a)).filter((key,n,all)=>n===0||compareKeys(key,all[n-1])!==0);
 const ranking=levels.map(key=>({rank_key:key,ids:Object.keys(keys).filter(id=>compareKeys(keys[id],key)===0).sort()}));
 let margin=null,decision;
 if(basis==='single_pattern'){
  if(levels.length>1){margin=levels[0][0]-levels[1][0];decision=data.policy.tie_break[levels[0].findIndex((x,n)=>x!==levels[1][n])];}
  else decision='only_supported_candidate';
 }else decision=primary==='P13'?'no_single_pattern_category':'joint_pattern_category';
 const total=data.items.length,scope=mode==='complete_answers'?`本次${total}题回答`:answered?`本次已答${answered}/${total}题`:'尚未作答的默认分配';
 return {version:data.version,status:'assigned',primary,basis,evidence_mode:mode,decision_by:decision,near_match:margin!==null&&margin<=data.policy.near_margin_units,
  axes,result_cards:[{id:primary,name:persona.name,title:persona.result_title,description,scope,can_share:answered>0}],coverage:{answered,total},
  missing_questions:missing,answer_states:states,audit:{specific_profiles:types,ranking,joint_leaders:primary==='P14'?leaders:[],note:'Audit candidates are not user-facing labels. P13/P14 are defined product categories, not new empirical constructs.'}};
}
function validSession(data,s){
 if(!isObject(s)||s.version!==data.version||!Number.isInteger(s.index)||s.index<0||s.index>=data.items.length)return false;
 try{decode(data,{version:s.version,answers:s.answers});return true;}catch{return false;}
}
// v0.7 stores the selected position: 1=A/left, 5=B/right.
function displayValue(item,value){return value??null;}
function displayEndpoints(item){return {left:item.left,right:item.right};}
const api={score,decode,assignPrimary,validSession,displayValue,displayEndpoints};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.QuizEngine=api;
})(typeof window!=='undefined'?window:globalThis);
