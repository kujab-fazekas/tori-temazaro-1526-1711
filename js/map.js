/* Térkép modul: a tanári vaktérkép (11B_00) folyói, tavai, helyei és a térképkvízek.
   Az app.js hívja meg: var mapPage = MAPMOD({...segédfüggvények}). */
function MAPMOD(H){
'use strict';
var $=H.$, $$=H.$$, esc=H.esc, shuffle=H.shuffle, chById=H.chById, nav=H.nav, save=H.save, app=H.app;

/* ---------- Térkép (a tanári vaktérkép folyóival) ---------- */
var CATS=[['all','Mind'],['vilajet','Vilájetközpontok'],['vegvar','Végvárak'],['tarnoki','Tárnoki városok'],['koztort','Köztörténet'],['puspok','Püspöki székhelyek'],['egyeb','Tananyagból']];
var TOPOLIST=[
 ['Vilájetközpontok','vilajet',[['Buda','1541, 1686'],['Temesvár','1552'],['Eger','1596'],['Kanizsa','1600'],['Várad','1660'],['Érsekújvár','1663']]],
 ['Végvárak','vegvar',[['Kőszeg','1532'],['Temesvár','1552'],['Drégely','1552'],['Szolnok','1552'],['Eger','1552, 1596'],['Gyula','1566'],['Szigetvár','1566']]],
 ['Tárnoki városok','tarnoki',[['Buda','török kézen'],['Pest','török kézen'],['Sopron',''],['Pozsony',''],['Nagyszombat',''],['Kassa',''],['Eperjes',''],['Bártfa','']]],
 ['Köztörténet','koztort',[['Mohács','1526'],['@erdely','a földrajzi Erdély területe'],['Kolozsvár',''],['Gyulafehérvár',''],['Besztercebánya',''],['Debrecen',''],['Vizsoly','1590'],['@hajdu','Hajdúság'],['Eszék','1664'],['Szentgotthárd','1664'],['Vasvár','1664'],['Sárospatak',''],['Karlóca','1699'],['@banat','Bánság / Temesköz'],['Szécsény','1705'],['Ónod','1707'],['Szatmár','a mai Szatmárnémeti Szamostól D-re eső része'],['Nagymajtény','1711'],['Bécs','']]],
 ['Püspöki székhelyek','puspok',[['Nagyszombat','esztergomi érsek'],['Győr',''],['Nyitra','']]]
];
var LAYERS=[['names','Helynevek'],['rnames','Folyónevek'],['erdely','Erdély'],['partium','Partium (1621)'],['hajdu','Hajdúság'],['banat','Bánság'],['harmas','Hármas tagolódás (1570 k.)']];
var REGKEY={erdely:'Erdély',partium:'Partium',hajdu:'Hajdúság',banat:'Bánság'};
var REGNAME={erdely:'Erdély (földrajzi)',partium:'Partium (1621): Szabolcs, Szatmár, Bereg, Borsod, Abaúj, Zemplén, Ugocsa vármegye',hajdu:'Hajdúság',banat:'Bánság (Temesköz): a Maros, a Tisza és a Duna között'};
var RPTS=null;
function riverPts(){
  if (RPTS) return RPTS;
  var parse=function(s){ return s.split(' ').map(function(t){ var a=t.split(','); return [+a[0],+a[1]]; }); };
  RPTS=TOPO.rivers.map(function(r){ return {n:r.n, pts:parse(r.p)}; });
  TOPO.extra.forEach(function(e){ var r=RPTS.filter(function(x){ return x.n===e.n; })[0]; if (r) r.more=(r.more||[]).concat([parse(e.p)]); });
  return RPTS;
}
function segDist(p,a,b){ var dx=b[0]-a[0], dy=b[1]-a[1], L=dx*dx+dy*dy, t=L?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L)):0; var x=a[0]+t*dx-p[0], y=a[1]+t*dy-p[1]; return Math.sqrt(x*x+y*y); }
function polyDist(p,pts){ var m=1e9; for (var i=1;i<pts.length;i++){ var d=segDist(p,pts[i-1],pts[i]); if (d<m) m=d; } return m; }
function nearestRiver(p){
  var best=null, bd=1e9;
  riverPts().forEach(function(r,i){ var d=polyDist(p,r.pts); (r.more||[]).forEach(function(m){ d=Math.min(d,polyDist(p,m)); }); if (d<bd){ bd=d; best=i; } });
  TOPO.lakes.forEach(function(l,j){ var c=l.c, d=Math.hypot(p[0]-c[0],p[1]-c[1])-12; if (d<bd){ bd=Math.max(d,0); best='L'+j; } });
  return {i:best, d:bd};
}
function placeByName(n){ for (var i=0;i<PLACES.length;i++) if (PLACES[i].n===n) return i; return -1; }
function catLabel(c){ for (var i=0;i<CATS.length;i++) if (CATS[i][0]===c) return CATS[i][1]; return c; }
/* címkék elhelyezése: szövegszélesség, folyómenti mintapontok, vonal-ütközésvizsgálat */
var TW=null;
function textW(){
  if (TW) return TW;
  var c=document.createElement('canvas').getContext('2d'); TW={ctx:c};
  c.font='500 12.5px "Alegreya Sans", sans-serif'; TW.pl=PLACES.map(function(p){ return c.measureText(p.n).width*1.04; });
  c.font='italic 400 12px Alegreya, serif'; TW.rv=TOPO.rivers.map(function(r){ return c.measureText(r.n).width*1.04; }); TW.lk=TOPO.lakes.map(function(l){ return c.measureText(l.n).width*1.04; });
  return TW;
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ TW=null; if (window.__mapRelayout) window.__mapRelayout(); });
var RSAMP=null;
function riverSamples(){
  if (RSAMP) return RSAMP;
  RSAMP=riverPts().map(function(r){
    var P=r.pts, cum=[0]; for (var i=1;i<P.length;i++) cum.push(cum[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
    var L=cum[cum.length-1];
    function at(s){ s=Math.max(0,Math.min(L,s)); var lo=1, hi=cum.length-1; while (lo<hi){ var mid=(lo+hi)>>1; if (cum[mid]<s) lo=mid+1; else hi=mid; }
      var j=lo, u=(s-cum[j-1])/Math.max(cum[j]-cum[j-1],1e-9); return [P[j-1][0]+u*(P[j][0]-P[j-1][0]), P[j-1][1]+u*(P[j][1]-P[j-1][1])]; }
    var S=[], step=Math.max(6,Math.min(16,L/14));
    for (var s=step/2; s<L; s+=step){ var p=at(s), a=at(s-14), b=at(s+14), dx=b[0]-a[0], dy=b[1]-a[1], n=Math.hypot(dx,dy)||1; S.push({s:s, f:s/L, x:p[0], y:p[1], nx:-dy/n, ny:dx/n}); }
    return {L:L, at:at, S:S};
  });
  return RSAMP;
}
var SEGG=null;
function segGrid(){
  if (SEGG) return SEGG;
  var C=40, g={};
  function add(a,b){ var x0=Math.floor(Math.min(a[0],b[0])/C), x1=Math.floor(Math.max(a[0],b[0])/C), y0=Math.floor(Math.min(a[1],b[1])/C), y1=Math.floor(Math.max(a[1],b[1])/C);
    for (var x=x0;x<=x1;x++) for (var y=y0;y<=y1;y++){ var k=x+','+y; (g[k]||(g[k]=[])).push([a,b]); } }
  function line(P,closed){ for (var i=1;i<P.length;i++) add(P[i-1],P[i]); if (closed) add(P[P.length-1],P[0]); }
  riverPts().forEach(function(r){ line(r.pts); (r.more||[]).forEach(function(m){ line(m); }); });
  TOPO.lakes.forEach(function(l){ line(l.p.split(' ').map(function(t){ var a=t.split(','); return [+a[0],+a[1]]; }), true); });
  SEGG={C:C,g:g}; return SEGG;
}
function segRect(a,b,x0,y0,x1,y1){
  var dx=b[0]-a[0], dy=b[1]-a[1], t0=0, t1=1, p=[-dx,dx,-dy,dy], q=[a[0]-x0,x1-a[0],a[1]-y0,y1-a[1]];
  for (var i=0;i<4;i++){ if (p[i]===0){ if (q[i]<0) return false; } else { var r=q[i]/p[i]; if (p[i]<0){ if (r>t1) return false; if (r>t0) t0=r; } else { if (r<t0) return false; if (r<t1) t1=r; } } }
  return true;
}
function rectHitsLine(x0,y0,x1,y1){
  var G=segGrid(), C=G.C;
  for (var x=Math.floor(x0/C); x<=Math.floor(x1/C); x++) for (var y=Math.floor(y0/C); y<=Math.floor(y1/C); y++){
    var L=G.g[x+','+y]; if (!L) continue;
    for (var i=0;i<L.length;i++) if (segRect(L[i][0],L[i][1],x0,y0,x1,y1)) return true;
  }
  return false;
}
var LAKEBB=null, LAKEP=null;
function lakeBoxes(){ if (LAKEBB) return LAKEBB; LAKEP=TOPO.lakes.map(function(l){ return l.p.split(' ').map(function(t){ var a=t.split(','); return [+a[0],+a[1]]; }); });
  LAKEBB=LAKEP.map(function(P){ var xs=P.map(function(p){ return p[0]; }), ys=P.map(function(p){ return p[1]; }); return [Math.min.apply(0,xs),Math.min.apply(0,ys),Math.max.apply(0,xs),Math.max.apply(0,ys)]; }); return LAKEBB; }

var MAPST=null;
function mapPage(mode){
  nav('map');
  var full={x:0,y:0,w:TOPO.W,h:TOPO.H};
  var st=MAPST||(MAPST={cat:'all', layers:{names:true,rnames:true,erdely:false,partium:false,hajdu:false,banat:false,harmas:false}});
  st.mode=({kviz:'hol',folyo:'folyo',mi:'mi',keres:'keres'})[mode]||'explore';
  st.vb={x:0,y:0,w:TOPO.W,h:TOPO.H}; st.sel=null; st.hl=null; st.hlR=null; st.fs=false; document.body.classList.remove('mapfs');
  var quiz=null;
  function visible(p){ return st.cat==='all' || p.c.indexOf(st.cat)>=0; }
  function svgMarkup(){
    var s='<svg id="msvg" viewBox="0 0 '+TOPO.W+' '+TOPO.H+'" role="img" aria-label="Magyarország 1526–1711: vaktérkép folyókkal és helyszínekkel">';
    s+='<rect x="0" y="0" width="'+TOPO.W+'" height="'+TOPO.H+'" fill="var(--panel)"/>';
    s+='<g id="g-harmas" class="hidden"><polygon points="'+TOPO.regions['Királyság']+'" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>'+
       '<polygon points="'+TOPO.regions['Hódoltság']+'" fill="var(--ochre-tint)" stroke="var(--ochre)" stroke-width="1.2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>'+
       '<polygon points="'+TOPO.regions['Fejedelemség']+'" fill="var(--slate-tint)" stroke="var(--slate)" stroke-width="1.2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" opacity=".9"/></g>';
    var rc={erdely:'var(--slate)',partium:'var(--ochre)',hajdu:'var(--green)',banat:'var(--red)'};
    Object.keys(REGKEY).forEach(function(k){ s+='<polygon id="rg-'+k+'" class="hidden" points="'+TOPO.regions[REGKEY[k]]+'" fill="'+rc[k]+'" fill-opacity=".14" stroke="'+rc[k]+'" stroke-width="1.6" stroke-dasharray="7 4" vector-effect="non-scaling-stroke"/>'; });
    s+='<g fill="none" stroke="var(--ink-2)" stroke-width="1" vector-effect="non-scaling-stroke" opacity=".7">'+TOPO.coast.map(function(c){ return '<polyline points="'+c+'" vector-effect="non-scaling-stroke"/>'; }).join('')+'</g>';
    s+='<g id="g-lakes">'+TOPO.lakes.map(function(l,j){ return '<polygon data-l="'+j+'" points="'+l.p+'" fill="var(--slate)" fill-opacity=".35" stroke="var(--slate)" stroke-width="1.3" vector-effect="non-scaling-stroke"/>'; }).join('')+'</g>';
    s+='<g id="g-rivers" fill="none" stroke="var(--slate)" stroke-linejoin="round" stroke-linecap="round">'+
       TOPO.rivers.map(function(r,i){ return '<polyline data-r="'+i+'" points="'+r.p+'" stroke-width="'+(r.n==='Duna'||r.n==='Tisza'?2.6:1.7)+'" vector-effect="non-scaling-stroke"/>'; }).join('')+
       TOPO.extra.map(function(e){ return '<polyline points="'+e.p+'" stroke-width="1.6" vector-effect="non-scaling-stroke"/>'; }).join('')+'</g>';
    s+='<g id="g-rhl" fill="none" stroke="var(--red)" stroke-linejoin="round" stroke-linecap="round"></g>';
    s+='<g id="g-rlabels" font-family="Alegreya, serif" font-style="italic" fill="var(--slate)" stroke="var(--panel)" stroke-linejoin="round" paint-order="stroke">'+
       TOPO.rivers.map(function(r,i){ return r.lf.map(function(_,g){ return '<text class="rl" data-r="'+i+'" data-g="'+g+'" text-anchor="middle">'+esc(r.n)+'</text>'; }).join(''); }).join('')+
       TOPO.lakes.map(function(l,j){ return '<text class="rl" data-lake="'+j+'" text-anchor="middle">'+esc(l.n)+'</text>'; }).join('')+'</g>';
    s+='<g id="g-regl" font-family="Alegreya Sans, sans-serif" font-weight="700" fill="var(--ink-2)">'+
       '<text class="gl hidden" data-k="erdely" data-x="'+TOPO.regionLabels['Erdély'][0]+'" data-y="'+TOPO.regionLabels['Erdély'][1]+'" text-anchor="middle">ERDÉLY</text>'+
       '<text class="gl hidden" data-k="hajdu" data-x="'+TOPO.regionLabels['Hajdúság'][0]+'" data-y="'+TOPO.regionLabels['Hajdúság'][1]+'" text-anchor="middle">Hajdúság</text>'+
       '<text class="gl hidden" data-k="banat" data-x="'+TOPO.regionLabels['Bánság (Temesköz)'][0]+'" data-y="'+TOPO.regionLabels['Bánság (Temesköz)'][1]+'" text-anchor="middle">Bánság (Temesköz)</text>'+
       '<text class="gl hidden" data-k="partium" data-x="'+TOPO.regionLabels['Partium (1621)'][0]+'" data-y="'+TOPO.regionLabels['Partium (1621)'][1]+'" text-anchor="middle">PARTIUM (1621)</text>'+
       Object.keys(TOPO.counties).map(function(k){ var c=TOPO.counties[k]; return '<text class="gl cty hidden" data-k="partium" data-x="'+c[0]+'" data-y="'+c[1]+'" text-anchor="middle" font-weight="400" font-style="italic">'+esc(k)+'</text>'; }).join('')+
       '<text class="gl hidden" data-k="harmas" data-x="610" data-y="215" text-anchor="middle">KIRÁLYI MAGYARORSZÁG</text>'+
       '<text class="gl hidden" data-k="harmas" data-x="745" data-y="640" text-anchor="middle">HÓDOLTSÁG</text>'+
       '<text class="gl hidden" data-k="harmas" data-x="1420" data-y="640" text-anchor="middle">ERDÉLYI FEJEDELEMSÉG</text></g>';
    s+='<g id="g-places">'+PLACES.map(function(p,i){ return '<g class="pl" data-i="'+i+'"><circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="var(--ink)" stroke="var(--panel)"/><text class="pn" font-family="Alegreya Sans, sans-serif" fill="var(--ink)" stroke="var(--panel)" stroke-linejoin="round" paint-order="stroke" text-anchor="'+p.la+'">'+esc(p.n)+'</text></g>'; }).join('')+'</g>';
    return s+'</svg>';
  }
  function chipsCats(){ return '<div class="seg-ctl" id="cats">'+CATS.map(function(c){ var n=c[0]==='all'?PLACES.length:PLACES.filter(function(p){ return p.c.indexOf(c[0])>=0; }).length; return '<button data-c="'+c[0]+'" class="'+(st.cat===c[0]?'on':'')+'">'+c[1]+' <span class="muted">'+n+'</span></button>'; }).join('')+'</div>'; }
  function chipsLayers(){ return '<div class="seg-ctl" id="lays">'+LAYERS.map(function(l){ return '<button data-l="'+l[0]+'" class="'+(st.layers[l[0]]?'on':'')+'">'+l[1]+'</button>'; }).join('')+'</div>'; }
  function render(){
    var modes=[['explore','Felfedezés','#/terkep'],['hol','Hol van?','#/terkep/kviz'],['mi','Melyik hely ez?','#/terkep/mi'],['folyo','Melyik folyó?','#/terkep/folyo'],['keres','Hol folyik?','#/terkep/keres']];
    app.innerHTML='<section class="wrap"><h1 style="margin-top:28px">Térkép</h1>'+
      '<p class="small muted" style="margin:.2rem 0 .4rem">A folyók a tanári vaktérképről (11B_00) vannak átrajzolva: ugyanazt a folyóhálózatot látod, mint a dolgozatban.</p>'+
      '<div class="seg-ctl">'+modes.map(function(m){ return '<a href="'+m[2]+'" class="'+(st.mode===m[0]?'on':'')+'">'+m[1]+'</a>'; }).join('')+'</div>'+
      (st.mode==='folyo'||st.mode==='keres'?'':chipsCats())+
      (st.mode==='explore'?chipsLayers():'')+
      '<div class="mapbox"><div class="mapwrap">'+svgMarkup()+'<div class="mapctl"><button id="zin" aria-label="Nagyítás">+</button><button id="zout" aria-label="Kicsinyítés">−</button><button id="zres" aria-label="Az egész térkép" title="Az egész térkép">⤢</button><button id="zfs" aria-label="Teljes képernyő" title="Teljes képernyő"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"/></svg></button></div></div><div class="mapinfo" id="mi" aria-live="polite"></div></div>'+
      '<button class="btn sm fsbtn" id="zfs2">Térkép teljes képernyőn</button>'+
      '<p class="small muted">Húzd a térképet a mozgatáshoz; nagyítás: görgő, két ujj vagy a + gomb. A sűrű részeken a nevek nagyításkor jelennek meg, a pontra koppintva is kiírja a nevet. Telefonon a sarokgombbal teljes képernyőre nagyíthatod a térképet.</p>'+
      (st.mode==='explore'?listMarkup():'')+
    '</section>';
    bind(); applyLayers(); applyView();
    if (st.mode==='explore') info('<span class="muted">Koppints egy pontra vagy folyóra. A lenti listában is rákereshetsz bármelyik helyre.</span>');
    else startQuiz();
  }
  function listMarkup(){
    var rv=TOPO.rivers.map(function(r,i){ return '<button class="lk" data-river="'+i+'">'+esc(r.n)+'</button>'; }).join('')+TOPO.lakes.map(function(l,j){ return '<button class="lk" data-lake="'+j+'">'+esc(l.n)+'</button>'; }).join('');
    return '<h2>A topográfiai lista</h2><p class="small muted">Koppints egy névre: megmutatja a térképen.</p>'+
      '<h3>A vaktérképen föltüntetett folyók</h3><div class="chips lks">'+rv+'</div>'+
      TOPOLIST.map(function(sec){ return '<h3>'+sec[0]+'</h3><div class="chips lks">'+sec[2].map(function(it){
        if (it[0].charAt(0)==='@') return '<button class="lk reg" data-reg="'+it[0].slice(1)+'">'+esc(it[1])+'</button>';
        return '<button class="lk" data-place="'+esc(it[0])+'">'+esc(it[0])+(it[1]?' <span class="muted">['+esc(it[1])+']</span>':'')+'</button>'; }).join('')+'</div>'; }).join('')+
      '<h3>Partium (1621, nikolsburgi béke)</h3><div class="chips lks"><button class="lk reg" data-reg="partium">Szabolcs, Szatmár, Bereg, Borsod, Abaúj, Zemplén és Ugocsa vármegye</button></div>'+
      '<div class="note">A Partium szó először az 1570-es speyeri szerződésben szerepel. Kiterjedése a 16–18. században többször változott: mindig azt a területet jelentette, amelyet az erdélyi fejedelem uralt, de nem tartozott a középkori (földrajzi) Erdélyhez. A reformkorig külön igazgatási egység volt.</div>'+
      '<h3>A tananyag további helyszínei</h3><div class="chips lks">'+PLACES.filter(function(p){ return p.c.indexOf('egyeb')>=0; }).map(function(p){ return '<button class="lk" data-place="'+esc(p.n)+'">'+esc(p.n)+'</button>'; }).join('')+'</div>'+
      '<p class="small muted" style="margin-top:14px">A helyszínek valós földrajzi koordináták alapján, a vaktérkép folyóihoz illesztve kerültek a helyükre. A régióhatárok (Erdély, Partium, Hajdúság, Bánság, hármas tagolódás) vázlatosak.</p>';
  }
  function info(h){ var m=$('#mi'); if (m) m.innerHTML=h; }
  function applyLayers(){
    var q=st.mode!=='explore';
    $$('#g-places .pl').forEach(function(g){ var p=PLACES[+g.getAttribute('data-i')]; g.classList.toggle('hidden', !visible(p)); });
    $('#g-places').classList.toggle('nolabel', q || !st.layers.names);
    $('#g-rlabels').classList.toggle('hidden', q || !st.layers.rnames);
    Object.keys(REGKEY).forEach(function(k){ $('#rg-'+k).classList.toggle('hidden', q || !st.layers[k]); });
    $('#g-harmas').classList.toggle('hidden', q || !st.layers.harmas);
    $$('#g-regl .gl').forEach(function(t){ var k=t.getAttribute('data-k'); t.classList.toggle('hidden', q || !st.layers[k]); });
    if (st.mode==='folyo'||st.mode==='keres') $('#g-places').classList.add('hidden'); else $('#g-places').classList.remove('hidden');
  }
  function kScale(){ var svg=$('#msvg'); return svg.getBoundingClientRect().width/st.vb.w; }
  function applyView(){
    var svg=$('#msvg'); if (!svg) return;
    svg.setAttribute('viewBox', st.vb.x+' '+st.vb.y+' '+st.vb.w+' '+st.vb.h);
    var k=kScale(); if (!isFinite(k)||k<=0) k=1;
    var small=svg.getBoundingClientRect().width<560 && k<0.5, rD=small?3.4:4.6;
    $$('#g-places .pl').forEach(function(g){ var sel=(st.sel===+g.getAttribute('data-i')), c=g.firstChild;
      c.setAttribute('r', (sel?rD+3:rD)/k); c.setAttribute('stroke-width', 1.4/k); });
    $$('#g-regl text').forEach(function(t){ t.setAttribute('x', t.getAttribute('data-x')); t.setAttribute('y', t.getAttribute('data-y')); t.setAttribute('font-size', (t.classList.contains('cty')?11:13)/k); });
    layout(k, small?11:12.5, small?10.5:12, rD);
  }
  /* Mohó címke-elhelyezés: a fontosabb címkék kerülnek le előbb, ami nem fér el, elrejtődik (nagyításkor előjön). */
  function layout(k, fsP, fsR, rD){
    var svg=$('#msvg'), R=svg.getBoundingClientRect(), W=R.width, H=R.height, vb=st.vb, T=textW();
    var X=function(x){ return (x-vb.x)*k; }, Y=function(y){ return (y-vb.y)*k; };
    var gp=$('#g-places'), showP=!gp.classList.contains('nolabel') && !gp.classList.contains('hidden'), showR=!$('#g-rlabels').classList.contains('hidden');
    var boxes=[], ctl=$('.mapctl'); if (ctl){ var cr=ctl.getBoundingClientRect(); boxes.push([cr.left-R.left-4, cr.top-R.top-4, cr.right-R.left+4, cr.bottom-R.top+4]); }
    function inView(c){ return c.bs.every(function(b){ return b[0]>=2 && b[1]>=2 && b[2]<=W-2 && b[3]<=H-2; }); }
    var dots=[];
    function free(c){ if (!inView(c)) return false; for (var j=0;j<c.bs.length;j++){ var b=c.bs[j], i, o; for (i=0;i<boxes.length;i++){ o=boxes[i]; if (b[0]<o[2]&&b[2]>o[0]&&b[1]<o[3]&&b[3]>o[1]) return false; }
      for (i=0;i<dots.length;i++){ if (dots[i].i===c.self) continue; o=dots[i].b; if (b[0]<o[2]&&b[2]>o[0]&&b[1]<o[3]&&b[3]>o[1]) return false; } } return true; }
    function crosses(c){ return c.bs.some(function(b){ return rectHitsLine(vb.x+b[0]/k, vb.y+b[1]/k, vb.x+b[2]/k, vb.y+b[3]/k); }); }
    function take(c){ c.bs.forEach(function(b){ boxes.push(b); }); return c; }
    function pick(cands, must, onePass){ for (var pass=onePass?1:0;pass<2;pass++) for (var i=0;i<cands.length;i++){ var c=cands[i]; if (free(c) && (pass===1 || !crosses(c))) return take(c); }
      if (must){ for (var j=0;j<cands.length;j++) if (inView(cands[j])) return take(cands[j]); } return null; }
    // pontok és látható régiónevek: akadályok
    var plEls=$$('#g-places .pl'), vis=[];
    plEls.forEach(function(g){ var i=+g.getAttribute('data-i'), p=PLACES[i]; if (g.classList.contains('hidden') || gp.classList.contains('hidden')) return; vis.push(i); var r=(st.sel===i?rD+3:rD)+3.5; dots.push({i:i, b:[X(p.x)-r,Y(p.y)-r,X(p.x)+r,Y(p.y)+r]}); });
    lakeBoxes(); LAKEP.forEach(function(P){ for (var j=0;j<P.length;j++){ var a=P[j], b=P[(j+1)%P.length]; boxes.push([Math.min(X(a[0]),X(b[0]))-1.5,Math.min(Y(a[1]),Y(b[1]))-1.5,Math.max(X(a[0]),X(b[0]))+1.5,Math.max(Y(a[1]),Y(b[1]))+1.5]); } });
    $$('#g-regl text').forEach(function(t){ if (t.classList.contains('hidden') || t.classList.contains('cty')) return; var cty=false, fs=13; T.ctx.font=(cty?'italic 400 ':'700 ')+fs+'px "Alegreya Sans", sans-serif'; var w=T.ctx.measureText(t.textContent).width, x=X(+t.getAttribute('data-x')), y=Y(+t.getAttribute('data-y')); boxes.push([x-w/2-2,y-0.75*fs,x+w/2+2,y+0.25*fs]); });
    // helynév-jelöltek (8 irány + a kézi alaphelyzet)
    function placeCands(i){
      var p=PLACES[i], sx=X(p.x), sy=Y(p.y), sel=(st.sel===i), w=T.pl[i]*fsP/12.5*(sel?1.07:1), a=0.72*fsP, d=0.24*fsP, o=(sel?rD+3:rD)+3;
      var pos=[[p.lx*fsP/12.5,p.ly*fsP/12.5,p.la],[o,0.32*fsP,'start'],[-o,0.32*fsP,'end'],[0,-o,'middle'],[0,o+a,'middle'],[o-1,-o+2,'start'],[o-1,o+a-2,'start'],[-o+1,-o+2,'end'],[-o+1,o+a-2,'end'],[o+2,-0.6*fsP,'start'],[o+2,1.1*fsP,'start'],[-o-2,-0.6*fsP,'end'],[-o-2,1.1*fsP,'end']];
      return pos.map(function(q){ var bx=sx+q[0], by=sy+q[1], x0=q[2]==='start'?bx:q[2]==='end'?bx-w:bx-w/2; return {bs:[[x0-1,by-a-1,x0+w+1,by+d+1]], q:q, self:i}; });
    }
    var placed={};
    function doPlace(i, must){ var p=PLACES[i], sx=X(p.x), sy=Y(p.y); if (sx<0||sy<0||sx>W||sy>H){ placed[i]=null; return; } placed[i]=pick(placeCands(i), must, true); }
    // folyónév-jelöltek: a folyó irányába forgatva (meredek szakaszon vízszintesen, mellette), a látható szakaszon
    var RS=riverSamples(), rPlaced={};
    function riverLabel(ri, gi, must){
      var spec=TOPO.rivers[ri].lf[gi], f0=spec[0], side=spec[1], w=T.rv[ri]*fsR/12, h=0.92*fsR, RR=RS[ri], cands=[];
      var lim=gi===0?1:0.14, others=rPlaced[ri]||[], half=(w/2+3)/k;
      var ord=RR.S.filter(function(s){ return Math.abs(s.f-f0)<=lim; }).sort(function(a,b){ return Math.abs(a.f-f0)-Math.abs(b.f-f0); });
      for (var n=0;n<ord.length && cands.length<80;n++){
        var s=ord[n], sx=X(s.x), sy=Y(s.y); if (sx<-20||sy<-20||sx>W+20||sy>H+20) continue;
        var ok=(s.s-half>=0 && s.s+half<=RR.L), pa, pb, tx, ty, devP=0, devN=0;
        if (ok){
          pa=RR.at(s.s-half); pb=RR.at(s.s+half); pa=[X(pa[0]),Y(pa[1])]; pb=[X(pb[0]),Y(pb[1])];
          tx=pb[0]-pa[0]; ty=pb[1]-pa[1]; var tl=Math.hypot(tx,ty)||1; tx/=tl; ty/=tl; if (tx<0){ tx=-tx; ty=-ty; }
          var nx=-ty, ny=tx;
          for (var j=1;j<8;j++){ var q=RR.at(s.s-half+2*half*j/8), dv=(X(q[0])-pa[0])*nx+(Y(q[1])-pa[1])*ny; if (dv>devP) devP=dv; if (-dv>devN) devN=-dv; }
          if (Math.max(devP,devN)>1.1*h) ok=false;
        }
        var ang=ok?Math.atan2(ty,tx)*180/Math.PI:90;
        if (ok && Math.abs(ang)<=62){
          var mx=(pa[0]+pb[0])/2, my=(pa[1]+pb[1])/2, nx2=-ty, ny2=tx, first=(ny2<0)?1:-1; // először a folyó fölé
          [first,-first].forEach(function(sd){
            var off=h/2+2.5+(sd>0?devP:devN), cx=mx+nx2*sd*off, cy=my+ny2*sd*off, bs=[];
            var m=Math.max(1,Math.ceil(w/(h*0.9))), qh=h*0.5*(Math.abs(tx)+Math.abs(ty))*0.9;
            for (var j=0;j<m;j++){ var u=m===1?0:-w/2+h*0.45+j*(w-h*0.9)/(m-1), px=cx+tx*u, py=cy+ty*u; bs.push([px-qh,py-qh,px+qh,py+qh]); }
            for (var o=0;o<others.length;o++) if (Math.hypot(others[o][0]-cx,others[o][1]-cy)<280) return;
            cands.push({bs:bs, c:[cx,cy], a:ang});
          });
        } else if (Math.abs(s.nx)>0.75){ // meredek szakasz: vízszintes felirat a folyó mellett
          [side,-side].forEach(function(sd){
            var dd=(w/2)*Math.abs(s.nx)+(h/2)*Math.abs(s.ny)+3, cx=sx+s.nx*sd*dd, cy=sy+s.ny*sd*dd;
            for (var o=0;o<others.length;o++) if (Math.hypot(others[o][0]-cx,others[o][1]-cy)<280) return;
            cands.push({bs:[[cx-w/2,cy-h/2,cx+w/2,cy+h/2]], c:[cx,cy], a:0});
          });
        }
      }
      var c=pick(cands, must); if (c) (rPlaced[ri]=rPlaced[ri]||[]).push(c.c); return c;
    }
    // fontossági sorrend: kijelölt > fővárosok, nagy központok > többi listás hely > folyók > tavak > egyéb helyek > a hosszú folyók 2–3. címkéje
    var PRI=['Buda','Pest','Bécs','Pozsony','Kassa','Gyulafehérvár','Kolozsvár','Temesvár','Eger','Debrecen','Mohács','Várad','Szigetvár','Nagyszombat','Győr','Sopron','Kőszeg','Szatmár','Eszék','Karlóca'];
    function prio(i){ var r=PRI.indexOf(PLACES[i].n); return r<0?100+i:r; }
    var rRes={}, lRes={};
    if (showR && typeof st.hlR==='number') rRes[st.hlR+':0']=riverLabel(st.hlR,0,true);
    if (showP && st.sel!==null && vis.indexOf(st.sel)>=0) doPlace(st.sel,true);
    var listed=vis.filter(function(i){ return i!==st.sel && PLACES[i].c.join()!=='egyeb'; }).sort(function(a,b){ return prio(a)-prio(b); });
    if (showP) listed.forEach(function(i){ doPlace(i,false); });
    $$('#g-regl text.cty').forEach(function(t){ if (t.classList.contains('hidden')) return; T.ctx.font='italic 400 11px "Alegreya Sans", sans-serif';
      var w=T.ctx.measureText(t.textContent).width, x=X(+t.getAttribute('data-x')), y=Y(+t.getAttribute('data-y'));
      var cs=[[0,0],[0,-11],[0,11],[-18,0],[18,0],[-14,-10],[14,-10],[-14,10],[14,10],[0,-20],[0,20]].map(function(o){ return {bs:[[x+o[0]-w/2-1,y+o[1]-8.5,x+o[0]+w/2+1,y+o[1]+3]], o:o}; });
      var c=pick(cs,true,true), o=c?c.o:[0,0]; t.setAttribute('x', vb.x+(x+o[0])/k); t.setAttribute('y', vb.y+(y+o[1])/k); });
    if (showR){
      TOPO.rivers.forEach(function(r,ri){ if (!(ri+':0' in rRes)) rRes[ri+':0']=riverLabel(ri,0,false); });
      var LB=lakeBoxes(); TOPO.lakes.forEach(function(l,j){ var bb=LB[j], w=T.lk[j]*fsR/12, h=0.92*fsR, x0=X(bb[0]), y0=Y(bb[1]), x1=X(bb[2]), y1=Y(bb[3]), cx=(x0+x1)/2, cy=(y0+y1)/2;
        var cs=[[cx,y0-h/2-3],[cx,y1+h/2+3],[x1+w/2+4,cy],[x0-w/2-4,cy],[x1+w/2+2,y0-h/2],[x0-w/2-2,y1+h/2]].map(function(c){ return {bs:[[c[0]-w/2,c[1]-h/2,c[0]+w/2,c[1]+h/2]], c:c, a:0}; });
        lRes[j]=pick(cs,false); });
    }
    if (showP) vis.forEach(function(i){ if (i!==st.sel && PLACES[i].c.join()==='egyeb') doPlace(i,false); });
    if (showR) TOPO.rivers.forEach(function(r,ri){ for (var gi=1;gi<r.lf.length;gi++) rRes[ri+':'+gi]=riverLabel(ri,gi,false); });
    // kiírás az SVG-be
    plEls.forEach(function(g){ var i=+g.getAttribute('data-i'), t=g.lastChild, c=placed[i];
      if (!c){ t.setAttribute('visibility','hidden'); return; }
      var q=c.q; t.setAttribute('visibility','visible'); t.setAttribute('text-anchor', q[2]); t.setAttribute('x', PLACES[i].x+q[0]/k); t.setAttribute('y', PLACES[i].y+q[1]/k); t.setAttribute('font-size', fsP/k); t.setAttribute('stroke-width', 3.2/k); t.setAttribute('font-weight', st.sel===i?700:500); });
    $$('#g-rlabels text').forEach(function(t){ var c=t.hasAttribute('data-lake')?lRes[t.getAttribute('data-lake')]:rRes[t.getAttribute('data-r')+':'+t.getAttribute('data-g')];
      if (!c){ t.setAttribute('visibility','hidden'); return; }
      var mx=vb.x+c.c[0]/k, my=vb.y+c.c[1]/k;
      t.setAttribute('visibility','visible'); t.setAttribute('x', mx); t.setAttribute('y', my+0.3*fsR/k); t.setAttribute('font-size', fsR/k); t.setAttribute('stroke-width', 2.6/k);
      if (c.a) t.setAttribute('transform','rotate('+c.a.toFixed(1)+' '+mx.toFixed(1)+' '+my.toFixed(1)+')'); else t.removeAttribute('transform'); });
  }
  window.__mapRelayout=function(){ if ($('#msvg')) applyView(); };
  /* nézet: rendes módban a térkép arányos; teljes képernyőn a képernyő arányához igazodik */
  function aspect(){ if (!st.fs) return full.h/full.w; var r=$('#msvg').getBoundingClientRect(); return (r.width>0&&r.height>0)?r.height/r.width:full.h/full.w; }
  function maxW(){ return st.fs?Math.max(full.w, full.h/aspect()):full.w; }
  function clampVB(){ var v=st.vb, a=aspect(); v.w=Math.max(220,Math.min(maxW(),v.w)); v.h=v.w*a;
    if (v.w>=full.w) v.x=(full.w-v.w)/2; else v.x=Math.max(-40,Math.min(full.w-v.w+40,v.x));
    if (v.h>=full.h) v.y=(full.h-v.h)/2; else v.y=Math.max(-40,Math.min(full.h-v.h+40,v.y)); }
  function homeView(){ var a=aspect(), w=st.fs?Math.min(full.w, full.h/a):full.w; st.vb={x:(full.w-w)/2, y:(full.h-w*a)/2, w:w, h:w*a}; clampVB(); }
  function zoomAt(f,cx,cy){ var v=st.vb, mw=maxW(); var nw=v.w/f; if (nw<220) { f=v.w/220; nw=220; } if (nw>mw){ f=v.w/mw; nw=mw; } v.x=cx-(cx-v.x)/f; v.y=cy-(cy-v.y)/f; v.w=nw; v.h=nw*aspect(); clampVB(); applyView(); }
  function setFs(on){ st.fs=on; var mb=$('.mapbox'); if (!mb) return; mb.classList.toggle('fs', on); document.body.classList.toggle('mapfs', on);
    $('#zfs').setAttribute('aria-label', on?'Kilépés a teljes képernyőből':'Teljes képernyő'); homeView(); applyView(); }
  function toMap(clientX,clientY){ var svg=$('#msvg'), pt=svg.createSVGPoint(); pt.x=clientX; pt.y=clientY; var p=pt.matrixTransform(svg.getScreenCTM().inverse()); return [p.x,p.y]; }
  function focusPlace(i, zoom){
    var p=PLACES[i]; st.sel=i;
    if (zoom){ var w=Math.min(st.vb.w,600), a=aspect(); st.vb={x:p.x-w/2,y:p.y-w*a/2,w:w,h:w*a}; clampVB(); }
    applyView(); showPlace(i);
  }
  function showPlace(i){
    var p=PLACES[i];
    info('<b>'+esc(p.n)+'</b> <span class="small muted">'+p.c.map(catLabel).join(', ')+'</span><br>'+esc(p.t)+(p.ch?' <a href="#/fejezet/'+p.ch+'" class="small">('+chById(p.ch).n+'. fejezet)</a>':''));
  }
  function highlightRiver(key){
    var g=$('#g-rhl'); g.innerHTML=''; st.hlR=(typeof key==='number')?key:null;
    if (st.mode==='explore') applyView();
    if (key===null||key===undefined) return;
    if (typeof key==='string' && key.charAt(0)==='L'){ var l=TOPO.lakes[+key.slice(1)]; g.innerHTML='<polygon points="'+l.p+'" fill="var(--red)" fill-opacity=".35" stroke="var(--red)" stroke-width="3" vector-effect="non-scaling-stroke"/>'; return; }
    var r=TOPO.rivers[key]; var more=TOPO.extra.filter(function(e){ return e.n===r.n; });
    g.innerHTML='<polyline points="'+r.p+'" stroke-width="5" vector-effect="non-scaling-stroke"/>'+more.map(function(e){ return '<polyline points="'+e.p+'" stroke-width="4" vector-effect="non-scaling-stroke"/>'; }).join('');
  }
  function riverName(key){ return (typeof key==='string')?TOPO.lakes[+key.slice(1)].n:TOPO.rivers[key].n; }
  function tapAt(m){
    var k=kScale();
    if (st.mode==='explore'){
      var best=-1, bd=1e9; PLACES.forEach(function(p,i){ if (!visible(p)) return; var d=Math.hypot(p.x-m[0],p.y-m[1]); if (d<bd){ bd=d; best=i; } });
      if (best>=0 && bd<=22/k){ highlightRiver(null); focusPlace(best,false); return; }
      var nr=nearestRiver(m);
      if (nr.i!==null && nr.d<=14/k){ st.sel=null; applyView(); highlightRiver(nr.i); info('<b>'+esc(riverName(nr.i))+'</b> <span class="small muted">'+(typeof nr.i==='string'?'tó':'folyó')+'</span>'); return; }
      st.sel=null; highlightRiver(null); applyView(); info('<span class="muted">Itt nincs jelölt hely. Koppints egy pontra vagy folyóra.</span>');
    } else if (quiz && quiz.onTap) quiz.onTap(m,k);
  }
  function bind(){
    $$('#cats button').forEach(function(b){ b.addEventListener('click', function(){ st.cat=b.getAttribute('data-c'); st.sel=null; $$('#cats button').forEach(function(x){ x.classList.toggle('on', x===b); }); applyLayers(); applyView(); if (st.mode!=='explore') startQuiz(); }); });
    $$('#lays button').forEach(function(b){ b.addEventListener('click', function(){ var l=b.getAttribute('data-l'); st.layers[l]=!st.layers[l]; b.classList.toggle('on', st.layers[l]); applyLayers(); applyView(); }); });
    $('#zin').addEventListener('click', function(){ zoomAt(1.6, st.vb.x+st.vb.w/2, st.vb.y+st.vb.h/2); });
    $('#zout').addEventListener('click', function(){ zoomAt(1/1.6, st.vb.x+st.vb.w/2, st.vb.y+st.vb.h/2); });
    $('#zres').addEventListener('click', function(){ homeView(); applyView(); });
    $('#zfs').addEventListener('click', function(){ setFs(!st.fs); });
    $('#zfs2').addEventListener('click', function(){ setFs(true); });
    var svg=$('#msvg'), ptrs={}, start=null, moved=0, pinch=null;
    svg.addEventListener('wheel', function(e){ e.preventDefault(); var m=toMap(e.clientX,e.clientY); zoomAt(e.deltaY<0?1.25:0.8, m[0], m[1]); }, {passive:false});
    svg.addEventListener('pointerdown', function(e){ svg.setPointerCapture(e.pointerId); ptrs[e.pointerId]=[e.clientX,e.clientY]; var ids=Object.keys(ptrs);
      if (ids.length===1){ start={x:e.clientX,y:e.clientY,vb:{x:st.vb.x,y:st.vb.y}}; moved=0; pinch=null; }
      else if (ids.length===2){ var a=ptrs[ids[0]], b=ptrs[ids[1]]; pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]), w:st.vb.w, c:toMap((a[0]+b[0])/2,(a[1]+b[1])/2)}; moved=99; } });
    svg.addEventListener('pointermove', function(e){ if (!ptrs[e.pointerId]) return; ptrs[e.pointerId]=[e.clientX,e.clientY]; var ids=Object.keys(ptrs);
      if (ids.length===2 && pinch){ var a=ptrs[ids[0]], b=ptrs[ids[1]], d=Math.hypot(a[0]-b[0],a[1]-b[1]); var f=(d/pinch.d)/(pinch.w/st.vb.w); zoomAt(f, pinch.c[0], pinch.c[1]); return; }
      if (ids.length===1 && start){ var k=kScale(), dx=e.clientX-start.x, dy=e.clientY-start.y; moved=Math.max(moved,Math.hypot(dx,dy)); if (moved>5){ st.vb.x=start.vb.x-dx/k; st.vb.y=start.vb.y-dy/k; clampVB(); applyView(); svg.classList.add('drag'); } } });
    var end=function(e){ var wasTap=ptrs[e.pointerId] && Object.keys(ptrs).length===1 && moved<=5; delete ptrs[e.pointerId]; svg.classList.remove('drag'); if (Object.keys(ptrs).length===0){ pinch=null; } if (wasTap && e.type==='pointerup'){ tapAt(toMap(e.clientX,e.clientY)); } start=null; };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    $$('.lk[data-place]').forEach(function(b){ b.addEventListener('click', function(){ var i=placeByName(b.getAttribute('data-place')); if (i<0) return; if (!visible(PLACES[i])){ st.cat='all'; $$('#cats button').forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-c')==='all'); }); applyLayers(); } highlightRiver(null); focusPlace(i,true); $('.mapbox').scrollIntoView({behavior:'smooth',block:'center'}); }); });
    $$('.lk[data-river]').forEach(function(b){ b.addEventListener('click', function(){ var i=+b.getAttribute('data-river'); st.sel=null; homeView(); applyView(); highlightRiver(i); info('<b>'+esc(TOPO.rivers[i].n)+'</b> <span class="small muted">folyó</span>'); $('.mapbox').scrollIntoView({behavior:'smooth',block:'center'}); }); });
    $$('.lk[data-lake]').forEach(function(b){ b.addEventListener('click', function(){ var j=b.getAttribute('data-lake'); st.sel=null; applyView(); highlightRiver('L'+j); info('<b>'+esc(TOPO.lakes[+j].n)+'</b> <span class="small muted">tó</span>'); $('.mapbox').scrollIntoView({behavior:'smooth',block:'center'}); }); });
    $$('.lk[data-reg]').forEach(function(b){ b.addEventListener('click', function(){ var k=b.getAttribute('data-reg'); st.layers[k]=true; $$('#lays button').forEach(function(x){ x.classList.toggle('on', !!st.layers[x.getAttribute('data-l')]); }); applyLayers(); homeView(); applyView(); info('<b>'+esc(REGNAME[k])+'</b> <span class="small muted">terület (vázlatos határ)</span>'); $('.mapbox').scrollIntoView({behavior:'smooth',block:'center'}); }); });
  }
  /* --- kvízek --- */
  function startQuiz(){
    highlightRiver(null); st.sel=null; applyView();
    var N=10, k0=0, ok=0, locked=false, order;
    var pool=PLACES.map(function(_,i){ return i; }).filter(function(i){ return visible(PLACES[i]); });
    var rpool=TOPO.rivers.map(function(_,i){ return i; }).concat(TOPO.lakes.map(function(_,j){ return 'L'+j; }));
    if (st.mode==='hol'||st.mode==='mi') order=shuffle(pool).slice(0,Math.min(N,pool.length)); else order=shuffle(rpool).slice(0,N);
    function done(){ var key='map-'+st.mode+'-'+st.cat; H.S().misc[key]=Math.max(H.S().misc[key]||0,ok); save(); quiz=null;
      info('<b>Eredmény: '+ok+' / '+order.length+'</b> <span class="small muted">(rekord: '+H.S().misc[key]+')</span> <button class="btn sm" id="again" style="margin-left:8px">Új kör</button>'); $('#again').addEventListener('click', startQuiz); }
    function next(){ k0++; if (k0>=order.length) return done(); ask(); }
    function nxBtn(){ return ' <button class="btn sm" id="nq" style="margin-left:8px">Tovább</button>'; }
    function wire(){ var b=$('#nq'); if (b){ b.addEventListener('click', next); b.focus({preventScroll:true}); } }
    function opts(correct, all, label){
      var wrong=shuffle(all.filter(function(x){ return x!==correct; })).slice(0,3);
      var o=shuffle([correct].concat(wrong));
      return '<div class="opts" style="margin-top:8px">'+o.map(function(x){ return '<button class="opt" data-v="'+esc(String(x))+'">'+esc(label(x))+'</button>'; }).join('')+'</div>';
    }
    function ask(){
      locked=false; highlightRiver(null); st.sel=null; applyView();
      $$('#g-places .pl circle').forEach(function(c){ c.setAttribute('fill','var(--ink)'); });
      var head='<span class="num muted">'+(k0+1)+' / '+order.length+'</span> &nbsp;';
      if (st.mode==='hol'){
        var t=PLACES[order[k0]];
        info(head+'Hol van: <b style="font-size:1.15rem">'+esc(t.n)+'</b>? <span class="small muted">Koppints a pontjára.</span>');
        quiz={onTap:function(m,k){ if (locked) return; var best=-1, bd=1e9; pool.forEach(function(i){ var p=PLACES[i], d=Math.hypot(p.x-m[0],p.y-m[1]); if (d<bd){ bd=d; best=i; } });
          if (best<0 || bd>30/k) { info(head+'Hol van: <b style="font-size:1.15rem">'+esc(t.n)+'</b>? <span class="small" style="color:var(--red)">Egy pontra koppints.</span>'); return; }
          locked=true; var good=(best===order[k0]); if (good) ok++;
          st.sel=order[k0]; applyView(); markDot(order[k0],'var(--green)'); if (!good) markDot(best,'var(--red)');
          info((good?'<b style="color:var(--green)">Talált.</b> ':'<b style="color:var(--red)">Nem ez</b> (ez '+esc(PLACES[best].n)+'). ')+'<b>'+esc(t.n)+'</b>: '+esc(t.t)+nxBtn()); wire(); }};
      } else if (st.mode==='mi'){
        var ti=order[k0]; st.sel=ti; applyView(); markDot(ti,'var(--red)');
        info(head+'Melyik hely ez a piros pont?'+opts(ti, pool, function(i){ return PLACES[i].n; }));
        $$('#mi .opt').forEach(function(b){ b.addEventListener('click', function(){ if (locked) return; locked=true; var v=+b.getAttribute('data-v'), good=(v===ti); if (good) ok++;
          $$('#mi .opt').forEach(function(x){ x.disabled=true; if (+x.getAttribute('data-v')===ti) x.classList.add('ok'); }); if (!good) b.classList.add('bad');
          markDot(ti,'var(--green)'); var p=PLACES[ti]; $('#mi').insertAdjacentHTML('beforeend','<div style="margin-top:8px"><b>'+esc(p.n)+'</b>: '+esc(p.t)+nxBtn()+'</div>'); wire(); }); });
      } else if (st.mode==='folyo'){
        var key=order[k0]; highlightRiver(key);
        info(head+'Melyik '+(typeof key==='string'?'tó':'folyó')+' van pirossal kiemelve?'+opts(key, rpool, riverName));
        $$('#mi .opt').forEach(function(b){ b.addEventListener('click', function(){ if (locked) return; locked=true; var v=b.getAttribute('data-v'), good=(v===String(key)); if (good) ok++;
          $$('#mi .opt').forEach(function(x){ x.disabled=true; if (x.getAttribute('data-v')===String(key)) x.classList.add('ok'); }); if (!good) b.classList.add('bad');
          $('#mi').insertAdjacentHTML('beforeend','<div style="margin-top:8px">'+(good?'<b style="color:var(--green)">Helyes.</b>':'<b style="color:var(--red)">Nem ez.</b> Ez a(z) <b>'+esc(riverName(key))+'</b>.')+nxBtn()+'</div>'); wire(); }); });
      } else if (st.mode==='keres'){
        var key2=order[k0];
        info(head+'Koppints a(z) <b style="font-size:1.15rem">'+esc(riverName(key2))+'</b> '+(typeof key2==='string'?'tóra':'folyóra')+'!');
        quiz={onTap:function(m,k){ if (locked) return; var nr=nearestRiver(m); if (nr.i===null || nr.d>18/k){ info(head+'Koppints a(z) <b style="font-size:1.15rem">'+esc(riverName(key2))+'</b> '+(typeof key2==='string'?'tóra':'folyóra')+'! <span class="small" style="color:var(--red)">Egy vonalra koppints.</span>'); return; }
          locked=true; var good=(String(nr.i)===String(key2)); if (good) ok++; highlightRiver(key2);
          info((good?'<b style="color:var(--green)">Talált.</b> ':'<b style="color:var(--red)">Nem ez</b> (ez a(z) '+esc(riverName(nr.i))+'). ')+'Pirossal: <b>'+esc(riverName(key2))+'</b>.'+nxBtn()); wire(); }};
      }
    }
    function markDot(i,col){ var g=$('#g-places .pl[data-i="'+i+'"]'); if (g) g.firstChild.setAttribute('fill',col); }
    if (!order.length){ info('Ebben a kategóriában nincs hely.'); return; }
    ask();
  }
  render();
  window.onresize=function(){ if ($('#msvg')){ clampVB(); applyView(); } };
  document.onkeydown=function(e){ if (e.key==='Escape' && st.fs && $('#msvg')) setFs(false); };
}

return mapPage;
}
