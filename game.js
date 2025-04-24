console.log('Loading game.js v28');

// expose globally
window.startGame = startGame;

// state
let started=false, paused=false;
let score=0, total=0, spawnID, stopID;
let streak=0, combo=1, maxCombo=1, maxStreak=0;
let levelTimer=0, activeSlide=null;

const notes   = [], effects = [], texts = [];
const sz        = 50,
      flashDur  = 0.1,
      partLife  = 0.7,
      textDur   = 0.5,
      floatDist = 100;

const actualBPM = 169,
      effBPM    = actualBPM/2,
      spawnProb = 0.45,
      slideProb = 0.15,
      minSlide  = 120,
      maxSlide  = 200,
      travelBeats=4,
      colors    = ['#0ff','#f0f','#0f0'];

let dy, hitY;
const lanes=[{}, {}, {}];

// DOM refs
const canvas   = document.getElementById('gameCanvas'),
      ctx      = canvas.getContext('2d'),
      scoreEl  = document.getElementById('score'),
      pctEl    = document.getElementById('percent'),
      mulEl    = document.getElementById('multiplier'),
      strEl    = document.getElementById('streak'),
      msgEl    = document.getElementById('message'),
      pauseBtn = document.getElementById('pauseButton'),
      audio    = document.getElementById('gameAudio'),
      endOv    = document.getElementById('endOverlay'),
      starsEl  = document.getElementById('stars'),
      fsEl     = document.getElementById('finalScore'),
      fpEl     = document.getElementById('finalPercent'),
      mcEl     = document.getElementById('finalMaxCombo'),
      lsEl     = document.getElementById('finalStreak'),
      restart  = document.getElementById('restartBtn'),
      partDiv  = document.getElementById('particles');

window.addEventListener('resize', resize);
canvas.addEventListener('pointerdown', onDown, {passive:false});
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup',   onUp);
pauseBtn.addEventListener('click', togglePause);
restart.addEventListener('click', startGame);
audio.onended = finishGame;

resize();

function resize(){
  canvas.width  = innerWidth;
  canvas.height = innerHeight;
  hitY          = canvas.height - 100;
  lanes[0].x    = innerWidth*0.25;
  lanes[1].x    = innerWidth*0.50;
  lanes[2].x    = innerWidth*0.75;
  const frames = (60/effBPM)*travelBeats*60;
  dy = (hitY+sz)/frames;
}

function startGame(){
  // clear any old spawners
  clearInterval(spawnID);
  clearTimeout(stopID);

  started=true; paused=false;
  score=0; total=0; streak=0; combo=1; maxCombo=1; maxStreak=0;
  levelTimer=0; activeSlide=null;
  notes.length=0; effects.length=0; texts.length=0;
  scoreEl.textContent='Score: 0';
  pctEl.textContent  ='0%';
  mulEl.textContent  ='x1';
  strEl.textContent  ='Streak: 0';
  msgEl.style.display='none';
  pauseBtn.style.display='block';
  endOv.style.display='none';
  partDiv.innerHTML='';

  audio.currentTime=0;
  audio.play().catch(()=>{});
  spawnNote();
  spawnID = setInterval(spawnNote,(60/effBPM)*1000/4);
  stopID  = setTimeout(()=>clearInterval(spawnID),144000);
  requestAnimationFrame(draw);
}

function togglePause(){
  if(!started) return;
  paused = !paused;
  if(paused){
    audio.pause(); clearInterval(spawnID); clearTimeout(stopID);
    pauseBtn.textContent='Resume';
  } else {
    audio.play().catch(()=>{});
    spawnID = setInterval(spawnNote,(60/effBPM)*1000/4);
    stopID  = setTimeout(()=>clearInterval(spawnID),144000 - audio.currentTime*1000);
    pauseBtn.textContent='Pause';
    requestAnimationFrame(draw);
  }
}

function spawnNote(){
  if(!started) return;
  if(Math.random()<spawnProb){
    const lane   = Math.floor(Math.random()*3),
          isSlide= Math.random()<slideProb;
    // prevent any spawn on an active slide’s lanes
    if(activeSlide && (lane===activeSlide.lane || (isSlide && (getTarget(lane)===activeSlide.lane || getTarget(lane)===activeSlide.target))))
      return;

    if(isSlide){
      const target   = getTarget(lane),
            slideLen = minSlide + Math.random()*(maxSlide-minSlide);
      // also block if other notes occupy those lanes
      if(notes.some(n=>n.lane===lane||n.lane===target||(n.type==='slide'&&(n.target===lane||n.target===target))))
        return;
      notes.push({ y:-sz, lane, type:'slide', target, tapped:false, slideLen });
    } else {
      notes.push({ y:-sz, lane, type:'tap' });
    }
    total++; updatePct();
  }
}
function getTarget(l){ return l===1? (Math.random()<0.5?0:2) : (l===0?1:1); }

function finishGame(){
  started=false; clearInterval(spawnID); clearTimeout(stopID);
  const raw = total?Math.round(score/(total*100)*100):0,
        pct = Math.min(100,raw);

  let stars=Math.floor(pct/20), rem=(pct%20)/20;
  if(rem>=0.75) stars++; else if(rem>=0.25) stars+=0.5;
  stars=Math.min(5,stars);
  let sOut='';
  for(let i=1;i<=5;i++){
    sOut+= stars>=i? '★' : (stars>=i-0.5? '⯪':'☆');
  }
  starsEl.textContent=sOut;

  fsEl.textContent=`Score: ${score}`;
  fpEl.textContent=`Hit Rate: ${pct}%`;
  mcEl.textContent=`Max Combo: ${maxCombo}x`;
  lsEl.textContent=`Longest Streak: ${maxStreak}`;
  endOv.style.display='flex';

  for(let i=0;i<40;i++){
    const p=document.createElement('div');
    p.className='p';
    const a=Math.random()*2*Math.PI, d=120+Math.random()*80;
    p.style.left='50%'; p.style.top='20%';
    p.style.setProperty('--dx',Math.cos(a)*d+'px');
    p.style.setProperty('--dy',Math.sin(a)*d+'px');
    partDiv.appendChild(p);
    setTimeout(()=>p.remove(),1200);
  }
}

function onDown(e){
  e.preventDefault();
  const r=canvas.getBoundingClientRect(), x=e.clientX-r.left, tol=30;
  if(!started) return startGame();
  if(paused)  return;

  for(let i=notes.length-1;i>=0;i--){
    const n=notes[i];
    if(n.type==='slide' && !n.tapped){
      const lx=lanes[n.lane].x;
      if(Math.hypot(x-lx,n.y-hitY)<tol){
        n.tapped=true; award(n);
        activeSlide=n;
        activeSlide.dragPos={ x:lx, y:n.y };
        return;
      }
    }
  }
  if(!handleTap(x,tol)){
    resetStreak(); updatePct();
  }
}

function onMove(e){
  if(!activeSlide) return;
  const r=canvas.getBoundingClientRect(), x=e.clientX-r.left;
  const n=activeSlide, sx=lanes[n.lane].x, tx=lanes[n.target].x;
  let t=(x-sx)/(tx-sx||1); t=Math.max(0,Math.min(1,t));
  activeSlide.dragPos={ x:sx+(tx-sx)*t, y:n.y-n.slideLen*t };
  if(t>0.8){
    award(n);
    notes.splice(notes.indexOf(n),1);
    activeSlide=null;
  }
}

function onUp(){
  if(activeSlide){
    resetStreak(); updatePct();
    const i=notes.indexOf(activeSlide);
    if(i>=0) notes.splice(i,1);
    activeSlide=null;
  }
}

function handleTap(x,tol){
  for(let i=notes.length-1;i>=0;i--){
    const n=notes[i], lx=lanes[n.lane].x;
    if(n.type==='tap' && Math.abs(x-lx)<tol && Math.abs(n.y-hitY)<tol){
      award(n);
      notes.splice(i,1);
      return true;
    }
  }
  return false;
}

function award(n){
  streak++; maxStreak=Math.max(maxStreak,streak);
  const oldC=combo;
  combo=Math.min(8,Math.floor(streak/4)+1);
  maxCombo=Math.max(maxCombo,combo);
  if(combo>oldC) levelTimer=1.0;

  const base=getBase(n.y), pts=base*combo;
  score+=pts;
  scoreEl.textContent=`Score: ${score}`;
  scoreEl.classList.add('pop');
  scoreEl.onanimationend=()=>scoreEl.classList.remove('pop');
  mulEl.textContent=`x${combo}`;
  strEl.textContent=`Streak: ${streak}`;
  updatePct();

  flashFx(n.lane,lanes[n.lane].x,hitY+sz/2);

  if(n.type==='slide'){
    for(let i=0;i<30;i++){
      const p=document.createElement('div');
      p.className='p';
      const a=Math.random()*2*Math.PI, d=150+Math.random()*100;
      p.style.left=`${lanes[n.target].x}px`;
      p.style.top=`${hitY-n.slideLen}px`;
      p.style.setProperty('--dx',Math.cos(a)*d+'px');
      p.style.setProperty('--dy',Math.sin(a)*d+'px');
      partDiv.appendChild(p);
      setTimeout(()=>p.remove(),1400);
    }
  }

  texts.push({ txt:getLabel(n.y), x:lanes[n.lane].x, y0:hitY-20, t:textDur });
}

function resetStreak(){
  streak=0; combo=1;
  mulEl.textContent='x1';
  strEl.textContent='Streak: 0';
}

function getBase(y){
  const d=Math.abs(y-hitY);
  if(d<5)   return 100;
  if(d<15)  return 80;
  if(d<30)  return 50;
  if(d<45)  return 20;
  return 10;
}
function getLabel(y){
  const d=Math.abs(y-hitY);
  if(d<5)    return 'Perfect';
  if(d<15)   return 'Excellent';
  if(d<30)   return 'Great';
  if(d<45)   return 'Good';
  return 'Ok';
}

function updatePct(){
  const raw= total?Math.round(score/(total*100)*100):0,
        p  = Math.min(100,raw);
  pctEl.textContent=`${p}%`;
}

function flashFx(l,cx,cy){
  effects.push({
    lane:l, t:flashDur,
    parts:Array.from({length:8}).map(_=>{
      const a=Math.random()*2*Math.PI, s=120+Math.random()*80;
      return {x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:partLife,ci:l};
    })
  });
}

function draw(){
  if(paused) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const dt=1/60;

  if(levelTimer>0){
    const H=100, t=levelTimer, base=canvas.height;
    const g=ctx.createLinearGradient(0,base-H,0,base);
    g.addColorStop(0,`rgba(255,165,0,${t})`);
    g.addColorStop(0.5,`rgba(255,69,0,${t})`);
    g.addColorStop(1,`rgba(0,0,0,0)`);
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(0,base-H*(0.3+0.2*Math.sin(Date.now()/200)));
    for(let x=20;x<=canvas.width;x+=20){
      const s=Math.sin(x/20+Date.now()/300);
      ctx.lineTo(x,base-H*(0.3+0.2*s));
    }
    ctx.lineTo(canvas.width,base);
    ctx.lineTo(0,base);
    ctx.closePath(); ctx.fill();
    levelTimer=Math.max(0,t-dt);
  }

  ctx.save();
  ctx.shadowColor=combo>4?'orange':'cyan';
  ctx.shadowBlur =combo*8;
  [4,2,1].forEach((w,i)=>{
    ctx.strokeStyle='#bbb';ctx.lineWidth=w;
    ctx.beginPath();ctx.moveTo(lanes[i].x,0);ctx.lineTo(lanes[i].x,canvas.height);ctx.stroke();
  });
  ctx.restore();

  ctx.strokeStyle='#555';
  lanes.forEach(l=>{
    const ex=levelTimer>0?10:0;
    ctx.strokeRect(l.x-(sz+ex)/2,hitY-ex/2,sz+ex,sz+ex);
  });

  notes.forEach(n=>{
    n.y+=dy;
    const x0=lanes[n.lane].x,y0=n.y,w=sz,h=sz*1.2;
    if(n.type==='tap'){
      ctx.fillStyle=colors[n.lane];
      ctx.beginPath();
      ctx.moveTo(x0,y0);
      ctx.lineTo(x0-w/2,y0+h*0.4);
      ctx.quadraticCurveTo(x0,y0+h,x0+w/2,y0+h*0.4);
      ctx.closePath();ctx.fill();
    } else if(n!==activeSlide){
      const x1=lanes[n.target].x,
            y1=y0-n.slideLen;
      ctx.strokeStyle=colors[n.lane];
      ctx.lineWidth=4;
      ctx.beginPath();
      ctx.moveTo(x0,y0+h*0.5);
      ctx.lineTo(x1,y1+h*0.5);
      ctx.stroke();
      [[x0,y0],[x1,y1]].forEach((pt,idx)=>{
        ctx.fillStyle= idx? colors[n.target]:colors[n.lane];
        ctx.beginPath();
        ctx.moveTo(pt[0],pt[1]);
        ctx.lineTo(pt[0]-w/2,pt[1]+h*0.4);
        ctx.quadraticCurveTo(pt[0],pt[1]+h,pt[0]+w/2,pt[1]+h*0.4);
        ctx.closePath();ctx.fill();
      });
    }
  });

  if(activeSlide && activeSlide.dragPos){
    const {x,y}=activeSlide.dragPos,w=sz,h=sz*1.2;
    ctx.save();
    ctx.strokeStyle='#ff0';ctx.lineWidth=8;ctx.shadowColor='#ff0';ctx.shadowBlur=20;
    ctx.beginPath();
    ctx.moveTo(lanes[activeSlide.lane].x,hitY+h*0.5);
    ctx.lineTo(x,y+h*0.5);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle='#ff0';
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x-w/2,y+h*0.4);
    ctx.quadraticCurveTo(x,y+h,x+w/2,y+h*0.4);
    ctx.closePath();ctx.fill();
  }

  for(let i=notes.length-1;i>=0;i--){
    if(notes[i].y>canvas.height){
      notes.splice(i,1);
      resetStreak(); updatePct();
    }
  }

  effects.forEach((g,gi)=>{
    const a=g.t/flashDur, x=lanes[g.lane].x;
    ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#fff';
    ctx.fillRect(x-sz/2,hitY,sz,sz);ctx.restore();
    g.t-=dt;
    g.parts.forEach(p=>{
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt;
      ctx.save();
      ctx.globalAlpha=p.t/partLife;
      ctx.fillStyle=colors[p.ci];
      ctx.fillRect(p.x-3,p.y-3,6,6);
      ctx.restore();
    });
    g.parts=g.parts.filter(p=>p.t>0);
    if(g.t<=0&&g.parts.length===0)effects.splice(gi,1);
  });

  texts.forEach((t,ti)=>{
    const prog=1-(t.t/textDur),
          y   = t.y0 - floatDist*prog,
          a   = t.t/textDur;
    ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.font='20px sans-serif';
    let fill='#fff';
    if(t.txt==='Perfect') fill='yellow';
    else if(t.txt==='Excellent') fill='magenta';
    ctx.fillStyle=fill;ctx.fillText(t.txt,t.x,y);ctx.restore();
    t.t-=dt;
    if(t.t<=0) texts.splice(ti,1);
  });

  requestAnimationFrame(draw);
}
