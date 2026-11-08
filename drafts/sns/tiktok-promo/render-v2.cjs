const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+process.cwd()+'/video-v2.html');await p.waitForTimeout(500);
const durs=await p.evaluate(()=>window.SCENES);const list=[];
for(let i=0;i<durs.length;i++){const n=Math.round(durs[i]*30),tmp=`v2scene${i}.tmp.mp4`;
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-r','30',tmp],{stdio:['pipe','inherit','inherit']});
 for(let f=0;f<n;f++){await p.evaluate(([i,t])=>draw(i,t),[i,f/30]);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
 ff.stdin.end();const code=await new Promise(r=>ff.on('close',(c,s)=>{console.log('exit',c,s);r(c)}));if(code!==0)throw new Error('ffmpeg '+i);
 fs.renameSync(tmp,`v2scene${i}.mp4`);list.push(`file 'v2scene${i}.mp4'`);console.log('scene',i,n,'frames')}
fs.writeFileSync('v2list.txt',list.join('\n'));await b.close()})();
