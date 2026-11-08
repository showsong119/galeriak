const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+process.cwd()+'/carrusel-frases.html');await p.waitForTimeout(500);const n=await p.evaluate(()=>window.N);
for(let i=0;i<n;i++){await p.evaluate(i=>show(i),i);await p.waitForTimeout(100);await p.screenshot({path:`carrusel-frases-${i+1}.jpg`,type:'jpeg',quality:93})}
await b.close()})();
