(function(){
'use strict';
const D=window.QUIZ_DATA,E=window.PaytiV010Engine;
const KEY='payti:0.10:answers',app=document.querySelector('#app'),modal=document.querySelector('#modal');
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={cart:'M4 5h3l3 14h13l3-11H8 M12 25h.01 M22 25h.01',arrow:'M5 16h22m-8-8 8 8-8 8',back:'M27 16H5m8-8-8 8 8 8',check:'M7 16l6 6L26 8',close:'M8 8l16 16M24 8 8 24'};
const icon=name=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.cart}"/></svg>`;
const axes=Object.fromEntries(D.axes.map(a=>[a.id,a]));
const statusLabels={answered:'已作答',unanswered:'待作答'};
let storageOK=true,legacyPresent=false,s=fresh(),currentView='',advanceTimer=null,shareURL=null,shareFile=null,shareRevision=0;
function fresh(){return{version:D.version,form_id:D.form_id,answers:{},index:0,startedAt:null,completedAt:null,questionFeedback:{}};}
function validSession(saved){
 if(!saved||saved.version!==D.version||saved.form_id!==D.form_id||!Number.isInteger(saved.index)||saved.index<0||saved.index>=D.items.length)return false;
 try{E.score(D,{version:saved.version,form_id:saved.form_id,answers:saved.answers});return true;}catch{return false;}
}
try{
 legacyPresent=['maidian-renshe-v05','maidian-renshe-v07','maidian-renshe-v08','payti:0.9:answers'].some(k=>localStorage.getItem(k)!==null);
 const raw=localStorage.getItem(KEY);let saved=null;
 try{saved=JSON.parse(raw||'null');}catch{}
 if(validSession(saved)){
  s={...fresh(),answers:saved.answers,index:saved.index,startedAt:saved.startedAt||null,completedAt:saved.completedAt||null,questionFeedback:saved.questionFeedback&&typeof saved.questionFeedback==='object'&&!Array.isArray(saved.questionFeedback)?saved.questionFeedback:{}};
  // Retired nonnumeric responses become unanswered, never neutral or negative.
  const retired=Object.values(s.answers).some(a=>a.status!=='answered'&&a.status!=='unanswered');
  if(retired){try{if(localStorage.getItem(KEY+':before-required')===null)localStorage.setItem(KEY+':before-required',raw);}catch{storageOK=false;}}
  s.answers=Object.fromEntries(Object.entries(s.answers).filter(([,a])=>a.status==='answered'));
  const pending=D.items.findIndex(q=>!s.answers[q.id]);
  if(pending>=0){if(retired||s.completedAt)s.index=pending;s.completedAt=null;}
 }
 else if(raw!==null){if(localStorage.getItem(KEY+':invalid')===null)localStorage.setItem(KEY+':invalid',raw);legacyPresent=true;}
}catch{storageOK=false;}
const envelope=()=>({version:D.version,form_id:D.form_id,answers:s.answers});
const processed=()=>D.items.filter(q=>s.answers[q.id]?.status==='answered').length;
const score=()=>E.score(D,envelope());
const canComplete=r=>processed()===D.items.length&&r.can_submit;
function save(){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{storageOK=false;}}
function cancelAdvance(){clearTimeout(advanceTimer);advanceTimer=null;}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').classList.remove('show'),4000);}
function navigate(view){cancelAdvance();closeDialog();save();if(location.hash!==`#${view}`)location.hash=view;else render();}
function focusHeading(){requestAnimationFrame(()=>{$('#main h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});}
function render(){
 cancelAdvance();closeDialog();currentView=location.hash.slice(1)||'home';
 if(currentView==='intro'||currentView==='review')currentView='test';
 if(!['home','test','result'].includes(currentView))currentView='home';
 if(currentView==='result'&&(!s.completedAt||!canComplete(score())))currentView=processed()?'test':'home';
 if(location.hash!==`#${currentView}`)history.replaceState(null,'','#'+currentView);
 if(currentView==='test'&&!s.startedAt)s.startedAt=new Date().toISOString();
 document.body.dataset.view=currentView;({home,test:question,result}[currentView])();save();focusHeading();
}
function home(){const progress=processed();app.innerHTML=`<main id="main" class="home"><section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="dot"></span> SOME HABITS ARE A WHOLE PERSONALITY.</div><h1 tabindex="-1">这很难评，<br><em>测一下。</em></h1><p class="hero-desc">有人花钱省事，有人给喜欢留预算。<br>有人用完就转手，有人留着以备不时之需。<br>你花钱的样子，可能比你想的更有意思。</p><div class="hero-actions"><button class="primary" data-action="${progress?'resume':'start'}">${progress?`继续上次 · ${progress}/${D.items.length}`:'测测我的消费人格'} ${icon('arrow')}</button>${progress?'<button class="text-button" data-action="restart">重新开始</button>':'<span style="font-size:11px;color:var(--muted);line-height:1.9">不用算账<br>凭真实的自己选</span>'}</div><div class="hero-note">${icon('check')} <span>没有标准答案，也没有消费优等生。</span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="receipt"><div class="receipt-top"><span>PERSONALITY RECEIPT</span><span>No. 010</span></div><div class="receipt-face">${icon('cart')}</div><h2>你的消费<br>有点个性。</h2><div class="receipt-line"><span>生活里的小选择</span><span>× ${D.items.length}</span></div><div class="receipt-line"><span>意料之外的自己</span><span>待发现</span></div><div class="receipt-end"><span>本次收获</span><span>一点自我认识 ↗</span></div><div class="barcode"></div></div><div class="floating-tag tag-one">✳ 省事股东</div><div class="floating-tag tag-two">↗ 先爽再说</div><div class="floating-tag tag-three">⌁ 审美甲方</div><div class="hero-spark">✳</div></div></section>${legacyPresent&&!progress?`<div class="notice">题库已更新为${D.items.length}题。旧版记录仍保留在本机，新版请重新作答。</div>`:''}<div class="home-meta"><div class="meta-item"><strong>${D.items.length}<span>道题</span></strong><p>具体生活场景<br>想象一下，或回想一下</p></div><div class="meta-item"><strong>${D.personas.length}<span>种人设</span></strong><p>从你的回答出发<br>得到一个消费人格</p></div><div class="meta-item"><strong>按你<span>的节奏</span></strong><p>可以返回修改<br>进度保存在这台设备</p></div></div></main>`;document.querySelector('.hero-note svg').style.cssText='width:13px;height:13px;flex-shrink:0';}
function question(){
 const q=D.items[s.index],a=s.answers[q.id],ends=q,value=a?.status==='answered'?a.value:null;
 app.innerHTML=`<main id="main" class="quiz"><div class="quiz-progress-head"><button class="back-link" data-action="home">${icon('back')} 暂存，回首页</button><button class="progress-count" data-action="directory" aria-label="打开题目目录，当前第${s.index+1}题，共${D.items.length}题"><strong>${String(s.index+1).padStart(2,'0')}</strong> / ${D.items.length} ▦</button></div>
 <article class="question question-enter" data-question="${q.id}"><h1 class="sr-only" tabindex="-1">第${s.index+1}题</h1><div class="scenario">${q.html}</div><div class="answer-area"><p class="answer-prompt">${esc(q.prompt)}</p><div class="endpoint-row"><div>${esc(ends.left)}</div><div>${esc(ends.right)}</div></div>
 <fieldset class="scale"><legend class="sr-only">从偏左到偏右，选择最像你的程度；中间代表中立</legend>${[1,2,3,4,5].map((v,k)=>`<label style="--scale-color:${v<3?'#6961bc':v>3?'#5f856b':'#93998a'};--size:${[42,34,26,34,42][k]}px"><input type="radio" name="answer" value="${v}" ${value===v?'checked':''} aria-label="${['明显偏左','稍微偏左','中立，两边差不多','稍微偏右','明显偏右'][k]}${v===3?'':`：${esc(v<3?ends.left:ends.right)}`}"><span class="circle-target"><span class="circle">${icon('check')}</span></span></label>`).join('')}</fieldset></div>
 <p class="scale-hint">中间圆圈代表中立。</p></article>
 <div id="question-actions"></div><div class="question-bottom"><span id="storage-note">${storageOK?'进度已在本机暂存':'浏览器无法暂存，请保持页面打开'}</span><button data-action="question-feedback">${s.questionFeedback[q.id]?'这题的备注已保存 ✓':'这题有点不好懂'}</button></div></main>`;
 syncActions();
}
function syncActions(){
 const a=s.answers[D.items[s.index].id],handled=a?.status==='answered',complete=processed()===D.items.length;
 const finish=handled&&(s.index===D.items.length-1||complete);
 $('#question-actions').innerHTML=`<div class="quiz-nav"><button class="back-link" data-action="previous" ${s.index===0?'disabled':''}>${icon('back')} 上一题</button>${!finish&&handled&&s.index<D.items.length-1?'<button class="back-link" data-action="next">下一题 →</button>':''}</div>${finish?`<div class="finish-area"><button class="primary" data-action="finish">看看我的消费人格 ${icon('arrow')}</button></div>`:''}`;
 if(!storageOK)$('#storage-note').textContent='浏览器无法暂存，请保持页面打开';
}
function record(value){
 s.answers[D.items[s.index].id]={status:'answered',value};s.completedAt=null;save();
 document.querySelectorAll('input[name="answer"]').forEach(r=>r.checked=Number(r.value)===value);
 syncActions();
}
function chooseAnswer(value){
 if(currentView!=='test'||modal.open||!Number.isInteger(value)||value<1||value>5)return;
 cancelAdvance();record(value);
 const index=s.index;
 // A completed answer set stays on the edited item so the updated result is one click away.
 if(index===D.items.length-1||processed()===D.items.length)return;
 advanceTimer=setTimeout(()=>{
  advanceTimer=null;
  if(currentView==='test'&&location.hash==='#test'&&!modal.open&&!document.hidden&&s.index===index){s.index++;navigate('test');}
 },350);
}
function navGrid(){return`<div class="review-grid">${D.items.map((q,k)=>{const state=s.answers[q.id]?.status||'unanswered';return`<button class="q-nav-btn ${state} ${k===s.index?'current':''}" data-action="jump" data-index="${k}" aria-label="第${k+1}题 ${esc(q.prompt)}，${statusLabels[state]}">${String(k+1).padStart(2,'0')}</button>`;}).join('')}</div><div class="directory-legend"><span><i class="answered"></i>已作答</span><span><i></i>待作答</span></div>`;}
function directory(){openDialog('回看／修改答案',`<p class="modal-prose">已作答 ${processed()}/${D.items.length} 题。点序号回到原题；改完后可重新查看结果。</p>${navGrid()}<div class="modal-actions">${canComplete(score())?'<button class="primary" data-action="finish">看看我的消费人格</button>':''}<button class="secondary" data-action="close">继续作答</button></div>`);}
function finish(){
 const r=score();
 if(!canComplete(r)){
  const pending=D.items.findIndex(q=>s.answers[q.id]?.status!=='answered');
  if(pending>=0){s.index=pending;navigate('test');toast('还有题目未作答，请从五个圆圈中选择最符合你的答案。');}
  return;
 }
 s.completedAt=new Date().toISOString();navigate('result');
}
function axisMeta(a){return a.interpretation.headline||a.interpretation.general;}
function axisCard(a){
 const d=axes[a.id],has=a.percentages!==null,n=a.interpretation;
 const ends=[['low',d.low_letter,d.low_label],['high',d.high_letter,d.high_label]];
 return `<article class="axis-card" data-axis="${a.id}" data-pattern="${a.pattern}"><div class="axis-title"><span>${esc(d.name)}</span><b>${a.letter||'—'}</b></div><div class="axis-endpoints">${ends.map(([side,letter,name])=>`<div class="${has&&a.percentages[side]>50?'dominant':''}"><span>${letter} · ${esc(name)}</span><strong>${has?`${a.percentages[side]}<small>%</small>`:'—'}</strong></div>`).join('')}</div>${has?`<div class="axis-meter" aria-hidden="true"><span style="width:${a.percentages.low}%"></span></div>`:'<div class="axis-no-data">这一项暂时留空。</div>'}<div class="axis-narrative" data-copy="${esc(n.copy_key)}">${n.headline?`<h3 class="axis-headline">${esc(n.headline)}</h3>`:''}<p class="axis-long">${esc(n.general)}</p></div></article>`;
}
function result(){
 const r=score(),p=D.personas.find(x=>x.id===r.primary),card=r.result_cards[0];
 const answered=Object.values(s.answers).filter(a=>a.status==='answered').length;
 app.innerHTML=`<main id="main" class="result"><article class="persona-card primary-persona" data-persona="${p.id}" data-result="assigned" style="--tint:${p.color}"><p class="result-kicker">你的消费人格</p><img class="persona-art" src="${p.art}" alt="${esc(p.art_alt)}" width="${p.art_width}" height="${p.art_height}" fetchpriority="high"><h1 tabindex="-1">${esc(card.name)}</h1>${card.quote?`<p class="persona-quote">${esc(card.quote)}</p>`:''}<p class="persona-claim">${esc(card.description)}</p><div class="persona-meta"><span>买点人设 · v${D.version}</span><span>已作答 ${answered}/${D.items.length} 题</span></div><button class="primary" data-action="share">保存我的人格卡 ${icon('arrow')}</button></article>
 <section class="result-section"><div class="axes-heading"><div><h2>你的四个消费切面</h2><p class="section-copy">百分比来自这次回答，不是概率或准确率。</p></div><span class="axis-code" aria-label="四维方向代码 ${r.axis_code}">${r.axis_code}</span></div><div class="axis-grid">${r.axes.map(axisCard).join('')}</div></section><div class="result-actions"><button class="secondary" data-action="directory">回看／修改答案</button><button class="secondary" data-action="restart">重新测试</button><button class="text-button" data-action="home">回首页</button></div></main>`;
}
function closeDialog(){if(modal.open)modal.close();releaseShare();$('#modal-content').replaceChildren();}
function releaseShare(){shareRevision++;shareFile=null;if(shareURL){URL.revokeObjectURL(shareURL);shareURL=null;}}
function openDialog(title,html){cancelAdvance();releaseShare();$('#modal-content').innerHTML=`<div class="modal-header"><h2 id="modal-title">${esc(title)}</h2><button class="close-button" data-action="close" aria-label="关闭">${icon('close')}</button></div>${html}`;if(!modal.open)modal.showModal();}
function restartDialog(){openDialog('重新开始这次测试？',`<p class="modal-prose">这次的${D.items.length}题答案和备注将被清除。旧版记录仍保留。</p><div class="modal-actions"><button class="primary" data-action="confirm-restart">重新开始</button><button class="secondary" data-action="close">保留当前记录</button></div>`);}
function wrap(ctx,text,width){
 const lines=[];let line='';
 for(const ch of text){if(ch==='\n'){lines.push(line);line='';continue;}if(line&&ctx.measureText(line+ch).width>width){lines.push(line);line=ch;}else line+=ch;}
 if(line)lines.push(line);return lines;
}
async function cardBlob(r){
 const p=D.personas.find(x=>x.id===r.primary),card=r.result_cards[0],img=new Image();img.src=p.art;
 await img.decode();await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=900;
 const c=canvas.getContext('2d');
 const font=(size,weight=400)=>{c.font=`${weight} ${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;};
 // Measure all text before sizing the canvas; nothing is truncated to a fixed height.
 font(26,500);const quoteLines=card.quote?wrap(c,card.quote,718):[];
 font(24);const bodyLines=wrap(c,r.share.description,718);
 const blocks=r.axes.map(a=>{font(18);return {a,meta:wrap(c,axisMeta(a),718)};});
 canvas.height=770+quoteLines.length*40+bodyLines.length*38+blocks.reduce((h,b)=>h+154+b.meta.length*26,0)+120;
 const center=(t,y,size=24,weight=400)=>{font(size,weight);c.textAlign='center';c.fillStyle='#20231d';c.fillText(t,450,y);};
 c.fillStyle='#ffffff';c.fillRect(0,0,canvas.width,canvas.height);
 c.strokeStyle='#dedfd5';c.lineWidth=2;c.strokeRect(36,36,828,canvas.height-72);
 c.fillStyle=p.color;c.fillRect(37,37,826,10);
 center('买点人设  /  PERSONALITY RECEIPT',91,21,600);center('你的消费人格',145,24);
 c.drawImage(img,210,165,480,480);
 let nameSize=58;font(nameSize,750);while(c.measureText(card.name).width>730){nameSize-=2;font(nameSize,750);}center(card.name,701,nameSize,750);
 let y=754;
 for(const line of quoteLines){center(line,y,26,500);y+=40;}
 y+=12;c.textAlign='left';font(24);c.fillStyle='#40483a';
 for(const line of bodyLines){c.fillText(line,91,y);y+=38;}
 y+=45;
 for(const {a,meta} of blocks){
  const d=axes[a.id];c.textAlign='left';font(25,650);c.fillStyle='#20231d';c.fillText(d.name,91,y);c.textAlign='right';c.fillText(a.letter||'—',809,y);y+=40;
  const label=(side,letter,name)=>`${letter} ${name}  ${a.percentages===null?'—':a.percentages[side]+'%'}`;
  font(19);c.textAlign='left';c.fillText(label('low',d.low_letter,d.low_label),91,y);c.textAlign='right';c.fillText(label('high',d.high_letter,d.high_label),809,y);y+=28;
  if(a.percentages){c.fillStyle='#acc9b4';c.fillRect(91,y,718,8);c.fillStyle='#6961bc';c.fillRect(91,y,718*a.percentages.low/100,8);}
  y+=38;c.textAlign='left';font(18);c.fillStyle='#60685a';for(const line of meta){c.fillText(line,91,y);y+=26;}y+=48;
 }
 const answered=Object.values(s.answers).filter(a=>a.status==='answered').length;
 center(`${D.items.length} 道生活场景 · v${D.version} · 已作答 ${answered}/${D.items.length} 题`,y,19);
 center('基于本次回答的自我观察 · 买点人设',y+33,18);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片生成失败')),'image/png'));
}
async function showShare(){
 const r=score();if(!s.completedAt||!canComplete(r)||!r.can_share)return;const p=D.personas.find(x=>x.id===r.primary);
 openDialog('保存我的人格卡','<div id="share-body"><p class="modal-prose" role="status">正在准备人物和分享图…</p></div>');const revision=shareRevision;
 try{
  const blob=await cardBlob(r);if(revision!==shareRevision||!modal.open)return;
  shareFile=new File([blob],`买点人设-${p.name}-v${D.version}.png`,{type:'image/png'});shareURL=URL.createObjectURL(blob);
  const native=!!navigator.canShare?.({files:[shareFile]});
  $('#share-body').innerHTML=`<img class="share-image" src="${shareURL}" alt="你的消费人格：${esc(p.name)}，含四维百分比"><div class="modal-actions"><button class="primary" data-action="save-card">保存图片</button>${native?'<button class="secondary" data-action="native-share">分享图片</button>':''}<button class="secondary" data-action="copy-card">复制结果文字</button></div><p class="share-help">手机也可以长按图片保存。分享内容与本次结果一致。</p>`;
 }catch{if(revision===shareRevision&&modal.open)$('#share-body').innerHTML='<p class="modal-prose">人物图片暂时未能加载，无法完整生成分享卡。</p><button class="secondary" data-action="share">重新生成</button>';}
}
function shareCaption(r){const card=r.result_cards[0];return `${r.share.title}\n${card.quote?card.quote+'\n':''}${r.share.description}`;}
async function copyResult(){
 const r=score();if(!canComplete(r)||!r.can_share||!s.completedAt)return;
 const text=`${shareCaption(r)}\n${r.axes.map(a=>{const d=axes[a.id];return `${d.name}：${a.percentages?`${d.low_label} ${a.percentages.low}% / ${d.high_label} ${a.percentages.high}%`:'暂时留空'}`;}).join('\n')}\n买点人设 · ${D.items.length}题 · v${D.version}`;
 try{await navigator.clipboard.writeText(text);toast('结果文字已复制');}
 catch{openDialog('复制结果文字',`<label class="field-label" for="copy-result">长按或全选后复制</label><textarea id="copy-result" class="textarea" readonly>${esc(text)}</textarea>`);$('#copy-result').select();}
}
function start(){if(!s.startedAt)s.startedAt=new Date().toISOString();navigate('test');}
document.addEventListener('click',async event=>{
 if(event.target.matches('input[name="answer"]')){chooseAnswer(Number(event.target.value));return;}
 const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
 switch(b.dataset.action){
 case'about':openDialog('花钱的样子，也有一点个性。',`<div class="modal-prose"><p>${D.items.length}道生活场景，14种消费人格。从这次回答中，看看最突出的消费模式。</p><p>两端代表不同选择，中间代表中立。每题从五个圆圈中，选择最符合你的答案。</p><p>点选后自动进入下一题，可以随时返回修改。答完全部${D.items.length}题后，点击“看看我的消费人格”。不会追加题目。</p><p>结果会直接给出一个消费人格，附上人物插画与性格介绍。四维百分比独立来自你的回答，不是概率或准确率。</p><p>这是供自我观察和交流的测试，没有消费优等生，不是心理诊断或理财建议。</p></div>`);break;
 case'privacy':openDialog('答案留在这台设备。',`<div class="modal-prose"><p>答案在你的浏览器里计算。新版进度、答案和你自愿留下的单题备注保存在本机，没有集中收集答案。</p><p>无需填写姓名、账号或真实消费金额。分享图片和文字需由你主动操作。</p><p>旧版记录单独保留，不转换为新版${D.items.length}题答案。换浏览器或清理网站数据后，进度可能无法恢复。</p></div><div class="modal-actions"><button class="secondary" data-action="clear-dialog">清除本次记录</button><button class="primary" data-action="close">知道了</button></div>`);break;
 case'start':start();break;
 case'resume':navigate(s.completedAt&&canComplete(score())?'result':'test');break;
 case'home':navigate('home');break;
 case'previous':if(s.index>0){s.index--;navigate('test');}break;
 case'next':if(s.index<D.items.length-1){s.index++;navigate('test');}break;
 case'directory':directory();break;
 case'jump':s.index=Math.max(0,Math.min(D.items.length-1,Number(b.dataset.index)));navigate('test');break;
 case'finish':finish();break;
 case'close':closeDialog();break;
 case'restart':restartDialog();break;
 case'confirm-restart':s=fresh();save();start();break;
 case'clear-dialog':openDialog('清除本次记录？',`<p class="modal-prose">新版${D.items.length}题答案与单题备注会被清除。旧版记录保留。</p><div class="modal-actions"><button class="primary" data-action="clear">清除</button><button class="secondary" data-action="close">取消</button></div>`);break;
 case'clear':s=fresh();save();navigate('home');toast('本次记录已清除');break;
 case'question-feedback':{const q=D.items[s.index];openDialog('这道题，哪里卡住了？',`<p class="modal-prose">这条备注只保存在本机，不会发送，也不影响答案。</p><label class="field-label" for="question-note">第${s.index+1}题 · ${esc(q.prompt)}</label><textarea class="textarea" id="question-note" maxlength="800">${esc(s.questionFeedback[q.id]||'')}</textarea><div class="modal-actions"><button class="primary" data-action="save-question-note">保存在本机</button></div>`);break;}
 case'save-question-note':s.questionFeedback[D.items[s.index].id]=$('#question-note').value.trim();save();closeDialog();question();toast('备注已保存在本机');break;
 case'share':await showShare();break;
 case'save-card':if(shareFile&&shareURL){const a=document.createElement('a');a.href=shareURL;a.download=shareFile.name;document.body.append(a);a.click();a.remove();}break;
 case'native-share':if(shareFile){try{await navigator.share({files:[shareFile],title:'我的消费人格',text:shareCaption(score())});}catch(err){if(err.name!=='AbortError')toast('暂时无法调用分享，请保存图片后分享。');}}break;
 case'copy-card':await copyResult();break;
 }
});
// Arrow keys on a focused radio also emit change; repeated records are harmless and reset one timer.
document.addEventListener('change',event=>{if(event.target.name==='answer')chooseAnswer(Number(event.target.value));});
modal.addEventListener('cancel',releaseShare);
modal.addEventListener('close',()=>{if(!modal.open){releaseShare();$('#modal-content').replaceChildren();}});
window.addEventListener('hashchange',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAdvance();save();}});
window.addEventListener('pagehide',()=>{cancelAdvance();save();});
render();
})();
