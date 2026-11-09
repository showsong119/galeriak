// node render.cjs video.html prefijo  → prefijo-sin-audio.mp4 (escenas en /tmp/tkr)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');const {spawn,execFileSync}=require('child_process');const fs=require('fs');
(async()=>{const [f,pre]=process.argv.slice(2);const D='/tmp/tkr/'+pre;fs.mkdirSync(D,{recursive:true});
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await b.newPage({viewport:{width:1080,height:1350}});
await p.goto('file://'+process.cwd()+'/'+f);await p.waitForTimeout(500);
const durs=await p.evaluate(()=>window.SCENES);const list=[];
for(let i=0;i<durs.length;i++){const n=Math.round(durs[i]*30),tmp=`${D}/s${i}.tmp.mp4`,fin=`${D}/s${i}.mp4`;
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-r','30',tmp],{stdio:['pipe','inherit','inherit']});
 for(let k=0;k<n;k++){await p.evaluate(([i,t])=>draw(i,t),[i,k/30]);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
 ff.stdin.end();const code=await new Promise(r=>ff.on('close',r));if(code!==0)throw new Error('ffmpeg '+i);
 fs.renameSync(tmp,fin);list.push(`file '${fin}'`);console.log(pre,'scene',i,n)}
fs.writeFileSync(`${D}/list.txt`,list.join('\n'));await b.close();
execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',`${D}/list.txt`,'-c','copy',`${pre}-sin-audio.mp4`]);console.log('ok',pre)})();
