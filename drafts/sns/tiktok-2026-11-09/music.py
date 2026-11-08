# python3 music.py salida.wav DUR "c1,c2,..." estilo(1|2)
import numpy as np, wave, sys
out_path=sys.argv[1]; DUR=float(sys.argv[2]); CUTS=[float(x) for x in sys.argv[3].split(',') if x]; style=int(sys.argv[4])
SR=44100; N=int(SR*DUR); out=np.zeros(N); rng=np.random.default_rng(style)
bpm=[0,124,112][style]; beat=60/bpm; bar=4*beat
chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]] if style==1 else [[52,55,59],[48,52,55],[55,59,62],[50,54,57]]
f=lambda m:440*2**((m-69)/12)
def add(sig,st):
    i=int(st*SR)
    if i>=N or i<0: return
    e=min(N,i+len(sig)); out[i:e]+=sig[:e-i]
def env(n,a=.005,d=.2):
    x=np.arange(n)/SR; return np.minimum(1,x/a)*np.exp(-x/d)
kx=np.arange(int(.35*SR))/SR; kick=np.sin(2*np.pi*(50+90*np.exp(-kx*30))*kx)*np.exp(-kx*9)
cn=int(.25*SR); clap=rng.standard_normal(cn)*env(cn,.002,.06)
hn=int(.06*SR); hat=np.diff(rng.standard_normal(hn+1))*env(hn,.001,.02)
for b in range(int(DUR/beat)+1):
    st=b*beat; ch=chords[int(st/bar)%4]
    if st>.1:
        add(kick*.9,st)
        if b%2: add(clap*.33,st)
        add(hat*.22,st+beat/2)
        if style==2: add(hat*.12,st+beat/4); add(hat*.12,st+3*beat/4)
    for k in range(2):
        n=int(beat/2*SR); x=np.arange(n)/SR; fr=f(ch[0]-12)
        add((2*((x*fr)%1)-1)*env(n,.005,.12)*.17,st+k*beat/2)
    for k in range(4):
        n=int(.22*SR); x=np.arange(n)/SR; fr=f(ch[(b*4+k)%3]+(12 if style==1 else 19 if k%2 else 12))
        add((np.sin(2*np.pi*fr*x)+.3*np.sin(4*np.pi*fr*x))*env(n,.002,.09)*.09,st+k*beat/4)
for s in np.arange(0,DUR,bar):
    ch=chords[int(round(s/bar))%4]; n=int(bar*SR); x=np.arange(n)/SR
    pad=sum(np.sin(2*np.pi*f(m)*x)+.5*np.sin(2*np.pi*f(m)*1.003*x) for m in ch)
    add(pad*np.minimum(1,x/.3)*np.minimum(1,(bar-x)/.3)*.025,s)
for c in CUTS:
    n=int(.4*SR); x=np.arange(n)/SR
    w=np.convolve(rng.standard_normal(n),np.ones(8)/8,'same')*np.sin(np.pi*x/.4)**2
    add(w*.22,c-.3)
fo=np.ones(N); k=int(1.5*SR); fo[-k:]=np.linspace(1,0,k); out*=fo
out=np.tanh(out*1.2); out/=np.max(np.abs(out))/.89
s=(out*32767).astype(np.int16)
with wave.open(out_path,'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.stack([s,s],1).tobytes())
