(function(){
'use strict';
const D=window.QUIZ_DATA,E=window.PaytiV09Engine,C=window.AXIS_COPY;
const KEY='payti:0.9:answers',app=document.querySelector('#app'),modal=document.querySelector('#modal');
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={cart:'M4 5h3l3 14h13l3-11H8 M12 25h.01 M22 25h.01',arrow:'M5 16h22m-8-8 8 8-8 8',back:'M27 16H5m8-8-8 8 8 8',check:'M7 16l6 6L26 8',close:'M8 8l16 16M24 8 8 24'};
const icon=name=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.cart}"/></svg>`;
const axes={T:{label:'时间倾向',ends:[['N','即刻兑现'],['L','接受等待']]},V:{label:'价值取向',ends:[['U','功能实用'],['E','情绪意义']]},D:{label:'决策方式',ends:[['I','整体感受'],['A','逐项比较']]},S:{label:'参照来源',ends:[['S','个人偏好'],['O','外部参照']]}};
const statusLabels={answered:'已作答',not_applicable:'无相关经历',skipped:'已跳过',unanswered:'待处理'};
let storageOK=true,legacyPresent=false,s=fresh(),currentView='',advanceTimer=null,shareURL=null,shareFile=null,shareRevision=0;
function fresh(){return{version:D.version,answers:{},index:0,startedAt:null,completedAt:null,questionFeedback:{}};}
try{
 legacyPresent=['maidian-renshe-v05','maidian-renshe-v07','maidian-renshe-v08'].some(k=>localStorage.getItem(k)!==null);
 const saved=JSON.parse(localStorage.getItem(KEY)||'null');
 if(E.validSession(D,saved))s={...fresh(),answers:saved.answers,index:saved.index,startedAt:saved.startedAt||null,completedAt:saved.completedAt||null,questionFeedback:saved.questionFeedback&&typeof saved.questionFeedback==='object'?saved.questionFeedback:{}};
}catch{storageOK=false;}
const envelope=()=>({version:D.version,answers:s.answers});
const processed=()=>D.items.filter(q=>s.answers[q.id]&&s.answers[q.id].status!=='unanswered').length;
const score=()=>E.score(D,envelope());
function save(){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{storageOK=false;}}
function cancelAdvance(){clearTimeout(advanceTimer);advanceTimer=null;}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').classList.remove('show'),4000);}
function navigate(view){cancelAdvance();closeDialog();save();if(location.hash!==`#${view}`)location.hash=view;else render();}
function focusHeading(){requestAnimationFrame(()=>{$('#main h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});}
function render(){
 cancelAdvance();closeDialog();currentView=location.hash.slice(1)||'home';
 if(currentView==='intro'||currentView==='review')currentView='test';
 if(!['home','test','result'].includes(currentView))currentView='home';
 if(currentView==='result'&&(!s.completedAt||!score().can_submit))currentView=processed()?'test':'home';
 if(location.hash!==`#${currentView}`)history.replaceState(null,'','#'+currentView);
 if(currentView==='test'&&!s.startedAt)s.startedAt=new Date().toISOString();
 document.body.dataset.view=currentView;({home,test:question,result}[currentView])();save();focusHeading();
}
function home(){const progress=processed();app.innerHTML=`<main id="main" class="home"><section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="dot"></span> SOME HABITS ARE A WHOLE PERSONALITY.</div><h1 tabindex="-1">这很难评，<br><em>测一下。</em></h1><p class="hero-desc">有人买了就用，有人先放购物车。<br>有人为爱充值，有人等一个好价格。<br>你花钱的样子，可能比你想的更有意思。</p><div class="hero-actions"><button class="primary" data-action="${progress?'resume':'start'}">${progress?`继续上次 · ${progress}/${D.items.length}`:'测测我的消费人格'} ${icon('arrow')}</button>${progress?'<button class="text-button" data-action="restart">重新开始</button>':'<span style="font-size:11px;color:var(--muted);line-height:1.9">不用算账<br>凭真实的自己选</span>'}</div><div class="hero-note">${icon('check')} <span>没有标准答案，也没有消费优等生。</span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="receipt"><div class="receipt-top"><span>PERSONALITY RECEIPT</span><span>No. 009</span></div><div class="receipt-face">${icon('cart')}</div><h2>你的消费<br>有点个性。</h2><div class="receipt-line"><span>生活里的小选择</span><span>× ${D.items.length}</span></div><div class="receipt-line"><span>意料之外的自己</span><span>待发现</span></div><div class="receipt-end"><span>本次收获</span><span>一点自我认识 ↗</span></div><div class="barcode"></div></div><div class="floating-tag tag-one">✳ 人类购物车</div><div class="floating-tag tag-two">↗ 先爽再说</div><div class="floating-tag tag-three">⌁ 这个真的需要</div><div class="hero-spark">✳</div></div></section>${legacyPresent&&!progress?'<div class="notice">题库已更新为50题。旧版记录仍保留在本机，新版请重新作答。</div>':''}<div class="home-meta"><div class="meta-item"><strong>${D.items.length}<span>道题</span></strong><p>具体生活场景<br>想象一下，或回想一下</p></div><div class="meta-item"><strong>${D.personas.length}<span>种人设</span></strong><p>从你的回答出发<br>得到一个消费人格</p></div><div class="meta-item"><strong>按你<span>的节奏</span></strong><p>可以返回修改<br>进度保存在这台设备</p></div></div></main>`;document.querySelector('.hero-note svg').style.cssText='width:13px;height:13px;flex-shrink:0';}
function question(){
 const q=D.items[s.index],a=s.answers[q.id],ends=E.displayEndpoints(q),value=a?.status==='answered'?a.value:null;
 app.innerHTML=`<main id="main" class="quiz"><div class="quiz-progress-head"><button class="back-link" data-action="home">${icon('back')} 暂存，回首页</button><button class="progress-count" data-action="directory" aria-label="打开题目目录，当前第${s.index+1}题，共50题"><strong>${String(s.index+1).padStart(2,'0')}</strong> / ${D.items.length} ▦</button></div>
 <article class="question question-enter" data-question="${q.id}"><h1 tabindex="-1">${esc(q.title)}</h1><div class="scenario">${q.html}</div><div class="answer-area"><p class="answer-prompt">哪一边更像你？</p><div class="endpoint-row"><div>${esc(ends.left)}</div><div>${esc(ends.right)}</div></div>
 <fieldset class="scale"><legend class="sr-only">从偏左到偏右，选择最像你的程度；中间代表中立</legend>${[1,2,3,4,5].map((v,k)=>`<label style="--scale-color:${v<3?'#6961bc':v>3?'#5f856b':'#93998a'};--size:${[42,34,26,34,42][k]}px"><input type="radio" name="answer" value="${v}" ${value===v?'checked':''} aria-label="${['明显偏左','稍微偏左','中立，两边差不多','稍微偏右','明显偏右'][k]}${v===3?'':`：${esc(v<3?ends.left:ends.right)}`}"><span class="circle-target"><span class="circle">${icon('check')}</span></span></label>`).join('')}</fieldset></div>
 <div class="missing-options"><button class="missing-choice" data-action="not-applicable" aria-pressed="${a?.status==='not_applicable'}">无相关经历</button><button class="missing-choice" data-action="skip" aria-pressed="${a?.status==='skipped'}">跳过</button></div><p class="missing-hint">${q.recall?'回想最近半年，有类似机会时的实际情况。':'请代入情境；无法代入时可以跳过。'} 中间圆圈代表中立。</p></article>
 <div id="question-actions"></div><div class="question-bottom"><span id="storage-note">${storageOK?'进度已在本机暂存':'浏览器无法暂存，请保持页面打开'}</span><button data-action="question-feedback">${s.questionFeedback[q.id]?'这题的备注已保存 ✓':'这题有点不好懂'}</button></div></main>`;
 syncActions();
}
function syncActions(){
 const a=s.answers[D.items[s.index].id],handled=a&&a.status!=='unanswered',complete=processed()===D.items.length;
 const finish=handled&&(s.index===D.items.length-1||complete);
 $('#question-actions').innerHTML=`<div class="quiz-nav"><button class="back-link" data-action="previous" ${s.index===0?'disabled':''}>${icon('back')} 上一题</button>${!finish&&handled&&s.index<D.items.length-1?'<button class="back-link" data-action="next">下一题 →</button>':''}</div>${finish?`<div class="finish-area"><button class="primary" data-action="finish">看看我的消费人格 ${icon('arrow')}</button></div>`:''}`;
 if(!storageOK)$('#storage-note').textContent='浏览器无法暂存，请保持页面打开';
}
function record(status,value){
 s.answers[D.items[s.index].id]={status,value};s.completedAt=null;save();
 document.querySelectorAll('input[name="answer"]').forEach(r=>r.checked=status==='answered'&&Number(r.value)===value);
 $('[data-action="not-applicable"]').setAttribute('aria-pressed',String(status==='not_applicable'));
 $('[data-action="skip"]').setAttribute('aria-pressed',String(status==='skipped'));
 syncActions();
}
function chooseAnswer(status,value=null){
 if(currentView!=='test'||modal.open)return;
 cancelAdvance();record(status,value);
 const index=s.index;
 // A completed answer set stays on the edited item so the updated result is one click away.
 if(index===D.items.length-1||processed()===D.items.length)return;
 advanceTimer=setTimeout(()=>{
  advanceTimer=null;
  if(currentView==='test'&&location.hash==='#test'&&!modal.open&&!document.hidden&&s.index===index){s.index++;navigate('test');}
 },350);
}
function navGrid(){return`<div class="review-grid">${D.items.map((q,k)=>{const state=s.answers[q.id]?.status||'unanswered';return`<button class="q-nav-btn ${state} ${k===s.index?'current':''}" data-action="jump" data-index="${k}" aria-label="第${k+1}题 ${esc(q.title)}，${statusLabels[state]}">${String(k+1).padStart(2,'0')}</button>`;}).join('')}</div><div class="directory-legend"><span><i class="answered"></i>已作答</span><span><i class="not_applicable"></i>无经历</span><span><i class="skipped"></i>已跳过</span><span><i></i>待处理</span></div>`;}
function directory(){openDialog('回看／修改答案',`<p class="modal-prose">已处理 ${processed()}/50 题。点序号回到原题；改完后可重新查看结果。</p>${navGrid()}<div class="modal-actions">${score().can_submit?'<button class="primary" data-action="finish">看看我的消费人格</button>':''}<button class="secondary" data-action="close">继续作答</button></div>`);}
function finish(){
 const r=score();
 if(!r.can_submit){
  const pending=D.items.findIndex(q=>!s.answers[q.id]||s.answers[q.id].status==='unanswered');
  if(pending>=0){s.index=pending;navigate('test');toast('还有题目待处理，请作答、选择无相关经历或跳过。');}
  else{s.index=D.items.findIndex(q=>q.role==='inclination'||q.role==='behavior');navigate('test');toast('还需要至少回答一道消费习惯题，才能生成人格结果。');}
  return;
 }
 s.completedAt=new Date().toISOString();navigate('result');
}
function axisText(key,r){
 const v=E.decode(D,envelope()).values,pair=D.axes[key].map(id=>v[id]??'_').join(','),mode='matched';
 const indices=C.map[key][pair][r.primary][mode];return indices.map(i=>C.fragments[i]).join('');
}
function axisMeta(a){
 if(a.state==='insufficient')return'尚无有效回答 · 暂不显示方向';
 if(a.letter_basis==='fixed_tiebreak')return'两端 50/50 · 字母按中立同分规则显示，不代表偏向';
 if(a.letter_basis==='primary_item_tiebreak')return'两端 50/50 · 字母按主场景方向显示';
 if(a.answered===1)return'已作答 1/2 题';
 return({opposing:'两个场景的方向不同',partly_neutral:'一个场景有倾向，一个场景中立',consistent:'两个场景的方向一致'})[a.pattern]||'';
}
function axisCard(key,r){
 const a=r.axes[key],d=axes[key],has=a.percentages!==null,first=d.ends[0][0];
 return`<article class="axis-card" data-axis="${key}" data-pattern="${a.pattern}"><div class="axis-title"><span>${d.label}</span><b>${a.letter||'—'}</b></div><div class="axis-endpoints">${d.ends.map(([letter,name])=>`<div class="${has&&a.percentages[letter]>50?'dominant':''}"><span>${letter} · ${name}</span><strong>${has?`${a.percentages[letter]}<small>%</small>`:'—'}</strong></div>`).join('')}</div>${has?`<div class="axis-meter" aria-hidden="true"><span style="width:${a.percentages[first]}%"></span></div>`:'<div class="axis-no-data">没有有效答案，保留空位。</div>'}<p class="axis-state">${axisMeta(a)}</p><p class="axis-long">${esc(axisText(key,r))}</p></article>`;
}
function result(){
 const r=score(),p=D.personas.find(x=>x.id===r.primary);
 app.innerHTML=`<main id="main" class="result"><article class="persona-card primary-persona" data-persona="${p.id}" data-result="assigned" style="--tint:${p.color}"><p class="result-kicker">你的消费人格</p><img class="persona-art" src="${p.art}" alt="${esc(p.art_alt)}" width="1254" height="1254" fetchpriority="high"><h1 tabindex="-1">${esc(p.name)}</h1><p class="persona-quote">${esc(p.quote)}</p><p class="persona-claim">${esc(p.result_description)}</p><div class="persona-meta"><span>买点人设 · v0.9</span><span>已作答 ${r.coverage.answered}/50 题</span></div><button class="primary" data-action="share">保存我的人格卡 ${icon('arrow')}</button></article>
 <section class="result-section"><div class="axes-heading"><div><h2>你的四个消费切面</h2><p class="section-copy">百分比来自这次回答，不是概率或准确率。</p></div><span class="axis-code" aria-label="四维方向代码 ${r.axis_code}">${r.axis_code}</span></div><div class="axis-grid">${Object.keys(axes).map(key=>axisCard(key,r)).join('')}</div></section><div class="result-actions"><button class="secondary" data-action="directory">回看／修改答案</button><button class="secondary" data-action="restart">重新测试</button><button class="text-button" data-action="home">回首页</button></div></main>`;
}
function closeDialog(){if(modal.open)modal.close();releaseShare();$('#modal-content').replaceChildren();}
function releaseShare(){shareRevision++;shareFile=null;if(shareURL){URL.revokeObjectURL(shareURL);shareURL=null;}}
function openDialog(title,html){cancelAdvance();releaseShare();$('#modal-content').innerHTML=`<div class="modal-header"><h2 id="modal-title">${esc(title)}</h2><button class="close-button" data-action="close" aria-label="关闭">${icon('close')}</button></div>${html}`;if(!modal.open)modal.showModal();}
function restartDialog(){openDialog('重新开始这次测试？','<p class="modal-prose">这次的50题答案和备注将被清除。旧版记录仍保留。</p><div class="modal-actions"><button class="primary" data-action="confirm-restart">重新开始</button><button class="secondary" data-action="close">保留当前记录</button></div>');}
function wrap(ctx,text,width){
 const lines=[];let line='';
 for(const ch of text){if(ch==='\n'){lines.push(line);line='';continue;}if(line&&ctx.measureText(line+ch).width>width){lines.push(line);line=ch;}else line+=ch;}
 if(line)lines.push(line);return lines;
}
async function cardBlob(r){
 const p=D.personas.find(x=>x.id===r.primary),img=new Image();img.src=p.art;
 await img.decode();await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=900;canvas.height=2200;const c=canvas.getContext('2d');
 const font=(size,weight=400)=>{c.font=`${weight} ${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;};
 const center=(t,y,size=24,weight=400)=>{font(size,weight);c.textAlign='center';c.fillStyle='#20231d';c.fillText(t,450,y);};
 c.fillStyle='#f6f5ef';c.fillRect(0,0,900,2200);c.fillStyle=p.color;c.fillRect(36,36,828,2128);
 center('买点人设  /  PERSONALITY RECEIPT',85,21,600);
 center('你的消费人格',139,24);
 c.drawImage(img,210,150,480,480);
 let nameSize=58;font(nameSize,750);while(c.measureText(p.name).width>730){nameSize-=2;font(nameSize,750);}center(p.name,680,nameSize,750);
 font(26,500);let y=738;for(const line of wrap(c,p.quote,718)){center(line,y,26,500);y+=40;}
 y+=20;
 c.textAlign='left';
 for(const [key,d] of Object.entries(axes)){
  const a=r.axes[key];font(23,650);c.fillStyle='#20231d';c.fillText(d.label,88,y);
  c.textAlign='right';c.fillText(a.letter||'—',810,y);c.textAlign='left';y+=38;
  font(21);const label=([letter,name])=>`${letter} ${name}  ${a.percentages===null?'无数据':a.percentages[letter]+'%'}`;
  c.fillText(label(d.ends[0]),88,y);c.textAlign='right';c.fillText(label(d.ends[1]),810,y);c.textAlign='left';y+=29;
  if(a.percentages){c.fillStyle='#acc9b4';c.fillRect(88,y,724,8);c.fillStyle='#6961bc';c.fillRect(88,y,724*a.percentages[d.ends[0][0]]/100,8);}
  y+=30;
  if(a.letter_basis!=='greater_percentage'||a.answered===1){font(17);c.fillStyle='#52574d';for(const line of wrap(c,axisMeta(a),724)){c.fillText(line,88,y);y+=23;}}
  y+=26;
 }
 // Crop only the unused bottom; content height follows the axis overview.
 const bottom=y+122,output=document.createElement('canvas');output.width=900;output.height=bottom;
 const ctx=output.getContext('2d');ctx.fillStyle='#f6f5ef';ctx.fillRect(0,0,900,bottom);ctx.fillStyle=p.color;ctx.fillRect(36,36,828,bottom-72);ctx.drawImage(canvas,0,0,900,y,0,0,900,y);
 ctx.fillStyle='#4d5546';ctx.textAlign='center';ctx.font='19px -apple-system, "PingFang SC", sans-serif';ctx.fillText('50 道生活场景 · v0.9 · 本次已作答 '+r.coverage.answered+'/50 题',450,y+31);ctx.font='17px -apple-system, "PingFang SC", sans-serif';ctx.fillText('基于本次回答的自我观察 · 不是心理诊断',450,y+65);
 return new Promise((resolve,reject)=>output.toBlob(blob=>blob?resolve(blob):reject(new Error('图片生成失败')),'image/png'));
}
async function showShare(){
 const r=score();if(!s.completedAt||!r.can_submit)return;const p=D.personas.find(x=>x.id===r.primary);
 openDialog('保存我的人格卡','<div id="share-body"><p class="modal-prose" role="status">正在准备人物和分享图…</p></div>');const revision=shareRevision;
 try{
  const blob=await cardBlob(r);if(revision!==shareRevision||!modal.open)return;
  shareFile=new File([blob],`买点人设-${p.name}-v0.9.png`,{type:'image/png'});shareURL=URL.createObjectURL(blob);
  const native=!!navigator.canShare?.({files:[shareFile]});
  $('#share-body').innerHTML=`<img class="share-image" src="${shareURL}" alt="你的消费人格：${esc(p.name)}，含四维百分比"><div class="modal-actions"><button class="primary" data-action="save-card">保存图片</button>${native?'<button class="secondary" data-action="native-share">分享图片</button>':''}<button class="secondary" data-action="copy-card">复制结果文字</button></div><p class="share-help">手机也可以长按图片保存。分享内容与本次结果一致。</p>`;
 }catch{if(revision===shareRevision&&modal.open)$('#share-body').innerHTML='<p class="modal-prose">人物图片暂时未能加载，无法完整生成分享卡。</p><button class="secondary" data-action="share">重新生成</button>';}
}
function shareCaption(r){const p=D.personas.find(x=>x.id===r.primary);return `我的消费人格：${p.name}。\n${p.quote}`;}
async function copyResult(){
 const r=score();if(!r.can_submit||!s.completedAt)return;
 const text=`${shareCaption(r)}\n四维：${r.axis_code}\n买点人设 · 50题 · v0.9`;
 try{await navigator.clipboard.writeText(text);toast('结果文字已复制');}
 catch{openDialog('复制结果文字',`<label class="field-label" for="copy-result">长按或全选后复制</label><textarea id="copy-result" class="textarea" readonly>${esc(text)}</textarea>`);$('#copy-result').select();}
}
function start(){if(!s.startedAt)s.startedAt=new Date().toISOString();navigate('test');}
document.addEventListener('click',async event=>{
 if(event.target.matches('input[name="answer"]')){chooseAnswer('answered',Number(event.target.value));return;}
 const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
 switch(b.dataset.action){
 case'about':openDialog('花钱的样子，也有一点个性。','<div class="modal-prose"><p>50道生活场景，14种消费人格。从这次回答中，看看最突出的消费模式。</p><p>两端代表不同选择，中间代表中立。按题目描述选择；回忆题按最近半年、有类似机会时的实际情况回答。没有经历或无法代入，可以分别选择“无相关经历”或“跳过”。</p><p>点选后自动进入下一题，可以随时返回修改。50题都处理完、且至少回答一道消费习惯题后，点击“看看我的消费人格”。不会追加题目。</p><p>结果会直接给出一个消费人格，附上人物插画与性格介绍。四维百分比独立来自你的回答，不是概率或准确率。</p><p>这是供自我观察和交流的测试，没有消费优等生，不是心理诊断或理财建议。</p></div>');break;
 case'privacy':openDialog('答案留在这台设备。','<div class="modal-prose"><p>答案在你的浏览器里计算。新版进度、答案和你自愿留下的单题备注保存在本机，没有集中收集答案。</p><p>无需填写姓名、账号或真实消费金额。分享图片和文字需由你主动操作。</p><p>旧版记录单独保留，不转换为新版50题答案。换浏览器或清理网站数据后，进度可能无法恢复。</p></div><div class="modal-actions"><button class="secondary" data-action="clear-dialog">清除本次记录</button><button class="primary" data-action="close">知道了</button></div>');break;
 case'start':start();break;
 case'resume':navigate(s.completedAt&&score().can_submit?'result':'test');break;
 case'home':navigate('home');break;
 case'previous':if(s.index>0){s.index--;navigate('test');}break;
 case'next':if(s.index<D.items.length-1){s.index++;navigate('test');}break;
 case'not-applicable':chooseAnswer('not_applicable');break;
 case'skip':chooseAnswer('skipped');break;
 case'directory':directory();break;
 case'jump':s.index=Math.max(0,Math.min(D.items.length-1,Number(b.dataset.index)));navigate('test');break;
 case'finish':finish();break;
 case'close':closeDialog();break;
 case'restart':restartDialog();break;
 case'confirm-restart':s=fresh();save();start();break;
 case'clear-dialog':openDialog('清除本次记录？','<p class="modal-prose">新版50题答案与单题备注会被清除。旧版记录保留。</p><div class="modal-actions"><button class="primary" data-action="clear">清除</button><button class="secondary" data-action="close">取消</button></div>');break;
 case'clear':s=fresh();save();navigate('home');toast('本次记录已清除');break;
 case'question-feedback':{const q=D.items[s.index];openDialog('这道题，哪里卡住了？',`<p class="modal-prose">这条备注只保存在本机，不会发送，也不影响答案。</p><label class="field-label" for="question-note">第${s.index+1}题 · ${esc(q.title)}</label><textarea class="textarea" id="question-note" maxlength="800">${esc(s.questionFeedback[q.id]||'')}</textarea><div class="modal-actions"><button class="primary" data-action="save-question-note">保存在本机</button></div>`);break;}
 case'save-question-note':s.questionFeedback[D.items[s.index].id]=$('#question-note').value.trim();save();closeDialog();question();toast('备注已保存在本机');break;
 case'share':await showShare();break;
 case'save-card':if(shareFile&&shareURL){const a=document.createElement('a');a.href=shareURL;a.download=shareFile.name;document.body.append(a);a.click();a.remove();}break;
 case'native-share':if(shareFile){try{await navigator.share({files:[shareFile],title:'我的消费人格',text:shareCaption(score())});}catch(err){if(err.name!=='AbortError')toast('暂时无法调用分享，请保存图片后分享。');}}break;
 case'copy-card':await copyResult();break;
 }
});
// Arrow keys on a focused radio also emit change; repeated records are harmless and reset one timer.
document.addEventListener('change',event=>{if(event.target.name==='answer')chooseAnswer('answered',Number(event.target.value));});
modal.addEventListener('cancel',releaseShare);
modal.addEventListener('close',()=>{if(!modal.open){releaseShare();$('#modal-content').replaceChildren();}});
window.addEventListener('hashchange',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAdvance();save();}});
window.addEventListener('pagehide',()=>{cancelAdvance();save();});
render();
})();
