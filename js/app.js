(function(){
'use strict';
var $ = function(s, el){ return (el||document).querySelector(s); };
var $$ = function(s, el){ return Array.prototype.slice.call((el||document).querySelectorAll(s)); };
var app = $('#app');
var KEY = 'tori-1526-1711-v1';
var S = {};
try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e) { S = {}; }
['quiz','wrong','cards','essay','read','misc'].forEach(function(k){ S[k] = S[k] || {}; });
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function strip(s){ return String(s).replace(/<[^>]+>/g,''); }
function shuffle(a){ a = a.slice(); for (var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function chById(id){ for (var i=0;i<CH.length;i++) if (CH[i].id===id) return CH[i]; return null; }
function srcById(id){ for (var i=0;i<SRC.length;i++) if (SRC[i].id===id) return SRC[i]; return null; }
function esById(id){ for (var i=0;i<ESSAYS.length;i++) if (ESSAYS[i].id===id) return ESSAYS[i]; return null; }

/* ---------- Kérdésbank ---------- */
var BANK = {};
CH.forEach(function(c){
  c.quiz.forEach(function(q,i){ q.id=c.id+'-'+i; q.ch=c.id; q.tag=c.n+'. fejezet'; BANK[q.id]=q; });
  c.asks = [];
  c.secs.forEach(function(s,si){ (s.ask||[]).forEach(function(a,ai){ var id=c.id+'-k'+si+'-'+ai; BANK[id]={id:id, ch:c.id, q:a[0], self:a[1], tag:'Tanári kérdés, '+c.n+'. fejezet'}; c.asks.push(id); }); });
});
SHEET.qs.forEach(function(q){ q.id='s'+q.n; q.tag='Összefoglaló lap, '+q.n+'. kérdés'; BANK[q.id]=q; });
SRC.forEach(function(s){ s.qids=[]; s.qs.forEach(function(a,i){ var id=s.id+'-'+i; BANK[id]={id:id, q:a[0], self:a[1], tag:s.code+' – '+s.title}; s.qids.push(id); }); });

/* ---------- Válaszellenőrzés ---------- */
var ROM = {i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10,xi:11,xii:12,xiii:13,xiv:14};
function norm(s){
  s = String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  s = s.split(' ').map(function(w){ return ROM[w]!==undefined ? String(ROM[w]) : w; }).join(' ');
  return s.replace(/^(a|az) /,'');
}
function lev(a,b){
  if (a===b) return 0; var m=a.length, n=b.length; if (!m) return n; if (!n) return m;
  var prev=[], cur=[], i, j; for (j=0;j<=n;j++) prev[j]=j;
  for (i=1;i<=m;i++){ cur=[i]; for (j=1;j<=n;j++){ cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1)); } prev=cur; }
  return prev[n];
}
function wordHas(h,n){ return (' '+h+' ').indexOf(' '+n)>=0; }
function fuzzyIn(u,a){
  var tol = a.length>=10 ? 2 : (a.length>=5 ? 1 : 0); if (!tol) return false;
  var uw=u.split(' '), k=a.split(' ').length;
  for (var i=0;i+k<=uw.length;i++){ var win=uw.slice(i,i+k).join(' '); if (lev(win,a)<=tol || lev(win.slice(0,a.length),a)<=tol && win.length>=a.length) return true; }
  return lev(u,a)<=tol;
}
function matchOne(user, alt){
  var u=norm(user), a=norm(alt); if (!u || !a) return false;
  if (u===a) return true;
  if (/^\d+$/.test(a) || a.length<3) return u.split(' ').indexOf(a)>=0;
  if (a.length>=3 && wordHas(u,a)) return true;
  return fuzzyIn(u,a);
}
function check(q, user){
  if (q.parts){
    var used=[], ok=0;
    q.parts.forEach(function(p){
      for (var i=0;i<p.length;i++){ var a=norm(p[i]); if (q.distinct && used.indexOf(a)>=0) continue;
        if (matchOne(user,p[i])){ ok++; used.push(a); return; } }
    });
    return ok===q.parts.length ? 'ok' : (ok>0 ? 'part' : 'bad');
  }
  for (var i=0;i<q.a.length;i++) if (matchOne(user,q.a[i])) return 'ok';
  return 'bad';
}
function answerText(q){
  if (q.self) return q.self;
  if (q.parts) return q.parts.map(function(p){ return p[0]; }).join(', ');
  return q.a[0];
}

/* ---------- Ikonok ---------- */
var IC = {
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
  scroll:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4h11a2 2 0 0 1 2 2v1h-4"/><path d="M16 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10"/><path d="M7 4a2 2 0 0 0-2 2v11"/><path d="M8 9h5M8 12h5"/></svg>',
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>'
};
function nav(active){
  var items=[['#/','Tananyag','book','home'],['#/gyakorlas','Gyakorlás','target','practice'],['#/forrasok','Források','scroll','sources'],['#/esszek','Esszék','pen','essays'],['#/terkep','Térkép','map','map']];
  $('#nav').innerHTML = items.map(function(it){ return '<a href="'+it[0]+'" class="'+(active===it[3]?'on':'')+'"'+(active===it[3]?' aria-current="page"':'')+'>'+IC[it[2]]+'<span>'+it[1]+'</span></a>'; }).join('');
}

/* ---------- Haladás ---------- */
function chProgress(c){
  var q=S.quiz[c.id]; var best = q ? q.best : 0;
  return Math.round((S.read[c.id] ? 40 : 0) + best*0.6);
}
function wrongIds(){ return Object.keys(S.wrong).filter(function(id){ return BANK[id] && S.wrong[id]>0; }); }

/* ---------- Kezdőlap ---------- */
function home(){
  nav('home');
  var ticks = TL.filter(function(t){ return t[0]>=1526 && t[0]<=1711; });
  var W=1000, x=function(y){ return (y-1526)/(1711-1526)*W; };
  var labels=[1541,1568,1606,1664,1686,1703];
  var axis = '<svg viewBox="-10 0 1020 54" role="img" aria-label="Időtengely 1526 és 1711 között a fontos évszámokkal" style="width:100%;height:auto;display:block">'+
    '<line x1="0" y1="20" x2="'+W+'" y2="20" stroke="currentColor" stroke-width="2"/>'+
    ticks.map(function(t){ return '<line x1="'+x(t[0])+'" y1="12" x2="'+x(t[0])+'" y2="28" stroke="currentColor" stroke-width="1.5" opacity=".55"><title>'+t[0]+': '+esc(strip(t[1]))+'</title></line>'; }).join('')+
    labels.map(function(y){ return '<text x="'+x(y)+'" y="48" text-anchor="middle" font-family="Alegreya, serif" font-size="22" fill="currentColor" opacity=".8">'+y+'</text>'; }).join('')+
  '</svg>';
  var segs = CH.map(function(c,i){ return '<a class="seg" href="#/fejezet/'+c.id+'" style="left:'+(i*20+.5)+'%;width:19%" aria-label="'+c.n+'. fejezet: '+esc(c.title)+', '+chProgress(c)+'%"><i class="fill" data-w="'+chProgress(c)+'"></i><span>'+c.n+'</span></a>'; }).join('');
  var wr = wrongIds().length;
  app.innerHTML =
  '<section class="hero wrap">'+
    '<h1>Magyarország története</h1>'+
    '<div class="years"><span>1526</span><span>1711</span></div>'+
    '<div style="color:var(--ink)">'+axis+'</div>'+
    '<div class="ribbon"><div class="axis"></div>'+segs+'</div>'+
    '<div class="ribbon-legend"><span>Mohácstól</span><span>a szatmári békéig</span></div>'+
  '</section>'+
  '<section class="wrap">'+
    '<h2>Ami a témazárón lesz</h2>'+
    '<div class="exam">'+
      '<a href="#/terkep"><b>A</b><span>Térkép: '+TOPO.rivers.length+' folyó, '+PLACES.length+' helyszín, 4 kvíz</span></a>'+
      '<a href="#/forrasok"><b>B</b><span>6 kötelező forrás jegyzettel és elemzéssel</span></a>'+
      '<a href="#/esszek"><b>C</b><span>8 esszétéma vázlattal és íróedzéssel</span></a>'+
    '</div>'+
    '<h2>Fejezetek</h2>'+
    '<ul class="rows">'+CH.map(function(c){ var q=S.quiz[c.id];
      return '<li><a class="row" href="#/fejezet/'+c.id+'"><span class="n">'+c.n+'</span><span class="t"><strong>'+esc(c.title)+'</strong><small>'+c.span+(S.read[c.id]?' · olvasva':'')+'</small><span class="bar"><i style="width:'+chProgress(c)+'%"></i></span></span><span class="meta">'+(q?'legjobb '+q.best+'%':c.quiz.length+' kérdés')+'</span></a></li>'; }).join('')+'</ul>'+
    '<h2>Gyakorlás</h2>'+
    '<div class="tools">'+
      '<a class="tool accent" href="#/kviz/vegyes"><strong>Vegyes kör</strong><small>20 kérdés minden fejezetből</small></a>'+
      '<a class="tool" href="#/lap"><strong>Összefoglaló lap</strong><small>A 47 kérdés kitöltése</small></a>'+
      '<a class="tool" href="#/kviz/hibak"><strong>Hibáim</strong><small>'+(wr?wr+' kérdés vár ismétlésre':'Még nincs hibád')+'</small></a>'+
      '<a class="tool" href="#/kartyak/fogalmak"><strong>Szókártyák</strong><small>Fogalmak, személyek, évszámok</small></a>'+
      '<a class="tool" href="#/idorend"><strong>Időrend</strong><small>Rakd sorba az eseményeket</small></a>'+
      '<a class="tool" href="#/idovonal"><strong>Idővonal</strong><small>Minden évszám egy helyen</small></a>'+
      '<a class="tool" href="#/fogalomtar"><strong>Fogalomtár</strong><small>Kereshető fogalmak és személyek</small></a>'+
      '<a class="tool" href="#/terkep/folyo"><strong>Folyókvíz</strong><small>Melyik folyó ez?</small></a>'+
    '</div>'+
    foot()+
  '</section>';
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ $$('.seg .fill').forEach(function(f){ f.style.width=f.getAttribute('data-w')+'%'; }); }); });
}
function foot(){ return '<footer>Tananyag: a 11.B tanári vázlatai (11B_01–05), a TK 10. kötelező forrásai és az október 19-i összefoglaló lap alapján. A haladásodat ez a böngésző tárolja. Ha valami eltér a tankönyvtől, a tankönyv és az órai jegyzet az irányadó.</footer>'; }

/* ---------- Fejezet ---------- */
function chapter(id){
  var c=chById(id); if (!c) return home();
  nav('home');
  var idx=CH.indexOf(c), prev=CH[idx-1], next=CH[idx+1];
  var events=TL.filter(function(t){ return t[2]===c.id; });
  var q=S.quiz[c.id];
  app.innerHTML='<article class="wrap">'+
    '<header class="chead"><div class="k"><span class="muted">'+c.n+'. fejezet</span><span class="big">'+c.span+'</span></div><h1>'+esc(c.title)+'</h1><div class="src">Tanári vázlat: '+esc(c.pdf)+'</div></header>'+
    '<p class="lead">'+c.lead+'</p>'+
    '<div class="btns"><a class="btn sm" href="#/kviz/'+c.id+'">Fejezetzáró kérdések</a><a class="btn sm ghost" href="#/kviz/'+c.id+'-k">Tanári kérdések ('+c.asks.length+')</a></div>'+
    c.secs.map(function(s){ return '<h2>'+s.h+'</h2><ul class="pts">'+s.p.map(function(p){ return '<li>'+p+'</li>'; }).join('')+'</ul>'+
      (s.ask||[]).map(function(a){ return '<details class="ask"><summary>'+a[0]+'</summary><div>'+a[1]+'</div></details>'; }).join(''); }).join('')+
    (events.length?'<h2>Évszámok</h2><ul class="mini-tl">'+events.map(function(t){ return '<li><b>'+t[0]+'</b><span>'+t[1]+'</span></li>'; }).join('')+'</ul>':'')+
    '<h2>Fogalmak</h2><dl class="gl">'+c.terms.map(function(t){ return '<dt>'+t[0]+'</dt><dd>'+t[1]+'</dd>'; }).join('')+'</dl>'+
    '<h2>Személyek</h2><dl class="gl">'+c.people.map(function(t){ return '<dt>'+t[0]+'</dt><dd>'+t[1]+'</dd>'; }).join('')+'</dl>'+
    '<div class="endbox"><h2>Fejezet vége: ellenőrizd magad</h2>'+
      '<p>'+c.quiz.length+' kérdés: begépelős és feleletválasztós, a tanári stílusban (1–5 szavas válaszok, évszámok).'+(q?' Legjobb eredményed: <b>'+q.best+'%</b>.':'')+'</p>'+
      '<div class="btns"><a class="btn" href="#/kviz/'+c.id+'">Kérdések indítása</a><a class="btn ghost" href="#/kviz/'+c.id+'-10">Gyors kör (10)</a></div>'+
      '<label class="check"><input type="checkbox" id="readbox"'+(S.read[c.id]?' checked':'')+'><span>Végigolvastam a fejezetet</span></label>'+
    '</div>'+
    '<nav class="pager">'+(prev?'<a class="btn ghost sm" href="#/fejezet/'+prev.id+'">'+prev.n+'. '+esc(prev.title)+'</a>':'<span></span>')+(next?'<a class="btn ghost sm" href="#/fejezet/'+next.id+'">'+next.n+'. '+esc(next.title)+'</a>':'<a class="btn ghost sm" href="#/esszek">Esszék</a>')+'</nav>'+
  '</article>';
  $('#readbox').addEventListener('change', function(e){ S.read[c.id]=e.target.checked; save(); });
}

/* ---------- Kvíz ---------- */
var Q = null;
function quizRoute(key){
  nav('practice');
  var ids=[], title='', back='#/gyakorlas', store=null, m;
  if ((m=key.match(/^(c\d)(-10)?$/))){ var c=chById(m[1]); if(!c) return home(); ids=c.quiz.map(function(q){ return q.id; }); if (m[2]) ids=shuffle(ids).slice(0,10); title=c.n+'. fejezet: '+c.title; back='#/fejezet/'+c.id; store=m[2]?null:c.id; nav('home'); }
  else if ((m=key.match(/^(c\d)-k$/))){ var c2=chById(m[1]); ids=c2.asks.slice(); title='Tanári kérdések – '+c2.n+'. fejezet'; back='#/fejezet/'+c2.id; nav('home'); }
  else if (key==='tanari'){ CH.forEach(function(c){ ids=ids.concat(c.asks); }); title='Minden tanári kérdés'; }
  else if (key==='lap'){ ids=SHEET.qs.map(function(q){ return q.id; }); title='Összefoglaló lap'; back='#/lap'; store='lap'; }
  else if (key==='vegyes'){ var all=[]; CH.forEach(function(c){ all=all.concat(c.quiz.map(function(q){ return q.id; })); }); all=all.concat(SHEET.qs.map(function(q){ return q.id; })); ids=shuffle(all).slice(0,20); title='Vegyes kör'; }
  else if (key==='hibak'){ ids=wrongIds(); title='Hibáim'; if(!ids.length){ app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Hibáim</h1><p class="lead">Nincs ismétlésre váró kérdés. Ha egy kvízben hibázol, a kérdés ide kerül, és addig marad, amíg kétszer jól nem válaszolsz rá.</p><a class="btn" href="#/kviz/vegyes">Vegyes kör indítása</a></section>'; return; } }
  else if (key==='forrasok'){ SRC.forEach(function(s){ ids=ids.concat(s.qids); }); title='Forráskérdések'; back='#/forrasok'; nav('sources'); }
  else if ((m=key.match(/^(b\d)$/))){ var s=srcById(m[1]); ids=s.qids.slice(); title=s.code+' – '+s.title; back='#/forras/'+s.id; nav('sources'); }
  else return home();
  startQuiz(title, ids, back, store, key);
}
function startQuiz(title, ids, back, store, key){
  Q={title:title, ids:(key==='lap'?ids.slice():shuffle(ids)), i:0, right:0, wrongs:[], back:back, store:store, key:key, done:false};
  renderQ();
}
function recordAnswer(id, ok){
  if (ok){ if (S.wrong[id]){ S.wrong[id]=Math.max(0,S.wrong[id]-1); if(!S.wrong[id]) delete S.wrong[id]; } }
  else S.wrong[id]=Math.min(2,(S.wrong[id]||0)+2);
  save();
}
function renderQ(){
  if (Q.i>=Q.ids.length) return quizResult();
  var q=BANK[Q.ids[Q.i]];
  var pct=Math.round(Q.i/Q.ids.length*100);
  var body='';
  if (q.self){
    body='<div class="btns"><button class="btn" id="reveal">Mutasd a választ</button></div><div class="fb" id="fb"></div>';
  } else if (q.o){
    body='<div class="opts">'+shuffle(q.o).map(function(o){ return '<button class="opt" data-v="'+esc(o)+'">'+esc(o)+'</button>'; }).join('')+'</div><div class="fb" id="fb" aria-live="polite"></div>';
  } else {
    body='<form class="ans" id="af" autocomplete="off"><label class="sr" for="ai">Válaszod</label><input id="ai" type="text" placeholder="Írd be a választ" autocapitalize="off" spellcheck="false"><button class="btn" type="submit">Ellenőrzés</button></form><div class="fb" id="fb" aria-live="polite"></div>';
  }
  app.innerHTML='<section class="wrap">'+
    '<div class="qtop"><a href="'+Q.back+'">Kilépés</a><span>'+esc(Q.title)+'</span><span class="num">'+(Q.i+1)+' / '+Q.ids.length+'</span></div>'+
    '<div class="qbar"><i style="width:'+pct+'%"></i></div>'+
    '<div class="qcard"><div class="tag">'+esc(q.tag||'')+'</div><div class="q">'+q.q+'</div>'+body+'</div>'+
  '</section>';
  var fb=$('#fb');
  function next(){ Q.i++; renderQ(); }
  function finish(ok, msg){
    recordAnswer(q.id, ok);
    if (ok) Q.right++; else Q.wrongs.push(q.id);
    fb.className='fb show '+(ok?'ok':'bad');
    fb.innerHTML=msg+'<div class="btns"><button class="btn" id="nx">'+(Q.i+1<Q.ids.length?'Tovább':'Eredmény')+'</button></div>';
    var nx=$('#nx'); nx.addEventListener('click', next); nx.focus();
  }
  if (q.self){
    $('#reveal').addEventListener('click', function(){
      this.parentNode.remove();
      fb.className='fb show'; fb.style.background='var(--panel)'; fb.style.borderLeft='4px solid var(--ochre)';
      fb.innerHTML='<strong>Válasz</strong>'+q.self+'<div class="btns"><button class="btn" id="yes">Tudtam</button><button class="btn ghost" id="no">Nem tudtam</button></div>';
      $('#yes').addEventListener('click', function(){ fb.style.cssText=''; finish(true,'<strong>Rendben</strong>'+q.self); });
      $('#no').addEventListener('click', function(){ fb.style.cssText=''; finish(false,'<strong>Ismételd át</strong>'+q.self); });
      $('#yes').focus();
    });
  } else if (q.o){
    $$('.opt').forEach(function(b){ b.addEventListener('click', function(){
      if (Q.locked) return; Q.locked=true;
      var v=b.getAttribute('data-v'), ok=(v===q.a[0]);
      $$('.opt').forEach(function(x){ x.disabled=true; if (x.getAttribute('data-v')===q.a[0]) x.classList.add('ok'); });
      if (!ok) b.classList.add('bad');
      finish(ok, ok?'<strong>Helyes.</strong>'+(q.x||''):'<strong>Nem ez.</strong>'+(q.x||'Helyes: '+q.a[0]));
      Q.locked=false;
    }); });
  } else {
    var inp=$('#ai'); inp.focus();
    $('#af').addEventListener('submit', function(e){
      e.preventDefault(); var v=inp.value.trim(); if (!v) { inp.focus(); return; }
      inp.disabled=true; this.querySelector('button').disabled=true;
      var r=check(q,v);
      if (r==='ok') return finish(true,'<strong>Helyes.</strong>'+(q.x||''));
      Q.wrongs.push(q.id); recordAnswer(q.id,false);
      fb.className='fb show bad';
      fb.innerHTML='<strong>'+(r==='part'?'Részben jó.':'Nem ez.')+'</strong>Helyes válasz: <b>'+esc(answerText(q))+'</b>'+(q.x&&norm(q.x)!==norm(answerText(q))?'<br>'+q.x:'')+
        '<div class="btns"><button class="btn" id="nx">'+(Q.i+1<Q.ids.length?'Tovább':'Eredmény')+'</button><button class="btn ghost sm" id="ov">Mégis jó volt</button></div>';
      $('#nx').addEventListener('click', next); $('#nx').focus();
      $('#ov').addEventListener('click', function(){ Q.wrongs.pop(); Q.right++; recordAnswer(q.id,true); recordAnswer(q.id,true); fb.className='fb show ok'; this.remove(); fb.querySelector('strong').textContent='Elfogadva.'; });
    });
  }
}
function quizResult(){
  var n=Q.ids.length, pct=n?Math.round(Q.right/n*100):0;
  if (Q.store){ var o=S.quiz[Q.store]||{best:0,runs:0}; o.best=Math.max(o.best,pct); o.last=pct; o.runs++; S.quiz[Q.store]=o; save(); }
  var verdict = pct>=90?'Ez már témazáró-szint.':pct>=70?'Jó alap, a hibásakat ismételd át.':pct>=50?'Félúton vagy. Olvasd újra a fejezetet, utána jöhet még egy kör.':'Kezdd a fejezet elolvasásával, utána próbáld újra.';
  var wr=Q.wrongs.filter(function(v,i,a){ return a.indexOf(v)===i; });
  app.innerHTML='<section class="wrap">'+
    '<div class="qtop"><a href="'+Q.back+'">Vissza</a><span>'+esc(Q.title)+'</span><span></span></div>'+
    '<div class="score">'+Q.right+'<span class="muted" style="font-size:.5em"> / '+n+'</span></div>'+
    '<p class="lead">'+pct+'% – '+verdict+'</p>'+
    '<div class="btns">'+(wr.length?'<button class="btn" id="rw">Hibásak újra ('+wr.length+')</button>':'')+'<button class="btn ghost" id="ag">Új kör</button><a class="btn ghost" href="'+Q.back+'">Vissza</a></div>'+
    (wr.length?'<h2>Ezeket nézd át</h2><ul class="wronglist">'+wr.map(function(id){ var q=BANK[id]; return '<li><div>'+q.q+'</div><div class="a">'+esc(strip(answerText(q)))+'</div>'+(q.x&&!q.self?'<div class="small muted">'+q.x+'</div>':'')+'</li>'; }).join('')+'</ul>':'')+
  '</section>';
  var cur=Q;
  if (wr.length) $('#rw').addEventListener('click', function(){ startQuiz(cur.title+' – hibásak', wr, cur.back, null, 'x'); });
  $('#ag').addEventListener('click', function(){ quizRoute(cur.key); });
}

/* ---------- Gyakorlás ---------- */
function practice(){
  nav('practice');
  var wr=wrongIds().length;
  app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Gyakorlás</h1>'+
    '<p class="lead">Kérdezz vissza magadtól: a rossz válaszok a Hibáim közé kerülnek, és addig maradnak, amíg kétszer jól nem felelsz rájuk.</p>'+
    '<div class="tools">'+
      '<a class="tool accent" href="#/kviz/vegyes"><strong>Vegyes kör</strong><small>20 véletlen kérdés</small></a>'+
      '<a class="tool" href="#/kviz/hibak"><strong>Hibáim</strong><small>'+(wr?wr+' kérdés':'üres')+'</small></a>'+
      '<a class="tool" href="#/lap"><strong>Összefoglaló lap</strong><small>47 kérdés'+(S.quiz.lap?', legjobb '+S.quiz.lap.best+'%':'')+'</small></a>'+
      '<a class="tool" href="#/kviz/tanari"><strong>Tanári kérdések</strong><small>A vázlatok kérdőjelei</small></a>'+
      '<a class="tool" href="#/kviz/forrasok"><strong>Forráskérdések</strong><small>Mind a 7 forrás</small></a>'+
      '<a class="tool" href="#/idorend"><strong>Időrend</strong><small>Sorba rendezés'+(S.misc.ordBest?', rekord: '+S.misc.ordBest:'')+'</small></a>'+
      '<a class="tool" href="#/terkep/kviz"><strong>Térképkvíz</strong><small>Hol van?</small></a>'+
      '<a class="tool" href="#/esszek"><strong>Esszéíró edzés</strong><small>Időre, ellenőrzőlistával</small></a>'+
    '</div>'+
    '<h2>Szókártyák</h2><div class="tools">'+
      '<a class="tool" href="#/kartyak/fogalmak"><strong>Fogalmak</strong><small>'+allTerms().length+' kártya</small></a>'+
      '<a class="tool" href="#/kartyak/szemelyek"><strong>Személyek</strong><small>'+allPeople().length+' kártya</small></a>'+
      '<a class="tool" href="#/kartyak/evszamok"><strong>Évszámok</strong><small>'+TL.length+' kártya</small></a>'+
      '<a class="tool" href="#/fogalomtar"><strong>Fogalomtár</strong><small>Kereső</small></a>'+
    '</div>'+
    '<h2>Fejezetzáró kérdések</h2><ul class="rows">'+CH.map(function(c){ var q=S.quiz[c.id];
      return '<li><a class="row" href="#/kviz/'+c.id+'"><span class="n">'+c.n+'</span><span class="t"><strong>'+esc(c.title)+'</strong><small>'+c.quiz.length+' kérdés</small></span><span class="meta">'+(q?q.best+'%':'–')+'</span></a></li>'; }).join('')+'</ul>'+
    '<div class="btns" style="margin-top:28px"><button class="btn ghost sm" id="reset">Haladás törlése</button></div>'+
    foot()+'</section>';
  $('#reset').addEventListener('click', function(){ if (confirm('Biztosan törlöd az összes eredményt, hibalistát és esszévázlatot?')){ S={quiz:{},wrong:{},cards:{},essay:{},read:{},misc:{}}; save(); practice(); } });
}

/* ---------- Összefoglaló lap ---------- */
function sheetPage(){
  nav('practice');
  var q=S.quiz.lap;
  app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Összefoglaló lap</h1>'+
    '<p class="lead">A 2026. október 19-i gyakorlólap 47 kérdése, sorrendben. Begépeled a választ, a rendszer ellenőrzi, és megmutatja a magyarázatot.</p>'+
    (q?'<p>Legjobb eredményed: <b>'+q.best+'%</b>.</p>':'')+
    '<div class="btns"><a class="btn" href="#/kviz/lap">Kitöltöm</a><button class="btn ghost" id="tg">Megoldókulcs mutatása</button></div>'+
    '<div class="note">A 35–37. kérdés képe (szarkofágok egy kriptában) a lapon homályos. A megoldókulcs a legvalószínűbb választ adja, ezt az órán érdemes ellenőrizni.</div>'+
    '<ol class="pts hidden" id="key" style="padding-left:1.6rem">'+SHEET.qs.map(function(x){ return '<li><div>'+x.q+'</div><div><b style="color:var(--green)">'+esc(answerText(x))+'</b>'+(x.x?' – <span class="muted">'+x.x+'</span>':'')+'</div></li>'; }).join('')+'</ol>'+
  '</section>';
  $('#tg').addEventListener('click', function(){ var k=$('#key'); k.classList.toggle('hidden'); this.textContent=k.classList.contains('hidden')?'Megoldókulcs mutatása':'Megoldókulcs elrejtése'; });
}

/* ---------- Források ---------- */
function sources(){
  nav('sources');
  app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Kötelező források</h1>'+
    '<p class="lead">Mindegyiknél: hol és mikor keletkezett, ki írta, mi áll benne, és mit jelent. A dolgozatban egy forrás az esszé része lesz.</p>'+
    '<ul class="rows">'+SRC.map(function(s){ return '<li><a class="row" href="#/forras/'+s.id+'"><span class="n">'+s.code+'</span><span class="t"><strong>'+esc(s.title)+'</strong><small>'+esc(s.tk)+', '+esc(s.when)+'</small></span></a></li>'; }).join('')+'</ul>'+
    '<div class="btns"><a class="btn" href="#/kviz/forrasok">Minden forráskérdés</a></div>'+foot()+'</section>';
}
function source(id){
  var s=srcById(id); if (!s) return sources();
  nav('sources');
  var es=ESSAYS.filter(function(e){ return s.essays.indexOf(e.id)>=0; });
  app.innerHTML='<article class="wrap"><header class="chead"><div class="k"><span class="muted">'+(s.code==='+'?'Kapcsolódó forrás':'Kötelező forrás '+s.code)+'</span><span class="big">'+esc(s.tk)+'</span></div><h1>'+esc(s.title)+'</h1></header>'+
    '<div class="srcmeta"><b>Mikor</b><span>'+esc(s.when)+'</span><b>Hol</b><span>'+esc(s.where)+'</span><b>Ki</b><span>'+esc(s.who)+'</span></div>'+
    (s.text?'<blockquote class="st">'+s.text+'<div class="small muted" style="margin-top:8px;font-family:var(--sans)">'+esc(s.textNote)+'</div></blockquote>':'<div class="note">'+esc(s.textNote)+'</div>')+
    '<h2>Jegyzet: mi áll benne</h2><ul class="pts">'+s.notes.map(function(n){ return '<li>'+n+'</li>'; }).join('')+'</ul>'+
    '<h2>Elemzés</h2><ul class="pts">'+s.analysis.map(function(n){ return '<li>'+n+'</li>'; }).join('')+'</ul>'+
    (es.length?'<h2>Melyik esszében használd</h2><ul class="pts">'+es.map(function(e){ return '<li><a href="#/esszek/'+e.id+'">'+e.n+'. '+esc(e.title)+'</a></li>'; }).join('')+'</ul>':'')+
    '<div class="endbox"><h2>Kérdezd vissza magad</h2><p>'+s.qs.length+' rövid kérdés erről a forrásról.</p><div class="btns"><a class="btn" href="#/kviz/'+s.id+'">Indítás</a></div></div>'+
    '<nav class="pager"><a class="btn ghost sm" href="#/forrasok">Minden forrás</a></nav></article>';
}

/* ---------- Esszék ---------- */
function essays(){
  nav('essays');
  app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Esszétémák</h1>'+
    '<p class="lead">A dolgozatban: cím + 1 forrás + 1 kép. Mindegyik témánál van vázlat, kulcsszólista és íróedzés időre.</p>'+
    '<div class="note"><b>Felépítés minden esszénél:</b> bevezetés (tér és idő, előzmény) – tárgyalás (okok, események, szereplők, fogalmak, a forrás és a kép beépítése) – összegzés (következmények, értékelés).</div>'+
    '<ul class="rows">'+ESSAYS.map(function(e){ var d=S.essay[e.id]; return '<li><a class="row" href="#/esszek/'+e.id+'"><span class="n">'+e.n+'</span><span class="t"><strong>'+esc(e.title)+'</strong><small>'+(d&&d.text?'Van mentett vázlatod':'Vázlat és íróedzés')+'</small></span></a></li>'; }).join('')+'</ul>'+foot()+'</section>';
}
function essay(id){
  var e=esById(id); if (!e) return essays();
  nav('essays');
  app.innerHTML='<article class="wrap"><header class="chead"><div class="k"><span class="muted">'+e.n+'. esszétéma</span></div><h1>'+esc(e.title)+'</h1></header>'+
    '<p class="lead">'+e.lead+'</p>'+
    '<div class="btns"><a class="btn" href="#/iras/'+e.id+'">Íróedzés indítása</a><button class="btn ghost" id="hide">Teszt mód: pontok elrejtése</button></div>'+
    '<h2>Tér és idő</h2><p>'+e.terido+'</p>'+
    '<h2>Bevezetés</h2><p>'+e.intro+'</p>'+
    '<h2>Tárgyalás</h2><div class="outline" id="ol">'+e.parts.map(function(p){ return '<div class="part"><h3>'+p.h+'</h3><ul class="pts">'+p.pts.map(function(x){ return '<li>'+x+'</li>'; }).join('')+'</ul></div>'; }).join('')+'</div>'+
    '<h2>Összegzés</h2><p>'+e.concl+'</p>'+
    '<h2>Kötelező elemek</h2>'+
    '<h3>Fogalmak</h3><div class="chips">'+e.terms.map(function(t){ return '<span class="chip">'+esc(t)+'</span>'; }).join('')+'</div>'+
    '<h3>Személyek</h3><div class="chips">'+e.people.map(function(t){ return '<span class="chip">'+esc(t)+'</span>'; }).join('')+'</div>'+
    '<h3>Évszámok</h3><div class="chips">'+e.years.map(function(t){ return '<span class="chip num">'+esc(t)+'</span>'; }).join('')+'</div>'+
    '<h2>Forrás és kép</h2><ul class="pts">'+e.src.map(function(sid){ var s=srcById(sid); return '<li>Forrás: <a href="#/forras/'+s.id+'">'+s.code+' – '+esc(s.title)+'</a></li>'; }).join('')+
      e.img.map(function(im){ return '<li>Kép: '+esc(im[0])+' (<a href="https://commons.wikimedia.org/w/index.php?search='+encodeURIComponent(im[1])+'" target="_blank" rel="noopener">keresés a Wikimedia Commonson</a>)</li>'; }).join('')+'</ul>'+
    '<nav class="pager">'+(e.n>1?'<a class="btn ghost sm" href="#/esszek/e'+(e.n-1)+'">Előző téma</a>':'<a class="btn ghost sm" href="#/esszek">Témák</a>')+(e.n<ESSAYS.length?'<a class="btn ghost sm" href="#/esszek/e'+(e.n+1)+'">Következő téma</a>':'')+'</nav></article>';
  $('#hide').addEventListener('click', function(){ var o=$('#ol'); o.classList.toggle('hide'); this.textContent=o.classList.contains('hide')?'Pontok mutatása':'Teszt mód: pontok elrejtése'; });
  $$('#ol .part').forEach(function(p){ p.addEventListener('click', function(){ if ($('#ol').classList.contains('hide')) p.classList.toggle('open'); }); });
}
var timerInt=null;
function write(id){
  var e=esById(id); if (!e) return essays();
  nav('essays');
  var d=S.essay[id]||{}; S.essay[id]=d;
  if (!d.task){ newTask(); }
  function newTask(){
    var sid=e.src[Math.floor(Math.random()*e.src.length)], im=e.img[Math.floor(Math.random()*e.img.length)];
    d.task={src:sid, img:im}; save();
  }
  function render(){
    var s=srcById(d.task.src), im=d.task.img;
    app.innerHTML='<section class="wrap"><div class="qtop"><a href="#/esszek/'+e.id+'">Vissza a vázlathoz</a><span>Íróedzés</span><span></span></div>'+
      '<div class="task"><div class="h">'+esc(e.title)+'</div><ol>'+
        '<li>Forrás: <a href="#/forras/'+s.id+'">'+s.code+' – '+esc(s.title)+'</a> ('+esc(s.tk)+')</li>'+
        '<li>Kép: '+esc(im[0])+' (<a href="https://commons.wikimedia.org/w/index.php?search='+encodeURIComponent(im[1])+'" target="_blank" rel="noopener">megnyitás</a>)</li></ol>'+
        '<div class="btns"><button class="btn ghost sm" id="nt">Másik forrás és kép</button></div></div>'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div class="timer" id="tm">'+fmt(d.left!=null?d.left:1500)+'</div>'+
        '<div class="seg-ctl" id="pre"><button data-m="15">15 perc</button><button data-m="25" class="on">25 perc</button><button data-m="40">40 perc</button></div>'+
        '<button class="btn sm" id="go">Indítás</button></div>'+
      '<label class="sr" for="tx">Esszé szövege</label><textarea class="essay" id="tx" placeholder="Bevezetés: hol és mikor vagyunk, mi az előzmény?">'+esc(d.text||'')+'</textarea>'+
      '<p class="small muted" id="wc"></p>'+
      '<h2>Kulcselemek a szövegedben</h2><p class="small muted">Írás közben zöldre váltanak, amit már beleírtál.</p><div class="chips" id="kw"></div>'+
      '<div class="btns"><button class="btn" id="fin">Kész, jöhet az értékelés</button></div>'+
      '<div id="rv"></div></section>';
    var tx=$('#tx');
    function upd(){ var t=tx.value, n=norm(t);
      $('#wc').textContent=(t.trim()?t.trim().split(/\s+/).length:0)+' szó';
      $('#kw').innerHTML=e.kw.map(function(k){ var hit=k[1].some(function(p){ return wordHas(n,norm(p)); }); return '<span class="chip'+(hit?' ok':'')+'">'+esc(k[0])+'</span>'; }).join('');
    }
    var deb; tx.addEventListener('input', function(){ d.text=tx.value; clearTimeout(deb); deb=setTimeout(function(){ save(); upd(); },300); });
    upd();
    $('#nt').addEventListener('click', function(){ newTask(); render(); });
    var mins=25;
    $$('#pre button').forEach(function(b){ b.addEventListener('click', function(){ $$('#pre button').forEach(function(x){ x.classList.remove('on'); }); b.classList.add('on'); mins=+b.getAttribute('data-m'); d.left=mins*60; $('#tm').textContent=fmt(d.left); stop(); }); });
    function stop(){ clearInterval(timerInt); timerInt=null; var g=$('#go'); if (g) g.textContent='Indítás'; }
    $('#go').addEventListener('click', function(){
      if (timerInt){ stop(); save(); return; }
      if (d.left==null || d.left<=0) d.left=mins*60;
      this.textContent='Szünet';
      timerInt=setInterval(function(){ d.left--; var tm=$('#tm'); if (!tm){ clearInterval(timerInt); timerInt=null; return; } tm.textContent=fmt(Math.max(0,d.left)); if (d.left<=0){ stop(); tm.textContent='Lejárt'; save(); } },1000);
    });
    $('#fin').addEventListener('click', function(){ stop(); save(); review(); });
  }
  function review(){
    var n=norm(d.text||''); var hits=e.kw.filter(function(k){ return k[1].some(function(p){ return wordHas(n,norm(p)); }); }).length;
    var checks=['Megadtam a teret és az időt (hol, mikor, előzmény).','A tárgyalás okokat és következményeket is bemutat, nem csak eseményeket sorol.','Szerepel legalább 5 fogalom pontosan használva.','Szerepelnek a fő szereplők és évszámok.','Beépítettem a forrást: hivatkoztam rá, és megmondtam, mit bizonyít.','Felhasználtam a képet (mit ábrázol, mihez kapcsolódik).','Van bevezetés, tárgyalás és összegzés, a bekezdések logikusan követik egymást.'];
    $('#rv').innerHTML='<h2>Értékelés</h2><p>A kulcselemek közül <b>'+hits+' / '+e.kw.length+'</b> szerepel a szövegedben.</p>'+
      '<div>'+checks.map(function(c,i){ return '<label class="check"><input type="checkbox"><span>'+c+'</span></label>'; }).join('')+'</div>'+
      '<h3>Mintavázlat összevetéshez</h3><div class="outline">'+e.parts.map(function(p){ return '<div class="part"><h3>'+p.h+'</h3><ul class="pts">'+p.pts.map(function(x){ return '<li>'+x+'</li>'; }).join('')+'</ul></div>'; }).join('')+'</div>'+
      '<p><b>Összegzés:</b> '+e.concl+'</p>'+
      '<div class="btns"><button class="btn ghost" id="clr">Új esszé (szöveg törlése)</button></div>';
    $('#clr').addEventListener('click', function(){ if (confirm('Törlöd a szöveget és új feladatot kérsz?')){ d.text=''; d.left=null; newTask(); render(); } });
    $('#rv').scrollIntoView({behavior:'smooth'});
  }
  render();
}
function fmt(s){ s=Math.max(0,s|0); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }

/* ---------- Térkép: a js/map.js modulban ---------- */
var mapPage = MAPMOD({$:$, $$:$$, esc:esc, shuffle:shuffle, chById:chById, nav:nav, save:save, app:app, S:function(){ return S; }});

/* ---------- Idővonal ---------- */
function timeline(){
  nav('practice');
  var f=null;
  function render(){
    app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Idővonal</h1>'+
      '<div class="seg-ctl" id="flt"><button data-f="" class="'+(!f?'on':'')+'">Mind</button>'+CH.map(function(c){ return '<button data-f="'+c.id+'" class="'+(f===c.id?'on':'')+'">'+c.n+'. fejezet</button>'; }).join('')+'</div>'+
      '<ul class="tl">'+TL.filter(function(t){ return !f||t[2]===f; }).map(function(t){ return '<li><b>'+t[0]+'</b><span><a href="#/fejezet/'+t[2]+'">'+t[1]+'</a></span></li>'; }).join('')+'</ul>'+
      '<div class="btns"><a class="btn" href="#/idorend">Időrend-játék</a><a class="btn ghost" href="#/kartyak/evszamok">Évszám-kártyák</a></div></section>';
    $$('#flt button').forEach(function(b){ b.addEventListener('click', function(){ f=b.getAttribute('data-f')||null; render(); }); });
  }
  render();
}
function orderGame(){
  nav('practice');
  var pool=TL.filter(function(t){ return t[0]>=1517 && t[0]<=1735; });
  var pick=[], used={};
  shuffle(pool).forEach(function(t){ if (pick.length<5 && !used[t[0]]){ used[t[0]]=1; pick.push(t); } });
  var shown=shuffle(pick), chosen=[];
  S.misc.ordStreak=S.misc.ordStreak||0;
  app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Időrend</h1><p class="lead">Koppints az eseményekre időrendben, a legkorábbival kezdve.</p>'+
    '<p class="small muted">Sorozat: '+S.misc.ordStreak+(S.misc.ordBest?', rekord: '+S.misc.ordBest:'')+'</p>'+
    '<div class="ord" id="ord">'+shown.map(function(t,i){ return '<button data-i="'+i+'"><span class="slot"></span><span>'+t[1]+'</span></button>'; }).join('')+'</div><div id="res" aria-live="polite"></div></section>';
  $$('#ord button').forEach(function(b){ b.addEventListener('click', function(){
    var i=+b.getAttribute('data-i'); if (chosen.indexOf(i)>=0 || chosen.length>=5) return;
    chosen.push(i); b.classList.add('picked'); b.querySelector('.slot').textContent=chosen.length;
    if (chosen.length===5){
      var sorted=pick.slice().sort(function(a,b){ return a[0]-b[0]; }); var good=0;
      chosen.forEach(function(ci,pos){ var t=shown[ci], ok=(t[0]===sorted[pos][0]); if(ok) good++; var el=$('#ord button[data-i="'+ci+'"]'); el.classList.add(ok?'ok':'bad'); el.querySelector('.slot').textContent=t[0]; });
      if (good===5){ S.misc.ordStreak++; S.misc.ordBest=Math.max(S.misc.ordBest||0,S.misc.ordStreak); } else S.misc.ordStreak=0; save();
      $('#res').innerHTML='<p class="lead">'+(good===5?'Hibátlan.':good+' / 5 a helyén.')+'</p><h3>A helyes sorrend</h3><ul class="mini-tl">'+sorted.map(function(t){ return '<li><b>'+t[0]+'</b><span>'+t[1]+'</span></li>'; }).join('')+'</ul><div class="btns"><button class="btn" id="ng">Új kör</button></div>';
      $('#ng').addEventListener('click', orderGame); $('#ng').focus();
    }
  }); });
}

/* ---------- Szókártyák ---------- */
function allTerms(){ var r=[]; CH.forEach(function(c){ c.terms.forEach(function(t){ r.push({k:'t|'+t[0], f:t[0], b:t[1], c:c}); }); }); return r; }
function allPeople(){ var r=[]; CH.forEach(function(c){ c.people.forEach(function(t){ r.push({k:'p|'+t[0], f:t[0], b:t[1], c:c}); }); }); return r; }
function allYears(rev){ return TL.map(function(t){ var c=chById(t[2]); return rev?{k:'y|'+t[0]+t[1], f:String(t[0]), b:t[1], c:c, big:true}:{k:'y|'+t[0]+t[1], f:t[1], b:String(t[0]), c:c, bigBack:true}; }); }
function cards(deck){
  nav('practice');
  var rev=false;
  function list(){ return deck==='szemelyek'?allPeople():deck==='evszamok'?allYears(rev):allTerms(); }
  function pickCard(L){
    var w=[]; L.forEach(function(x){ var bx=S.cards[x.k]||1; var n=bx===1?4:bx===2?2:1; for(var i=0;i<n;i++) w.push(x); });
    return w[Math.floor(Math.random()*w.length)];
  }
  var cur=null, last=null;
  function render(){
    var L=list(); var known=L.filter(function(x){ return (S.cards[x.k]||1)>=3; }).length;
    do { cur=pickCard(L); } while (L.length>1 && last && cur.k===last.k);
    last=cur;
    app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Szókártyák</h1>'+
      '<div class="seg-ctl"><a class="'+(deck==='fogalmak'?'on':'')+'" href="#/kartyak/fogalmak">Fogalmak</a><a class="'+(deck==='szemelyek'?'on':'')+'" href="#/kartyak/szemelyek">Személyek</a><a class="'+(deck==='evszamok'?'on':'')+'" href="#/kartyak/evszamok">Évszámok</a></div>'+
      (deck==='evszamok'?'<div class="seg-ctl"><button id="rv" class="'+(rev?'on':'')+'">Évszámból esemény</button></div>':'')+
      '<p class="small muted">Biztosan tudod: '+known+' / '+L.length+'. Amit nem tudsz, gyakrabban jön elő.</p>'+
      '<div class="card" id="cd" tabindex="0" role="button" aria-label="Kártya megfordítása"><div class="in"><div class="face"><div class="small muted">'+cur.c.n+'. fejezet</div><div class="big'+(cur.big?' num':'')+'" style="'+(cur.big?'font-size:3rem':'')+'">'+cur.f+'</div><div class="small muted" style="margin-top:10px">Koppints a megfordításhoz</div></div><div class="face back"><div class="big'+(cur.bigBack?' num':'')+'" style="'+(cur.bigBack?'font-size:3rem':'font-size:1.25rem')+'">'+cur.b+'</div></div></div></div>'+
      '<div class="btns" id="kb" style="visibility:hidden"><button class="btn" id="yes">Tudtam</button><button class="btn ghost" id="no">Nem tudtam</button></div></section>';
    var cd=$('#cd'); var flip=function(){ cd.classList.toggle('flip'); $('#kb').style.visibility='visible'; };
    cd.addEventListener('click', flip); cd.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); flip(); } });
    $('#yes').addEventListener('click', function(){ S.cards[cur.k]=Math.min(3,(S.cards[cur.k]||1)+1); save(); render(); });
    $('#no').addEventListener('click', function(){ S.cards[cur.k]=1; save(); render(); });
    var rvb=$('#rv'); if (rvb) rvb.addEventListener('click', function(){ rev=!rev; render(); });
  }
  render();
}

/* ---------- Fogalomtár ---------- */
function glossary(){
  nav('practice');
  var items=[]; CH.forEach(function(c){ c.terms.forEach(function(t){ items.push([t[0],t[1],c,'fogalom']); }); c.people.forEach(function(t){ items.push([t[0],t[1],c,'személy']); }); });
  items.sort(function(a,b){ return a[0].localeCompare(b[0],'hu'); });
  app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Fogalomtár</h1>'+
    '<label class="sr" for="sq">Keresés</label><input class="search" id="sq" type="search" placeholder="Keresés: pl. Partium, Pázmány, rendi">'+
    '<p class="small muted" id="cnt"></p><dl class="gl" id="gl"></dl></section>';
  function draw(){ var n=norm($('#sq').value); var L=items.filter(function(it){ return !n || norm(it[0]+' '+it[1]).indexOf(n)>=0; });
    $('#cnt').textContent=L.length+' találat';
    $('#gl').innerHTML=L.map(function(it){ return '<dt>'+esc(it[0])+'<span class="pill">'+it[2].n+'. f.</span></dt><dd>'+it[1]+' <span class="small">('+it[3]+')</span></dd>'; }).join(''); }
  $('#sq').addEventListener('input', draw); draw();
}

/* ---------- Útvonalak ---------- */
function route(){
  if (timerInt){ clearInterval(timerInt); timerInt=null; }
  document.body.classList.remove('mapfs');
  var h=location.hash.replace(/^#\/?/,''), p=h.split('/');
  window.scrollTo(0,0);
  switch(p[0]){
    case '': home(); break;
    case 'fejezet': chapter(p[1]); break;
    case 'kviz': quizRoute(p[1]||''); break;
    case 'gyakorlas': practice(); break;
    case 'lap': sheetPage(); break;
    case 'forrasok': sources(); break;
    case 'forras': source(p[1]); break;
    case 'esszek': p[1]?essay(p[1]):essays(); break;
    case 'iras': write(p[1]); break;
    case 'terkep': mapPage(p[1]); break;
    case 'idovonal': timeline(); break;
    case 'idorend': orderGame(); break;
    case 'kartyak': cards(p[1]||'fogalmak'); break;
    case 'fogalomtar': glossary(); break;
    default: home();
  }
  var h1=$('h1', app); if (h1){ h1.setAttribute('tabindex','-1'); }
}
window.addEventListener('hashchange', route);
route();
})();
