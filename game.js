console.log('Loading game.js v33 (speed+fade+fixpct+flame)');

// expose globally
window.startGame = startGame;

// state
let started=false, paused=false, hits=0;
let score=0, total=0, spawnID, stopID;
let streak=0, combo=1, maxCombo=1, maxStreak=0;
let levelTimer=0;

const notes   = [], effects = [], texts = [];
const sz        = 50,
      flashDur  = 0.1,
      partLife  = 0.7,
      textDur   = 0.5,
      floatDist = 100;

const actualBPM   = 169,
      effBPM      = actualBPM/2,
      travelBeats = 4,
      speedMult   = 1.32,
      spawnProb   = 0.45,
      colors      = ['#0ff','#f0f','#0f0'];

let hitY;
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
canvas.addEventListener('pointerdown', onTap, {passive:false});
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
}

function startGame(){
  clearInterval(spawnID);
  clearTimeout(stopID);

  started=true; paused=false; hits=0;
  score=0; total=0; streak=0; combo=1; maxCombo=1; maxStreak=0; levelTimer=0;
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
    const lane = Math.floor(Math.random()*3);
    const frames = (60/effBPM)*travelBeats*60;
    const dy = ((hitY + sz)/frames) * speedMult;
    notes.push({ y:-sz, lane, dy });
    total++;
    updatePct();
  }
}

function finishGame(){
  started=false;
  clearInterval(spawnID);
  clearTimeout(stopID);

  const p = total ? Math.round(hits/total*100) : 0;

  // only full stars, no half-stars or placeholders
  let sOut = '';
  for(let i=1; i<=5; i++){
    sOut += (p >= i*20) ? '★' : ' ';
  }
  starsEl.textContent = sOut;

  fsEl.textContent=`Score: ${score}`;
  fpEl.textContent=`Hit Rate: ${p}%`;
  mcEl.textContent=`Max Combo: ${maxCombo}x`;
  lsEl.textContent=`Longest Streak: ${maxStreak}`;
  endOv.style.display='flex';

  for(let i=0;i<40;i++){
    const pdiv=document.createElement('div');
    pdiv.className='p';
    const a=Math.random()*2*Math.PI, d=120+Math.random()*80;
    pdiv.style.left='50%'; pdiv.style.top='20%';
    pdiv.style.setProperty('--dx',Math.cos(a)*d+'px');
    pdiv.style.setProperty('--dy',Math.sin(a)*d+'px');
    partDiv.appendChild(pdiv);
    setTimeout(()=>pdiv.remove(),1200);
  }
}

function onTap(e){
  e.preventDefault();
  const r=canvas.getBoundingClientRect(),
        x=e.clientX-r.left,
        tol=30;
  if(!started) return startGame();
  if(paused) return;

  for(let i=notes.length-1;i>=0;i--){
    const n=notes[i], lx=lanes[n.lane].x;
    if(Math.abs(x-lx)<=tol && Math.abs(n.y-hitY)<=tol){
      const base=getBase(n.y),
            pts=base*combo;
      score+=pts;
      hits++;
      const oldC=combo;
      streak++;
      combo=Math.min(8,Math.floor(streak/4)+1);
      maxCombo=Math.max(maxCombo,combo);
      maxStreak=Math.max(maxStreak,streak);
      if(combo>oldC) levelTimer=1.0;

      scoreEl.textContent=`Score: ${score}`;
      scoreEl.classList.add('pop');
      scoreEl.onanimationend=()=>scoreEl.classList.remove('pop');
      mulEl.textContent=`x${combo}`;
      strEl.textContent=`Streak: ${streak}`;
      updatePct();

      flashFx(n.lane, lanes[n.lane].x, hitY+sz/2);
      texts.push({ txt:getLabel(n.y), x:lanes[n.lane].x, y0:hitY-20, t:textDur });
      notes.splice(i,1);
      return;
    }
  }
  // miss
  streak=0; combo=1;
  mulEl.textContent='x1';
  strEl.textContent='Streak: 0';
  updatePct();
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
  const p = total ? Math.round(hits/total*100) : 0;
  pctEl.textContent = `${p}%`;
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
  const dt = 1/60;

  // level-up flame at bottom
  if(levelTimer>0){
    const H=80, t=levelTimer, base=canvas.height;
    const g=ctx.createLinearGradient(0,base-H,0,base);
    g.addColorStop(0, `rgba(255,165,0,${t})`);
    g.addColorStop(0.5, `rgba(255,69,0,${t})`);
    g.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, base);
    ctx.lineTo(0, base-H);
    for(let x=0; x<=canvas.width; x+=20){
      const s = 0.3 + 0.2 * Math.sin(x/20 + Date.now()/200);
      ctx.lineTo(x, base - H * s);
    }
    ctx.lineTo(canvas.width, base);
    ctx.closePath();
    ctx.fill();
    levelTimer = Math.max(0, levelTimer - dt);
  }

  // strings glow
  ctx.save();
  ctx.shadowColor = combo>4 ? 'orange' : 'cyan';
  ctx.shadowBlur  = combo*8;
  [4,2,1].forEach((w,i)=>{
    ctx.strokeStyle='#bbb'; ctx.lineWidth=w;
    ctx.beginPath(); ctx.moveTo(lanes[i].x,0); ctx.lineTo(lanes[i].x,canvas.height); ctx.stroke();
  });
  ctx.restore();

  // target zones
  ctx.strokeStyle='#555';
  lanes.forEach(l=>{
    ctx.strokeRect(l.x-sz/2, hitY, sz, sz);
  });

  // notes with fade-in
  notes.forEach(n=>{
    n.y += n.dy;
    const mid = hitY/2;
    let alpha = n.y < mid ? n.y/mid : 1;
    alpha = Math.max(0, Math.min(1, alpha));
    ctx.save();
    ctx.globalAlpha = alpha;
    const x=lanes[n.lane].x, y=n.y, w=sz, h=sz*1.2;
    ctx.fillStyle=colors[n.lane];
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x-w/2,y+h*0.4);
    ctx.quadraticCurveTo(x,y+h,x+w/2,y+h*0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // remove off-screen
  for(let i=notes.length-1;i>=0;i--){
    if(notes[i].y>canvas.height){
      notes.splice(i,1);
      streak=0; combo=1;
      mulEl.textContent='x1';
      strEl.textContent='Streak: 0';
      updatePct();
    }
  }

  // flashes & particles
  effects.forEach((g,gi)=>{
    const a=g.t/flashDur, x=lanes[g.lane].x;
    ctx.save(); ctx.globalAlpha=a; ctx.fillStyle='#fff';
    ctx.fillRect(x-sz/2,hitY,sz,sz); ctx.restore();
    g.t -= dt;
    g.parts.forEach(p=>{
      p.x += p.vx*dt; p.y += p.vy*dt; p.t -= dt;
      ctx.save();
      ctx.globalAlpha = p.t/partLife;
      ctx.fillStyle   = colors[p.ci];
      ctx.fillRect(p.x-3,p.y-3,6,6);
      ctx.restore();
    });
    g.parts = g.parts.filter(p=>p.t>0);
    if(g.t<=0 && g.parts.length===0) effects.splice(gi,1);
  });

  // floating text
  texts.forEach((t,ti)=>{
    const prog = 1-(t.t/textDur),
          y    = t.y0 - floatDist*prog,
          a    = t.t/textDur;
    ctx.save(); ctx.globalAlpha=a; ctx.textAlign='center'; ctx.font='20px sans-serif';
    let fill='#fff';
    if(t.txt==='Perfect')   fill='yellow';
    else if(t.txt==='Excellent') fill='magenta';
    ctx.fillStyle=fill;
    ctx.fillText(t.txt,t.x,y);
    ctx.restore();
    t.t -= dt;
    if(t.t<=0) texts.splice(ti,1);
  });

  requestAnimationFrame(draw);
}
