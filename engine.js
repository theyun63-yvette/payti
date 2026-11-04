/* Offline v0.9. No dependencies, requests, account data or clock use. */
(function(root){
'use strict';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>object(x)&&Object.keys(x).sort().join('|')===[...keys].sort().join('|');
const allowed=new Set(['answered','unanswered','skipped','not_applicable']);
const roles=['inclination','behavior','discriminator'];
function sha256(text){
 const bytes=new TextEncoder().encode(text),size=Math.ceil((bytes.length+9)/64)*64;
 const data=new Uint8Array(size);data.set(bytes);data[bytes.length]=128;
 const dv=new DataView(data.buffer),bits=bytes.length*8;
 dv.setUint32(size-8,Math.floor(bits/4294967296));dv.setUint32(size-4,bits>>>0);
 const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
 const rotr=(x,n)=>(x>>>n)|(x<<(32-n));const w=new Uint32Array(64);
 for(let start=0;start<size;start+=64){
  for(let i=0;i<16;i++)w[i]=dv.getUint32(start+i*4);
  for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rotr(x,7)^rotr(x,18)^(x>>>3))+w[i-7]+(rotr(y,17)^rotr(y,19)^(y>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,h]=H;
  for(let i=0;i<64;i++){
   const t1=(h+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0;
   const t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;
   h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
  }
  const next=[a,b,c,d,e,f,g,h];for(let i=0;i<8;i++)H[i]=(H[i]+next[i])>>>0;
 }
 return H.map(x=>x.toString(16).padStart(8,'0')).join('');
}
function decode(data,payload){
 if(data.version!=='0.9'||!exact(payload,['version','answers'])||payload.version!==data.version||!object(payload.answers))throw new Error('Expected v0.9 answer envelope');
 const ids=new Set(data.items.map(q=>q.id)),values={},states={};
 for(const k of Object.keys(payload.answers))if(!ids.has(k))throw new Error('Unknown item');
 for(const q of data.items){
  const a=Object.hasOwn(payload.answers,q.id)?payload.answers[q.id]:{status:'unanswered',value:null};
  if(!exact(a,['status','value'])||!allowed.has(a.status))throw new Error('Invalid answer record');
  if(a.status==='answered'){
   if(!Number.isInteger(a.value)||a.value<1||a.value>5)throw new Error('Invalid answer value');
   values[q.id]=q.target_side==='left'?6-a.value:a.value;
  }else{if(a.value!==null)throw new Error('Missing answer must be null');values[q.id]=null;}
  states[q.id]=a.status;
 }
 return {values,states};
}
function profile(data,p,v){
 const rv=Object.fromEntries(roles.map(r=>[r,v[p.roles[r]]]));const [a,b,c]=roles.map(r=>rv[r]);
 const negative=['inclination','behavior'].filter(r=>rv[r]!==null&&rv[r]<=data.policy.contradiction_max).map(r=>p.roles[r]);
 const complete=a!==null&&b!==null;
 const state=negative.length?'contradicted':complete?(Math.min(a,b)>=data.policy.supported_min?'supported':'tentative'):(a!==null||b!==null?'partial':'unassessed');
 const units=complete?['inclination','behavior'].reduce((sum,r)=>sum+data.policy.core_unit_weights[r]*(rv[r]-1),0):null;
 return {state,roles:p.roles,role_scores:rv,target_scores:Object.fromEntries(roles.map(r=>[p.roles[r],rv[r]])),
  contradiction_items:negative,core_complete:complete,core_units:units,main_score:complete?units*2.5:null,
  missing_core:['inclination','behavior'].filter(r=>rv[r]===null).map(r=>p.roles[r]),
  partial_key:state==='partial'?[Number(b!==null),b??0,a??0]:null,
  discriminator_state:c===null?'missing':c>=4?'aligns':c===3?'neutral':'differs'};
}
const compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
function stableChoice(finalists,profiles,version){
 const ids=[...finalists].sort(),rows=ids.map(pid=>[pid,...roles.map(r=>profiles[pid].role_scores[r])]);
 const canonical=JSON.stringify([version,rows]),digests=Object.fromEntries(ids.map(pid=>[pid,sha256(canonical+'|'+pid)]));
 const maximum=Object.values(digests).sort().at(-1),same=ids.filter(p=>digests[p]===maximum);
 return {primary:same[0],digest:{algorithm:'SHA-256',canonical,digests,digest_collision:same.length>1}};
}
function select(data,profiles){
 const ids=Object.keys(profiles).sort();let bucket=null,pool=[];
 for(const state of ['supported','tentative','partial','unassessed']){pool=ids.filter(p=>profiles[p].state===state);if(pool.length){bucket=state;break;}}
 if(!pool.length){bucket='all_contradicted';pool=ids;}
 let leaders=[...pool],decision='single_candidate';
 if(bucket==='supported'||bucket==='tentative'){
  const maximum=Math.max(...pool.map(p=>profiles[p].core_units));leaders=pool.filter(p=>profiles[p].core_units===maximum);
  if(pool.length>1)decision='core_score';
 }else if(bucket==='partial'){
  const maximum=pool.map(p=>profiles[p].partial_key).reduce((a,b)=>compare(a,b)>0?a:b);
  leaders=pool.filter(p=>compare(profiles[p].partial_key,maximum)===0);if(pool.length>1)decision='partial_evidence';
 }
 const before=[...leaders];let used=false,skip=leaders.length===1?'no_tie':'incomplete_core_pool';
 if(leaders.length>1&&(bucket==='supported'||bucket==='tentative')){
  if(leaders.every(p=>profiles[p].role_scores.discriminator!==null)){
   used=true;skip=null;const maximum=Math.max(...leaders.map(p=>profiles[p].role_scores.discriminator));
   leaders=leaders.filter(p=>profiles[p].role_scores.discriminator===maximum);decision='discriminator';
  }else skip='missing_for_at_least_one_leader';
 }
 const technical=leaders.length>1;let primary=leaders[0],digest=null;
 if(technical){({primary,digest}=stableChoice(leaders,profiles,data.version));decision='stable_digest';}
 return {primary,bucket,decision_by:decision,technical_tiebreak:technical,pool,core_leaders:before,finalists:leaders,
  discriminator_used:used,discriminator_skip_reason:skip,digest};
}
function axisResult(data,axis,ids,v){
 const d=data.axis_display[axis],known=ids.map(k=>v[k]).filter(x=>x!==null);
 if(!known.length)return {state:'insufficient',answered:0,percentages:null,letter:null,letter_basis:'no_data',pattern:'no_data',difference:null,interpretation:'本维没有有效回答，暂不生成百分比或方向。'};
 const high=(known.reduce((s,x)=>s+x,0)/known.length-1)*25,low=100-high;
 let letter,basis,pattern,note;
 if(high>50){letter=d.high;basis='greater_percentage';}
 else if(high<50){letter=d.low;basis='greater_percentage';}
 else{const x=v[d.primary_item];if(x!==null&&x!==3){letter=x>3?d.high:d.low;basis='primary_item_tiebreak';}else{letter=d.neutral_letter;basis='fixed_tiebreak';}}
 if(known.length===1){pattern='single_item';note='本维仅有1/2题有效回答，百分比只反映这一道题。';}
 else if(known.every(x=>x===3)){pattern='both_neutral';note='两题都选择中立，本维没有明显方向；50/50不代表两种强倾向同时存在。';}
 else if(Math.min(...known)<3&&Math.max(...known)>3){pattern='opposing';note='两种场景的选择方向不同，百分比是合并换算；不能据此认定每个场景都倾向中间。';}
 else if(known.includes(3)){pattern='partly_neutral';note='一道题偏向一端，另一道中立；百分比反映这两个场景的合并倾向。';}
 else{pattern='consistent';note='两种场景的选择方向一致；百分比是答案换算，不是概率或准确率。';}
 if(high===50)note+=' 两端保持50/50，显示字母仅用于本维同分处理。';
 return {state:known.length===2?'complete':'partial',answered:known.length,percentages:{[d.high]:high,[d.low]:low},
  letter,letter_basis:basis,pattern,difference:known.length===2?pattern==='opposing':null,interpretation:note};
}
function score(data,payload){
 const {values:v,states}=decode(data,payload),personas=Object.fromEntries(data.personas.map(p=>[p.id,p]));
 const ids=Object.keys(personas).sort(),profiles=Object.fromEntries(ids.map(pid=>[pid,profile(data,personas[pid],v)]));
 const selected=select(data,profiles),pid=selected.primary,p=personas[pid],winner=profiles[pid];
 const answered=Object.values(states).filter(x=>x==='answered').length,processed=Object.values(states).filter(x=>x!=='unanswered').length;
 const coreIds=new Set(data.personas.flatMap(p=>[p.roles.inclination,p.roles.behavior]));
 const coreAnswered=[...coreIds].filter(k=>v[k]!==null).length,total=data.items.length,ready=processed===total&&coreAnswered>=1;
 const reference=winner.state!=='supported'||selected.technical_tiebreak,reasons=[];
 if(processed<total)reasons.push('unprocessed_items');if(coreAnswered<1)reasons.push('no_numeric_core_answer');
 let note;
 if(!ready)note='答卷尚未达到提交条件，后台预计算不展示为已完成测评，也不可分享。';
 else if(selected.bucket==='all_contradicted')note='本次没有测到符合这些类型的核心行为，以下仅供参考，不代表这些行为已经得到确认。';
 else if(selected.technical_tiebreak&&winner.state==='supported')note='多种模式在现有证据上并列，本次按稳定规则提供一个参考类型，不代表它比其他并列模式更突出。';
 else if(selected.technical_tiebreak)note='本次回答不足以区分唯一的突出模式，以下仅提供一个参考类型，不代表已经测得相应行为。';
 else if(winner.state==='tentative')note='本次回答相对接近这一类型，但核心倾向仍不够明确，以下为参考介绍。';
 else if(winner.state==='partial')note='部分核心经历尚未提供，以下依据有限的回答提供参考类型，不代表完整判定。';
 else if(winner.state==='unassessed')note='本次没有关于这一类型的核心有效答案，以下仅为类型参考，不代表测得了这些行为。';
 else note='本次回答对这种模式的核心倾向和实际行为均有支持。';
 const title=(reference?'本次参考类型：':'本次匹配：')+p.name;
 const card={id:pid,name:p.name,title,description:reference?p.reference_description:p.result_description,
  description_mode:reference?'type_reference':'personalized',reference_only:reference,evidence_note:note,
  scope:`本次已作答${answered}/${total}题，已处理${processed}/${total}题`,can_share:ready,display_as_result:ready,
  share_caption:ready?title+'\n'+note:null};
 const axes=Object.fromEntries(['T','V','D','S'].map(a=>[a,axisResult(data,a,data.axes[a],v)]));
 return {version:data.version,status:'assigned',primary:pid,can_submit:ready,support_level:winner.state,
  selection_basis:selected.bucket,decision_by:selected.decision_by,reference_only:reference,
  technical_tiebreak:selected.technical_tiebreak,counts_as_supported_result:ready&&!reference,
  result_cards:[card],axes,axis_code:['T','V','D','S'].map(a=>axes[a].letter??'—').join(''),
  coverage:{answered,processed,total,core_answered:coreAnswered,core_total:28},
  submission:{ready,reasons,unprocessed_ids:Object.keys(states).filter(k=>states[k]==='unanswered').sort()},
  answer_states:states,missing_questions:Object.keys(v).filter(k=>v[k]===null).sort(),
  audit:{profiles,selection:selected,excluded_ids:ids.filter(pid=>profiles[pid].state==='contradicted'),
   note:'参考分配不计入证据支持结果数；证据支持结果数也不是已验证的人格识别准确率。'}};
}
function validSession(data,s){
 if(!object(s)||s.version!==data.version||!Number.isInteger(s.index)||s.index<0||s.index>=data.items.length)return false;
 try{decode(data,{version:s.version,answers:s.answers});return true;}catch{return false;}
}
const api={score,decode,validSession,sha256,displayValue:(_q,v)=>v??null,displayEndpoints:q=>({left:q.left,right:q.right})};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PaytiV09Engine=api;
})(typeof window!=='undefined'?window:globalThis);
