// node shots.cjs archivo.html "i:t,i:t,..." prefijo
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const [f,list,pre]=process.argv.slice(2);const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+process.cwd()+'/'+f);await p.waitForTimeout(400);
console.log('dur',await p.evaluate(()=>[window.SCENES.reduce((a,b)=>a+b,0),window.CUTS]));
for(const [k,it] of list.split(',').entries()){const [i,t]=it.split(':').map(Number);await p.evaluate(([i,t])=>draw(i,t),[i,t]);await p.screenshot({path:`/tmp/tk/${pre}${k}.jpg`,type:'jpeg',quality:80})}
await b.close()})();
