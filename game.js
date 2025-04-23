console.log('Loading game.js v11');

(() => {
  // DOM refs
  const c = document.getElementById('gameCanvas'),
        ctx = c.getContext('2d'),
        scoreEl = document.getElementById('score'),
        pctEl = document.getElementById('percent'),
        mulEl = document.getElementById('multiplier'),
        strEl = document.getElementById('streak'),
        msg = document.getElementById('message'),
        pauseBtn = document.getElementById('pauseButton'),
        audio = document.getElementById('gameAudio'),
        ov = document.getElementById('leaderboardOverlay'),
        fin = document.getElementById('finalScore'),
        initIn = document.getElementById('initials'),
        sub = document.getElementById('submitScore'),
        list = document.getElementById('leaderboardList'),
        close = document.getElementById('closeLeaderboard');

  // State
  let started=false, paused=false;
  let score=0, total=0, spawnID;
  let combo=1, streak=0;
  const notes=[], effects=[], texts=[];
  const sz=50, flash=0.1, part=0.5, txt=0.5, floatY=100;
  let dy, hitY;
  const lanes=[{x:0},{x:0},{x:0}];
  const cols=['#0ff','#f0f','#0f0'];

  // Resize + lanes
  const resize = () => {
    c.width = innerWidth; c.height = innerHeight;
    hitY = c.height - 100;
    lanes[0].x = c.width*0.25;
    lanes[1].x = c.width*0.50;
    lanes[2].x = c.width*0.75;
    dy = (hitY + sz) / ((60/135)*2*60);
  };
  window.addEventListener('resize',resize);
  resize();

  // Start/Pause
  function start() {
    started=true; paused=false;
    score=0; total=0; combo=1; streak=0;
    scoreEl.textContent='Score: 0';
    pctEl.textContent='0%';
    mulEl.textContent='x1';
    strEl.textContent='Streak: 0';
    msg.style.display='none';
    pauseBtn.style.display='block';
    audio.currentTime=0; audio.play().catch(console.warn);
    audio.onended = end;
    tickSpawn();
    spawnID = setInterval(tickSpawn, (60/135)*1000/4);
    draw();
  }
  function tickSpawn() {
    if(!started) return;
    if(Math.random()<0.5){ notes.push({y:-sz,lane:Math.floor(Math.random()*3)}); total++; updatePct(); }
  }
  function end(){
    started=false;
    clearInterval(spawnID);
    fin.textContent=`Score: ${score} (${pctEl.textContent})`;
    showBoard();
    ov.style.display='block';
  }
  function togglePause(e){
    e.stopPropagation();
    if(!started) return;
    paused = !paused;
    if(paused) {
      audio.pause(); clearInterval(spawnID);
      pauseBtn.textContent='Resume';
    } else {
      audio.play().catch(console.warn);
      spawnID = setInterval(tickSpawn,(60/135)*1000/4);
      pauseBtn.textContent='Pause';
      draw();
    }
  }
  pauseBtn.addEventListener('click',togglePause);

  // Input
  function tap(e){
    e.preventDefault();
    if(!started) start();
    else if(!paused){
      if(!hit(e)) resetCombo();
    }
  }
  c.addEventListener('pointerdown',tap,{passive:false});
  c.addEventListener('touchstart',tap,{passive:false});
  c.addEventListener('mousedown',tap);

  // Hit logic
  function hit(e){
    const rect=c.getBoundingClientRect(),
          x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left,
          tol=30;
    for(let i=notes.length-1;i>=0;i--){
      const n=notes[i], lx=lanes[n.lane].x;
      if(x>=lx-sz/2-tol && x<=lx+sz/2+tol &&
         n.y>=hitY-tol && n.y<=hitY+sz+tol){
        notes.splice(i,1);
        streak++;
        if(streak%4===0 && combo<8) combo++;
        const pts = tier(n.y) * combo;
        score+=pts;
        scoreEl.textContent=`Score: ${score}`;
        scoreEl.classList.add('pop');
        scoreEl.onanimationend=()=>scoreEl.classList.remove('pop');
        mulEl.textContent=`x${combo}`;
        strEl.textContent=`Streak: ${streak}`;
        updatePct();
        flashFx(n.lane,lx,hitY+sz/2);
        texts.push({txt:label(n.y),x:lx,y0:hitY-20,t:txt});
        return true;
      }
    }
    return false;
  }
  function resetCombo(){
    combo=1; streak=0;
    mulEl.textContent='x1';
    strEl.textContent='Streak: 0';
  }
  function tier(y){
    const d=Math.abs(y-hitY);
    if(d<5)    return 100;
    if(d<15)   return 80;
    if(d<30)   return 50;
    if(d<45)   return 20;
    return 10;
  }
  function label(y){
    const d=Math.abs(y-hitY);
    if(d<5)    return 'Perfect';
    if(d<15)   return 'Excellent';
    if(d<30)   return 'Great';
    if(d<45)   return 'Good';
    return 'Ok';
  }
  function updatePct(){
    const p=total?Math.round(score/(total*100)*100):0;
    pctEl.textContent=`${p}%`;
  }

  // Leaderboard stub
  function showBoard(){
    const art=[{i:'ALX',s:500,p:'50%'},{i:'BRN',s:650,p:'65%'},{i:'CER',s:800,p:'80%'}];
    const pPct=parseInt(pctEl.textContent,10),me={i:initIn.value||'YOU',s:score,p:pctEl.textContent};
    let b=art.slice();
    if(pPct>=85) b.splice(2,0,me); else b.push(me);
    const saved=JSON.parse(localStorage.getItem('leaderboard')||'[]');
    b=b.concat(saved);
    list.innerHTML='';
    b.slice(0,5).forEach(r=>{
      const li=document.createElement('li');
      li.textContent=`${r.i} - ${r.s} (${r.p})`;
      list.append(li);
    });
  }
  sub.addEventListener('click',()=>{
    const ii=initIn.value.toUpperCase().slice(0,3)||'---',
          rec={i:ii,s:score,p:pctEl.textContent},
          sv=JSON.parse(localStorage.getItem('leaderboard')||'[]');
    sv.unshift(rec);
    localStorage.setItem('leaderboard',JSON.stringify(sv.slice(0,10)));
    showBoard();
  });
  close.addEventListener('click',()=>ov.style.display='none');

  // Effects
  function flashFx(l,cx,cy){
    effects.push({lane:l,t:flash,parts:Array.from({length:8}).map(_=>{
      const a=Math.random()*Math.PI*2,s=100+Math.random()*100;
      return {x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:part,ci:l};
    })});
  }

  // Draw
  function draw(){
    if(paused) return;
    ctx.clearRect(0,0,c.width,c.height);

    // glow strings
    ctx.save();
    ctx.shadowColor=combo>4?'orange':'cyan';
    ctx.shadowBlur=combo*2;
    [4,2,1].forEach((w,i)=>{
      ctx.strokeStyle='#bbb';ctx.lineWidth=w;
      const x=lanes[i].x;
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke();
    });
    ctx.restore();

    // zones
    ctx.strokeStyle='#555';
    lanes.forEach(l=>ctx.strokeRect(l.x-sz/2,hitY,sz,sz));

    // notes
    notes.forEach(n=>{
      n.y+=dy;
      const x=lanes[n.lane].x;
      ctx.fillStyle=cols[n.lane];
      const w=sz,h=sz*1.2;
      ctx.beginPath();
      ctx.moveTo(x,n.y);
      ctx.lineTo(x-w/2,n.y+h*0.4);
      ctx.quadraticCurveTo(x,n.y+h,x+w/2,n.y+h*0.4);
      ctx.closePath();ctx.fill();
    });
    // clean misses
    for(let i=notes.length-1;i>=0;i--){
      if(notes[i].y>c.height){
        notes.splice(i,1);
        resetCombo();
      }
    }

    const dt=1/60;
    // effects
    effects.forEach((g,gi)=>{
      const a=g.t/flash, x=lanes[g.lane].x;
      ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#fff';
      ctx.fillRect(x-sz/2,hitY,sz,sz);ctx.restore();
      g.t-=dt;
      g.parts.forEach(p=>{
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.t-=dt;
        ctx.save();ctx.globalAlpha=p.t/part;ctx.fillStyle=cols[p.ci];
        ctx.fillRect(p.x-3,p.y-3,6,6);ctx.restore();
      });
      g.parts=g.parts.filter(p=>p.t>0);
      if(g.t<=0&&g.parts.length===0) effects.splice(gi,1);
    });

    // floating texts
    texts.forEach((t,ti)=>{
      const prog=1-(t.t/textDur),
            y=t.y0-(floatY*prog),
            a=t.t/textDur;
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
})();
