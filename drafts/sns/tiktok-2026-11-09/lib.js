// Herramientas comunes para los videos de TikTok (1080x1920, 30 fps).
// Zona segura de TikTok: arriba 160px, abajo 420px (texto y botones), derecha 140px.
const S=document.getElementById('s');
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=cl(x);return 1-Math.pow(1-x,3)};
const back=x=>{x=cl(x);const c=1.9;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const inn=(t,a,d=.4)=>ease((t-a)/d);
const pop=(t,a,d=.45)=>back((t-a)/d);
const up=(o,y=60)=>`opacity:${cl(o*1.4)};transform:translateY(${(1-o)*y}px)`;
const zoom=o=>`opacity:${cl(o*2)};transform:scale(${.6+.4*o})`;
const pulse=t=>1+.04*Math.sin(t*Math.PI*4);
const shake=(t,a)=>{const k=(t-a);return k>0&&k<.35?`transform:translateX(${Math.sin(k*60)*14*(1-k/.35)}px)`:''};
const logo=(size=56,o=1)=>`<div style="font-weight:900;font-size:${size}px;letter-spacing:-2px;opacity:${o}">Galería<span class="pink">K</span></div>`;
let TOTAL=0;
const prog=(T,dark)=>`<div style="position:absolute;left:70px;right:150px;top:150px;height:8px;border-radius:9px;background:${dark?'rgba(0,0,0,.1)':'rgba(255,255,255,.18)'}"><i style="display:block;height:100%;border-radius:9px;background:${dark?'#17171c':'#fff'};width:${T/TOTAL*100}%"></i></div>`;
function setup(SCENES){
  TOTAL=SCENES.reduce((a,s)=>a+s.d,0);
  window.SCENES=SCENES.map(s=>s.d);
  const START=SCENES.map((_,i)=>SCENES.slice(0,i).reduce((a,s)=>a+s.d,0));
  window.CUTS=START.slice(1);
  window.draw=(i,t)=>{S.innerHTML=SCENES[i].f(t,START[i]+t)};
}
