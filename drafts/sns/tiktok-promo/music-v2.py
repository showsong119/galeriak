import numpy as np, wave, sys
SR=44100; DUR=25.0; N=int(SR*DUR); t=np.arange(N)/SR
out=np.zeros(N)
bpm=120; beat=60/bpm
def add(sig,start):
    i=int(start*SR)
    if i>=N: return
    e=min(N,i+len(sig)); out[i:e]+=sig[:e-i]
def env(n,a=0.005,d=0.2):
    x=np.arange(n)/SR; return np.minimum(1,x/a)*np.exp(-x/d)
# kick
kn=int(.35*SR); kx=np.arange(kn)/SR
kick=np.sin(2*np.pi*(50+90*np.exp(-kx*30))*kx)*np.exp(-kx*9)
# clap / snare
rng=np.random.default_rng(1)
cn=int(.25*SR); clap=rng.standard_normal(cn)*env(cn,.002,.06)
hn=int(.06*SR); hat=np.diff(rng.standard_normal(hn+1))*env(hn,.001,.02)
# chords Am F C G (2 bars each? 1 bar = 4 beats)
chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]
f=lambda m:440*2**((m-69)/12)
bar=4*beat
nb=int(DUR/beat)+1
for b in range(nb):
    st=b*beat
    if st<0.15: continue
    if st< 2.8 and b%2: pass
    add(kick*0.9,st)
    if b%2==1: add(clap*0.35,st)
    add(hat*0.25,st+beat/2)
    ch=chords[int(st/bar)%4]
    # bass on 8ths
    for k in range(2):
        n=int(beat/2*SR); x=np.arange(n)/SR
        fr=f(ch[0]-12)
        bs=(2*((x*fr)%1)-1)*env(n,.005,.12)
        add(bs*0.18,st+k*beat/2)
    # pluck arp 16ths
    for k in range(4):
        n=int(.22*SR); x=np.arange(n)/SR; fr=f(ch[(b*4+k)%3]+12)
        pl=(np.sin(2*np.pi*fr*x)+.3*np.sin(4*np.pi*fr*x))*env(n,.002,.09)
        add(pl*0.10,st+k*beat/4)
# pad
for s in np.arange(0,DUR,bar):
    ch=chords[int(round(s/bar))%4]; n=int(bar*SR); x=np.arange(n)/SR
    pad=sum(np.sin(2*np.pi*f(m)*x)+.5*np.sin(2*np.pi*f(m)*1.003*x) for m in ch)
    pad*=np.minimum(1,x/.3)*np.minimum(1,(bar-x)/.3)
    add(pad*0.025,s)
# whooshes at cuts
for c in [2.8,6.4,10.0,14.2,17.6,21.0]:
    n=int(.4*SR); x=np.arange(n)/SR
    w=rng.standard_normal(n); w=np.convolve(w,np.ones(8)/8,'same')*np.sin(np.pi*x/.4)**2
    add(w*0.25,c-.3)
# fade out last 1.5s
fo=np.ones(N); k=int(1.5*SR); fo[-k:]=np.linspace(1,0,k); out*=fo
out=np.tanh(out*1.2); out/=np.max(np.abs(out))/0.89
s=(out*32767).astype(np.int16); st=np.stack([s,s],1)
with wave.open(sys.argv[1],'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
