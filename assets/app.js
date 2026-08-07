const $=s=>document.querySelector(s);
const NEW_KEY='vthangSiteDataV8',OLD_KEY='vthangSiteDataV7';
let data,previewState={images:[],index:0};
const escapeHTML=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','"':'&quot;'}[c]));

function migrateOption(o={},fallback='Lựa chọn'){const children=Array.isArray(o.children)?o.children.map((x,i)=>migrateOption(x,`Lựa chọn ${i+1}`)):[];return {label:o.label||fallback,description:o.description||'',hasDescription:o.hasDescription??Boolean(o.description),url:o.url||'',hasChildren:o.hasChildren??Boolean(children.length),children}}
function legacyOptions(p,type){const arr=Array.isArray(p[type+'Options'])?p[type+'Options']:[];return arr.map((x,i)=>migrateOption(x,`Lựa chọn ${i+1}`))}
function normalizeProduct(p={}){
  p.downloadOptions=legacyOptions(p,'download');p.keyOptions=legacyOptions(p,'key');
  p.guideType=p.guideType||'text';p.guideText=p.guideText??p.guide??'';p.guideUrl=p.guideUrl||'';p.guideVideo=p.guideVideo||'';p.guideOptions=(p.guideOptions||[]).map((x,i)=>migrateOption(x,`Lựa chọn ${i+1}`));
  p.previewImages=Array.isArray(p.previewImages)&&p.previewImages.length?p.previewImages.filter(Boolean):(p.previewImage?[p.previewImage]:p.cover?[p.cover]:[]);
  return p;
}
function normalizeData(x={}){x.version=8;x.notifications=Array.isArray(x.notifications)?x.notifications:[];x.products=(x.products||[]).map(normalizeProduct);x.effects={particles:true,avatarGlow:true,verifiedShine:true,backgroundMotion:true,...(x.effects||{})};return x}
async function getData(){const base=normalizeData(await fetch('data.json?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('data.json');return r.json()}));let saved=null;for(const k of [NEW_KEY,OLD_KEY]){try{saved=JSON.parse(localStorage.getItem(k)||'null');if(saved)break}catch{}}return saved?normalizeData({...base,...saved}):base}

function actionCell(cls,label,attr,index){return `<div class="action-cell"><button class="main-action ${cls}" ${attr}="${index}">${escapeHTML(label)}</button></div>`}
function render(){
  document.title=data.profileName||'Trang chủ';$('#profileName').textContent=data.profileName||'';$('#helloText').textContent=data.helloText||'';$('#taglinePrefix').textContent=data.taglinePrefix||"and I’m a ";$('#subtitle').textContent=data.subtitle||'';$('#avatar').src=data.avatar||'';$('#bellIcon').src=data.bellIcon||'';$('#footerText').textContent=data.footer||'';
  $('#noticeDot').hidden=!(data.notifications||[]).length;
  $('#socials').innerHTML=(data.socials||[]).map(s=>`<a class="social-link" href="${escapeHTML(s.url||'#')}" target="_blank" rel="noopener"><img src="${escapeHTML(s.image||'')}" alt="${escapeHTML(s.name||'')}"></a>`).join('');
  $('#products').innerHTML=(data.products||[]).map((p,i)=>`<article class="product-card"><div class="cover-area"><img class="cover" src="${escapeHTML(p.cover||'')}" alt="${escapeHTML(p.title||'')}"><span class="platform">${escapeHTML(p.platform||'')}</span><img class="game-logo" src="${escapeHTML(p.logo||p.cover||'')}" alt=""></div><div class="product-body"><div class="product-heading"><h2>${escapeHTML(p.title||'')}</h2><p>${escapeHTML(p.description||'')}</p></div><div class="button-grid">${actionCell('download','Tải xuống','data-choice-download',i)}${actionCell('getkey','Lấy key','data-choice-key',i)}${actionCell('preview','Preview','data-preview',i)}${actionCell('guide','Hướng dẫn','data-guide',i)}</div></div></article>`).join('');
  setupMusic();applyEffectToggles();applyAutoTheme();
}
function applyAutoTheme(){const h=new Date().getHours();document.body.classList.toggle('dark',h<6||h>=18)}

function counterKey(kind){const prefix=(data.counterPrefix||location.hostname).replace(/[^a-zA-Z0-9_-]/g,'-'),day=new Date().toISOString().slice(0,10);return kind==='today-downloads'?`${prefix}-${kind}-${day}`:`${prefix}-${kind}`}
async function counter(action,key){const r=await fetch(`https://countapi.mileshilliard.com/api/v1/${action}/${encodeURIComponent(key)}`,{cache:'no-store'});if(!r.ok)throw new Error('counter');return r.json()}
async function loadCounters(){for(const [id,kind,act] of [['totalViews','views','hit'],['todayDownloads','today-downloads','get'],['totalGetKeys','getkeys','get']])try{const v=await counter(act,counterKey(kind));$('#'+id).textContent=Number(v.value||0).toLocaleString('vi-VN')}catch{$('#'+id).textContent=id==='totalViews'?'—':'0'}}
async function bump(kind,id){try{const v=await counter('hit',counterKey(kind));if(id)$('#'+id).textContent=Number(v.value||0).toLocaleString('vi-VN')}catch{}}

function resetModal(){previewState={images:[],index:0};$('#modalMedia').innerHTML='';$('#modalText').innerHTML='';$('#modalTitle').textContent=''}
function showModal(title){$('#modalTitle').textContent=title;document.body.classList.add('modal-open');$('#modal').showModal()}
function youtubeEmbed(url){try{const u=new URL(url);let id='';if(u.hostname.includes('youtu.be'))id=u.pathname.slice(1);else if(u.hostname.includes('youtube.com'))id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop();return id?`https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1`:''}catch{return ''}}

function renderChoiceLevel(title,options,kind,trail=[]){resetModal();showModal(title);const crumbs=trail.length?`<button class="choice-back" data-choice-back="1">← Quay lại</button>`:'';$('#modalText').innerHTML=crumbs+`<div class="choice-list">${options.map((o,i)=>`<button class="choice-item" data-tree-index="${i}"><span class="choice-item-row"><span class="choice-item-main"><b>${escapeHTML(o.label||`Lựa chọn ${i+1}`)}</b>${o.hasDescription!==false&&o.description?`<small>${escapeHTML(o.description)}</small>`:''}</span>${o.hasChildren!==false&&o.children?.length?'<span class="choice-arrow">›</span>':''}</span></button>`).join('')}</div>`;$('#modal').dataset.choiceKind=kind;$('#modal')._choiceStack=[...trail,{title,options}]}
function openTree(title,options,kind){if(!options?.length)return;renderChoiceLevel(title,options,kind,[])}
function chooseTreeIndex(i){const stack=$('#modal')._choiceStack||[],cur=stack.at(-1),o=cur?.options?.[i];if(!o)return;if(o.hasChildren!==false&&o.children?.length){renderChoiceLevel(o.label||'Lựa chọn',o.children,$('#modal').dataset.choiceKind,stack);return}if(o.url&&o.url!=='#'){const kind=$('#modal').dataset.choiceKind;if(kind==='download')bump('today-downloads','todayDownloads');if(kind==='key')bump('getkeys','totalGetKeys');window.open(o.url,'_blank','noopener');$('#modal').close()}}
function choiceBack(){const stack=$('#modal')._choiceStack||[];if(stack.length<=1)return;const prev=stack[stack.length-2];renderChoiceLevel(prev.title,prev.options,$('#modal').dataset.choiceKind,stack.slice(0,-2))}

function renderPreview(){const images=previewState.images;if(!images.length){$('#modalMedia').innerHTML='<p>Chưa có ảnh Preview.</p>';return}const i=Math.max(0,Math.min(previewState.index,images.length-1));previewState.index=i;$('#modalMedia').innerHTML=`<div class="preview-stage"><img src="${escapeHTML(images[i])}" alt="Preview ${i+1}">${images.length>1?`<div class="preview-nav"><button data-preview-prev="1">‹</button><button data-preview-next="1">›</button></div>`:''}</div><div class="preview-count">${i+1} / ${images.length}</div>${images.length>1?`<div class="preview-thumbs">${images.map((src,j)=>`<button class="preview-thumb ${j===i?'active':''}" data-preview-thumb="${j}"><img src="${escapeHTML(src)}" alt=""></button>`).join('')}</div>`:''}`}
function openPreview(p){resetModal();previewState={images:(p.previewImages||[]).filter(Boolean),index:0};showModal('Preview');renderPreview()}

function openGuide(p){const type=p.guideType||'text';if(type==='link'){if(p.guideUrl)window.open(p.guideUrl,'_blank','noopener');return}if(type==='choices'){openTree('Hướng dẫn',p.guideOptions||[],'guide');return}resetModal();showModal('Hướng dẫn');if(type==='video'){const src=p.guideVideo||p.guideUrl||'',yt=youtubeEmbed(src);$('#modalMedia').innerHTML=yt?`<iframe src="${escapeHTML(yt)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`:`<video src="${escapeHTML(src)}" controls autoplay playsinline></video>`}else $('#modalText').textContent=p.guideText||''}
function openNotifications(){resetModal();showModal('Thông báo');const list=data.notifications||[];$('#modalText').innerHTML=list.length?`<div class="notice-list">${list.map(n=>`<article class="notice-card"><b>${escapeHTML(n.title||'Thông báo')}</b>${n.text?`<p>${escapeHTML(n.text)}</p>`:''}${n.link?`<a href="${escapeHTML(n.link)}" target="_blank" rel="noopener">${escapeHTML(n.linkLabel||'Xem chi tiết')} →</a>`:''}</article>`).join('')}</div>`:'Chưa có thông báo.'}

document.addEventListener('click',e=>{
  const d=e.target.closest('[data-choice-download]'),k=e.target.closest('[data-choice-key]'),p=e.target.closest('[data-preview]'),g=e.target.closest('[data-guide]'),tree=e.target.closest('[data-tree-index]'),thumb=e.target.closest('[data-preview-thumb]');
  if(d){const x=data.products[+d.dataset.choiceDownload],opts=x.downloadOptions||[];if(opts.length)openTree('Chọn bản tải',opts,'download');else if(x.downloadUrl&&x.downloadUrl!=='#'){bump('today-downloads','todayDownloads');window.open(x.downloadUrl,'_blank','noopener')}}
  if(k){const x=data.products[+k.dataset.choiceKey],opts=x.keyOptions||[];if(opts.length)openTree('Chọn cách lấy key',opts,'key');else if(x.keyUrl&&x.keyUrl!=='#'){bump('getkeys','totalGetKeys');window.open(x.keyUrl,'_blank','noopener')}}
  if(p)openPreview(data.products[+p.dataset.preview]);
  if(g)openGuide(data.products[+g.dataset.guide]);
  if(tree)chooseTreeIndex(+tree.dataset.treeIndex);
  if(e.target.closest('[data-choice-back]'))choiceBack();
  if(e.target.closest('[data-preview-prev]')){previewState.index=(previewState.index-1+previewState.images.length)%previewState.images.length;renderPreview()}
  if(e.target.closest('[data-preview-next]')){previewState.index=(previewState.index+1)%previewState.images.length;renderPreview()}
  if(thumb){previewState.index=+thumb.dataset.previewThumb;renderPreview()}
});
$('#bellBtn').onclick=openNotifications;$('#closeModal').onclick=()=>{resetModal();$('#modal').close()};$('#modal').addEventListener('close',()=>{document.body.classList.remove('modal-open');resetModal()});

const audio=$('#bgMusic'),musicBtn=$('#musicToggle');function updateMusicButton(){musicBtn.classList.toggle('playing',!audio.paused);musicBtn.classList.toggle('muted',audio.paused);musicBtn.textContent=audio.paused?'♪':'♫'}async function tryPlayMusic(){if(!data.musicUrl||data.musicAutoplay===false)return;try{await audio.play()}catch{document.addEventListener('pointerdown',()=>audio.play().catch(()=>{}),{once:true})}updateMusicButton()}function setupMusic(){audio.src=data.musicUrl||'';audio.volume=Math.max(0,Math.min(1,Number(data.musicVolume??.45)));if(audio.src&&data.musicAutoplay!==false)tryPlayMusic();else updateMusicButton()}musicBtn.onclick=async()=>{if(!audio.src)return;audio.paused?await audio.play().catch(()=>{}):audio.pause();updateMusicButton()};audio.onplay=updateMusicButton;audio.onpause=updateMusicButton;
function applyEffectToggles(){const e=data.effects||{};document.body.classList.toggle('no-avatar-glow',e.avatarGlow===false);document.body.classList.toggle('no-verified-shine',e.verifiedShine===false);document.body.classList.toggle('no-bg-motion',e.backgroundMotion===false);if(e.particles===false)$('#fxCanvas').style.display='none';else startParticles()}
let particlesStarted=false;function startParticles(){
  if(particlesStarted)return;
  const lowPower=(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory&&navigator.deviceMemory<=4);
  if(lowPower){const c=$('#fxCanvas');if(c)c.style.display='none';return}
  particlesStarted=true;
  const c=$('#fxCanvas'),x=c.getContext('2d',{alpha:true});let w=0,h=0,dpr=1,pts=[],last=0;
  function resize(){dpr=Math.min(devicePixelRatio||1,1.25);w=innerWidth;h=innerHeight;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.style.width=w+'px';c.style.height=h+'px';x.setTransform(dpr,0,0,dpr,0,0);const n=Math.max(10,Math.min(16,Math.round(w/30)));pts=Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*.8+.35,vy:Math.random()*.08+.025,a:Math.random()*.16+.05}))}
  function draw(t){requestAnimationFrame(draw);if(t-last<40)return;last=t;x.clearRect(0,0,w,h);x.shadowBlur=0;for(const p of pts){p.y-=p.vy;if(p.y<-4){p.y=h+4;p.x=Math.random()*w}x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.fillStyle=`rgba(118,132,220,${p.a})`;x.fill()}}
  addEventListener('resize',resize,{passive:true});resize();requestAnimationFrame(draw)
}

// V12 touch feedback + swipe preview
let previewTouchStartX=null;
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.main-action');if(!b)return;const r=b.getBoundingClientRect();b.style.setProperty('--tap-x',`${e.clientX-r.left}px`);b.style.setProperty('--tap-y',`${e.clientY-r.top}px`);b.classList.remove('tapfx');requestAnimationFrame(()=>b.classList.add('tapfx'));setTimeout(()=>b.classList.remove('tapfx'),360)});
document.addEventListener('touchstart',e=>{if(e.target.closest('.preview-stage'))previewTouchStartX=e.touches[0].clientX},{passive:true});
document.addEventListener('touchend',e=>{if(previewTouchStartX==null||!e.target.closest('.preview-stage'))return;const dx=e.changedTouches[0].clientX-previewTouchStartX;previewTouchStartX=null;if(Math.abs(dx)<38||previewState.images.length<2)return;previewState.index=(previewState.index+(dx<0?1:-1)+previewState.images.length)%previewState.images.length;renderPreview()},{passive:true});

getData().then(x=>{data=x;render();loadCounters();setInterval(applyAutoTheme,60000)}).catch(()=>{document.title='Lỗi tải dữ liệu';document.body.insertAdjacentHTML('beforeend','<p style="text-align:center;padding:30px">Không tải được dữ liệu website.</p>')}).finally(()=>document.body.classList.remove('is-loading'));
