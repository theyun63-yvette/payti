/* Payti 0.10 offline engine. No network, storage, account identifiers or clock. */
(function(root){
'use strict';
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
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>object(x)&&Object.keys(x).sort().join('|')===[...keys].sort().join('|');
const cmp=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
const states=new Set(['answered','unanswered','skipped','not_applicable']);
function validateSpec(data){
 if(data.version!=='0.10'||data.form_id!=='payti-22-2026-11-05')throw Error('Wrong specification version');
 if(data.items.length!==22||data.personas.length!==14||data.axes.length!==4)throw Error('Unexpected specification size');
 const ids=new Set(data.items.map(q=>q.id));
 if(ids.size!==22||new Set(data.personas.map(p=>p.id)).size!==14||new Set(data.axes.map(a=>a.id)).size!==4)throw Error('Duplicate ID');
 for(const q of data.items)if(!['canonical','reversed'].includes(q.orientation))throw Error('Invalid orientation');
 for(const p of data.personas){
  if(p.core.length!==2||new Set(p.core.map(r=>r.item_id)).size!==2)throw Error('Two distinct core items required');
  for(const r of p.core)if(!ids.has(r.item_id)||!['left','right'].includes(r.side))throw Error('Invalid persona reference');
 }
 for(const a of data.axes){
  if(!a.items.length||new Set(a.items.map(r=>r.item_id)).size!==a.items.length)throw Error('Invalid axis items');
  for(const r of a.items)if(!ids.has(r.item_id)||!['left','right'].includes(r.side))throw Error('Invalid axis reference');
  if(!a.items.some(r=>r.item_id===a.anchor_item))throw Error('Unknown axis anchor');
 }
 return true;
}
function decode(data,payload){
 if(!exact(payload,['version','form_id','answers'])||payload.version!==data.version||payload.form_id!==data.form_id||!object(payload.answers))throw Error('Expected a new v0.10 answer envelope');
 const ids=new Set(data.items.map(q=>q.id)),canonical={},effective={},status={};
 for(const id of Object.keys(payload.answers))if(!ids.has(id))throw Error('Unknown item '+id);
 for(const q of data.items){
  const a=Object.hasOwn(payload.answers,q.id)?payload.answers[q.id]:{status:'unanswered',value:null};
  if(!exact(a,['status','value'])||!states.has(a.status))throw Error('Invalid answer record '+q.id);
  if(a.status==='answered'){
   if(!Number.isInteger(a.value)||a.value<1||a.value>5)throw Error('Position must be integer 1–5');
   canonical[q.id]=q.orientation==='reversed'?6-a.value:a.value;
  }else{
   if(a.value!==null)throw Error('Non-answer must have a null value');
   canonical[q.id]=null;
  }
  effective[q.id]=q.evidence_policy==='left_support_only'&&canonical[q.id]>3?null:canonical[q.id];
  status[q.id]=a.status;
 }
 return {canonical,effective,status};
}
const toward=(r,values)=>values[r.item_id]===null?null:r.side==='left'?6-values[r.item_id]:values[r.item_id];
function profile(p,values){
 const signals=p.core.map(r=>({item_id:r.item_id,side:r.side,score:toward(r,values)}));
 const known=signals.map(r=>r.score).filter(v=>v!==null),complete=known.length===2;
 const negative=signals.filter(r=>r.score!==null&&r.score<=2).map(r=>r.item_id);
 const state=negative.length?'contradicted':complete?(known.every(v=>v>=4)?'supported':'tentative'):known.length?'partial':'unassessed';
 return {id:p.id,state,signals,known_count:known.length,contradiction_items:negative,
  main_score:complete?(known.reduce((s,v)=>s+v-1,0))*12.5:null,
  score_units:complete?known.reduce((s,v)=>s+v-1,0):null,
  observed_average:known.length?known.reduce((s,v)=>s+v,0)/known.length:null,
  weakest:known.length?Math.min(...known):null};
}
function stableChoice(ids,profiles,version){
 const sorted=[...ids].sort();
 const rows=sorted.map(id=>[id,profiles[id].signals.map(r=>[r.item_id,r.side,r.score]).sort((a,b)=>a[0].localeCompare(b[0]))]);
 const canonical=JSON.stringify([version,rows]);
 const digests=Object.fromEntries(sorted.map(id=>[id,sha256(canonical+'|'+id)]));
 const best=Object.values(digests).sort().at(-1);
 return {primary:sorted.filter(id=>digests[id]===best)[0],canonical,digests};
}
function select(profiles,version){
 const ids=Object.keys(profiles).sort();let pool=[],basis;
 for(const state of ['supported','tentative','partial']){
  pool=ids.filter(id=>profiles[id].state===state);
  if(pool.length){basis=state;break;}
 }
 if(!pool.length){
  pool=ids.filter(id=>profiles[id].known_count>0);
  if(pool.length)basis='closest_observed';
  else {pool=ids;basis='no_interpretable_signal';}
 }
 let finalists=[...pool],decision='single_candidate';
 if(basis!=='no_interpretable_signal'){
  const key=id=>basis==='supported'||basis==='tentative'
   ?[profiles[id].score_units,profiles[id].weakest]
   :[profiles[id].observed_average,profiles[id].weakest,profiles[id].known_count];
  const best=pool.map(key).reduce((a,b)=>cmp(a,b)>=0?a:b);
  finalists=pool.filter(id=>cmp(key(id),best)===0);
  if(pool.length>1)decision=basis==='supported'||basis==='tentative'?'equal_core_score':'observed_signals';
 }
 let primary=finalists[0],digest=null;const technical=finalists.length>1;
 if(technical){digest=stableChoice(finalists,profiles,version);primary=digest.primary;decision='stable_digest';}
 return {primary,basis,decision_by:decision,pool,finalists,technical_tiebreak:technical,digest};
}
function axisResult(a,values){
 const signals=a.items.map(r=>({item_id:r.item_id,score:toward(r,values)}));
 const known=signals.filter(r=>r.score!==null),n=known.length;
 if(!n)return {id:a.id,name:a.name,answered:0,total:a.items.length,percentages:null,letter:null,letter_basis:'no_data',pattern:'no_data',signals,dominant:null};
 const sum=known.reduce((s,r)=>s+r.score-1,0),raw=100*sum/(4*n),high=Math.round(raw*10)/10,low=Number((100-high).toFixed(1));
 let letter,letterBasis,dominant;
 if(sum>2*n){letter=a.high_letter;letterBasis='greater_percentage';dominant='high';}
 else if(sum<2*n){letter=a.low_letter;letterBasis='greater_percentage';dominant='low';}
 else {
  const anchor=signals.find(r=>r.item_id===a.anchor_item).score;
  letter=anchor!==null&&anchor!==3?(anchor>3?a.high_letter:a.low_letter):a.neutral_letter;
  letterBasis=anchor!==null&&anchor!==3?'anchor_at_exact_tie':'fixed_at_exact_tie';dominant='balanced';
 }
 let pattern;
 if(n===1)pattern='single_item';
 else if(known.every(r=>r.score===3))pattern='all_neutral';
 else if(known.some(r=>r.score<3)&&known.some(r=>r.score>3))pattern='opposing';
 else if(known.some(r=>r.score===3))pattern='partly_neutral';
 else pattern='consistent';
 return {id:a.id,name:a.name,answered:n,total:a.items.length,percentages:{low,high},raw_high_percent:raw,letter,letter_basis:letterBasis,pattern,signals,dominant};
}
function fact(q,canonical){
 const v=canonical[q.id];
 if(v===null)return null;
 if(v===3)return {item_id:q.id,side:'middle',strength:'neutral',text:'这道题没有明显偏向。'};
 const side=v<3?'left':'right';
 // Option text is screen-order-dependent; canonical option direction is semantic.
 const screenSide=q.orientation==='reversed'?(side==='left'?'right':'left'):side;
 return {item_id:q.id,side,strength:v===1||v===5?'strong':'moderate',text:q[screenSide],
  interpretation:q.evidence_policy==='left_support_only'&&side==='right'?'verbatim_only':'choice_only'};
}
function axisNarrative(a,result,data,decoded,p,selectedProfile){
 const copy=data.axis_copy&&data.axis_copy[a.id];
 // Presentation follows the unrounded score direction, never the answer pattern
 // or the tie-format letter. Every exact tie uses the approved full dual copy.
 const copyKey=result.dominant===null?'no_data':result.dominant;
 const intro=copy?copy[copyKey]||'':'';
 const headline=copy&&copy.headlines?copy.headlines[copyKey]||'':'';
 const byId=Object.fromEntries(data.items.map(q=>[q.id,q]));
 const facts=a.items.map(r=>fact(byId[r.item_id],decoded.canonical)).filter(Boolean);
 const coverage=result.answered&&result.answered<result.total?`这一面有${result.answered}/${result.total}题提供了数值选择。`:'';
 // Keep source observations for audits only; never splice them into the prose.
 return {headline,general:intro,copy_key:copyKey,copy_version:data.axis_copy_version||null,choice_facts:facts,persona_connection:'',coverage};
}
function score(data,payload){
 validateSpec(data);
 const decoded=decode(data,payload);
 const profiles=Object.fromEntries(data.personas.map(p=>[p.id,profile(p,decoded.effective)]));
 const coreIds=new Set(data.personas.flatMap(p=>p.core.map(r=>r.item_id)));
 const pending=data.items.filter(q=>decoded.status[q.id]==='unanswered').map(q=>q.id);
 const numericCore=[...coreIds].filter(id=>decoded.status[id]==='answered').length;
 const canSubmit=pending.length===0&&numericCore>0;
 const rawAxes=data.axes.map(a=>axisResult(a,decoded.effective));
 const base={version:data.version,form_id:data.form_id,can_submit:canSubmit,can_share:canSubmit,
  submission:{processed:data.items.length-pending.length,total:data.items.length,pending,numeric_persona_items:numericCore,
   reason:pending.length?'unfinished_items':!numericCore?'no_numeric_persona_item':null},
  primary:null,result_cards:[],share:null,support_level:null,selection_basis:null,reference_only:null,technical_tiebreak:false,counts_as_supported_result:false};
 const selected=canSubmit?select(profiles,data.version):null;
 const p=selected?data.personas.find(p=>p.id===selected.primary):null;
 const selectedProfile=selected?profiles[selected.primary]:null;
 const axes=rawAxes.map((r,i)=>({...r,interpretation:axisNarrative(data.axes[i],r,data,decoded,p,selectedProfile)}));
 const observations=data.items.map(q=>fact(q,decoded.canonical)).filter(Boolean);
 if(selected){
  const supported=selectedProfile.state==='supported';
  base.primary=selected.primary;base.support_level=selectedProfile.state;base.selection_basis=selected.basis;
  base.technical_tiebreak=selected.technical_tiebreak;
  base.reference_only=!supported||selected.technical_tiebreak;
  base.counts_as_supported_result=!base.reference_only;
  const description=supported?p.description:p.archetype_description;
  base.result_cards=[{persona_id:p.id,name:p.name,title:'你的消费人格：'+p.name,
   description,description_mode:supported?'supported_scene_description':'archetype_description',quote:supported?p.quote:null}];
  base.share={title:'我的消费人格：'+p.name,description,version:data.version};
 }
 return {...base,axes,axis_code:axes.map(a=>a.letter||'—').join(''),observations,
  audit:{canonical_answers:decoded.canonical,effective_answers:decoded.effective,statuses:decoded.status,profiles,selection:selected,
   ambiguous_items:data.items.filter(q=>decoded.canonical[q.id]!==null&&decoded.effective[q.id]===null).map(q=>q.id),
   statistical_note:'Internal support flags are not accuracy, population percentile or psychological validation.'}};
}
const api={score,validateSpec,sha256};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.PaytiV010Engine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
