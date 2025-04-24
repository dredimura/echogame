console.log('Loading game.js v20');

(() => {
  const canvas    = document.getElementById('gameCanvas'),
        ctx       = canvas.getContext('2d'),
        scoreEl   = document.getElementById('score'),
        pctEl     = document.getElementById('percent'),
        mulEl     = document.getElementById('multiplier'),
        strEl     = document.getElementById('streak'),
        msgEl     = document.getElementById('message'),
        pauseBtn  = document.getElementById('pauseButton'),
        audio     = document.getElementById('gameAudio'),
        endOv     = document.getElementById('endOverlay'),
        starsEl   = document.getElementById('stars'),
        fsEl      = document.getElementById('finalScore'),
        fpEl      = document.getElementById('finalPercent'),
        mcEl      = document.getElementById('finalMaxCombo'),
        lsEl      = document.getElementById('finalStreak'),
        restart   = document.getElementById('restartBtn');

  let started=false, paused=false,
      score=0, total=0, spawnID,
      streak=0, combo=1, maxCombo=1, maxStreak=0,
      levelTimer=0, holdsInProgress={};

  const notes=[], effects=[], texts=[];
  const sz=50, flashDur=0.1, partLife=0.5, textDur=0.5, floatDist=100;
  const actualBPM    = 169,
        effBPM       = actualBPM/2,
        spawnProb    = 0.45,
        colors       = ['#0ff','#f0f','#0f0'];
  let dy, hitY;
  const lanes=[{}, {}, {}];

  function resize(){
    canvas.width  = innerWidth;
    canvas.height = innerHeight;
    hitY          = canvas.height - 100;
    lanes[0].x    = innerWidth * 0.25;
    lanes[1].x    = innerWidth * 0.50;
    lanes[2].x    = innerWidth * 0.75;
    dy = (hitY + sz) / ((60/effBPM)*2*60);
  }
  window.addEventListener('resize', resize);
  resize();

  function startGame(){
    // reset
    started=true; paused=false;
    score=0; total=0; streak=0; combo=1; maxCombo=1; maxStreak=0; levelTimer=0;
    notes.length=0; effects.length=0; texts.length=0; holdsInProgress={};
    scoreEl.textContent='Score: 0';
    pctEl.textContent  ='0%';
    mulEl.textContent  ='x1';
    strEl.textContent  ='Streak: 0';
    msgEl.style.display='none';
    pauseBtn.style.display='block';
    endOv.style.display='none';

    audio.currentTime=0; audio.play().catch(console.warn);
    audio.onended = finishGame;
    spawnNote();
    spawnID = setInterval(spawnNote, (60/effBPM)*1000/4);
    requestAnimationFrame(draw);
  }

  // pause/resume
  function togglePause(e){
    e.stopPropagation();
    if(!started) return;
    paused = !paused;
    if(paused){
      audio.pause(); clearInterval(spawnID);
      pauseBtn.textContent='Resume';
    } else {
      audio.play().catch(console.warn);
      spawnID = setInterval(spawnNote, (60/effBPM)*1000/4);
      pauseBtn.textContent='Pause';
      requestAnimationFrame(draw);
    }
  }
  pauseBtn.addEventListener('click', togglePause);

  // spawn normal or hold note
  function spawnNote(){
    if(!started) return;
    if(Math.random()<spawnProb){
      const lane = Math.floor(Math.random()*3);
      // 20% holds
      if(Math.random()<0.2){
        // hold length = 2 beats
        const lengthPx = dy * ((60/effBPM)*2*60);
        notes.push({ y:-sz, lane, type:'hold', len:lengthPx });
      } else {
        notes.push({ y:-sz, lane, type:'tap' });
      }
      total++;
      updatePct();
    }
  }

  // finish
  function finishGame(){
    started=false; clearInterval(spawnID);
    // compute percent
    const raw = total?Math.round(score/(total*100)*100):0,
          pct = Math.min(100, raw);
    // compute stars
    let stars = Math.floor(pct/20); // each 20% = 1 star
    const rem = (pct%20)/20;
    if(rem>=0.75) stars+=1;
    else if(rem>=0.25) stars+=0.5;
    stars = Math.min(5, stars);
    // render stars
    let out='';
    for(let i=1;i<=5;i++){
      if(stars>=i) out+='★';
      else if(stars>=i-0.5) out+='☆'.replace('☆','⯪'); // half-star char
      else out+='☆';
    }
    starsEl.textContent=out;

    // show metrics
    fsEl.textContent        = `Score: ${score}`;
    fpEl.textContent        = `Hit Rate: ${pct}%`;
    mcEl.textContent        = `Max Combo: ${maxCombo}x`;
    lsEl.textContent        = `Longest Streak: ${maxStreak}`;
    endOv.style.display='flex';
  }

  restart.addEventListener('click', startGame);

  // handle taps & holds
  canvas.addEventListener('pointerdown', e=>{
    e.preventDefault();
    if(!started) return startGame();
    if(paused) return;
    const rect=canvas.getBoundingClientRect(),
          x   = e.clientX-rect.left,
          tol = 30*1.1;
    // check hold start
    for(let i=notes.length-1;i>=0;i--){
      const n=notes[i], lx=lanes[n.lane].x;
      if(n.type==='hold' &&
         x>=lx-tol && x<=lx+tol &&
         n.y>=hitY-tol && n.y<=hitY+tol
      ){
        // begin hold
        holdsInProgress[n.lane]=n;
        return;
      }
    }
    // else check tap
    if(!handleTap(x, tol)) resetStreak();
  }, {passive:false});

  canvas.addEventListener('pointerup', e=>{
    // finish any holds
    Object.keys(holdsInProgress).forEach(lk=>{
      const n = holdsInProgress[lk];
      // if tail is still in zone or passed, full hold achieved
      const tailY = n.y + n.len;
      if(tailY >= hitY-10){
        award(n);
      } else {
        resetStreak();
      }
      // remove that note
      const idx = notes.indexOf(n);
      if(idx>=0) notes.splice(idx,1);
      delete holdsInProgress[lk];
    });
  });

  // tap logic
  function handleTap(x, tol){
    for(let i=notes.length-1;i>=0;i--){
      const n=notes[i], lx=lanes[n.lane].x;
      if(n.type==='tap' &&
         x>=lx-tol && x<=lx+tol &&
         n.y>=hitY-tol && n.y<=hitY+tol
      ){
        award(n);
        notes.splice(i,1);
        return true;
      }
    }
    return false;
  }

  function award(n){
    // streak/combo
    streak++;
    maxStreak = Math.max(maxStreak, streak);
    combo = Math.min(8, Math.floor(streak/4)+1);
    maxCombo = Math.max(maxCombo, combo);
    // level-up effect
    if(combo>Math.floor((streak-1)/4)+1) levelTimer=1.0;
    // score = base * combo
    const base = getBase(n.y),
          pts  = base * combo;
    score += pts;
    scoreEl.textContent = `Score: ${score}`;
    scoreEl.classList.add('pop');
    scoreEl.onanimationend = ()=>scoreEl.classList.remove('pop');
    mulEl.textContent = `x${combo}`;
    strEl.textContent = `Streak: ${streak}`;
    updatePct();
    flashFx(n.lane, lanes[n.lane].x, hitY+sz/2);
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
    const raw = total ? Math.round(score/(total*100)*100) : 0;
    const p   = Math.min(100, raw);
    pctEl.textContent=`${p}%`;
  }

  function flashFx(l, cx, cy){
    effects.push({
      lane: l, t:flashDur,
      parts: Array.from({length:8}).map(_=>{
        const a=Math.random()*2*Math.PI, s=100+Math.random()*100;
        return {x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:partLife,ci:l};
      })
    });
  }

  function draw(){
    if(paused) return;
    const dt=1/60;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // wavy flame on level-up
    if(levelTimer>0){
      const H=100, t=levelTimer, base=canvas.height;
      const grad=ctx.createLinearGradient(0,base-H,0,base);
      grad.addColorStop(0,`rgba(255,165,0,${t})`);
      grad.addColorStop(0.5,`rgba(255,69,0,${t})`);
      grad.addColorStop(1,`rgba(0,0,0,0)`);
      ctx.fillStyle=grad;
      ctx.beginPath();
      ctx.moveTo(0,base);
      ctx.lineTo(0,base-H*(0.3+0.2*Math.sin(Date.now()/200)));
      const step=20;
      for(let x=step;x<=canvas.width;x+=step){
        const s=Math.sin(x/step+Date.now()/300);
        ctx.lineTo(x,base-H*(0.3+0.2*s));
      }
      ctx.lineTo(canvas.width,base);
      ctx.closePath();
      ctx.fill();
      levelTimer=Math.max(0,t-dt);
    }

    // glow strings
    ctx.save();
    ctx.shadowColor = combo>4?'orange':'cyan';
    ctx.shadowBlur  = combo*8;
    [4,2,1].forEach((w,i)=>{
      ctx.strokeStyle='#bbb'; ctx.lineWidth=w;
      ctx.beginPath();
      ctx.moveTo(lanes[i].x,0);
      ctx.lineTo(lanes[i].x,canvas.height);
      ctx.stroke();
    });
    ctx.restore();

    // target zones
    ctx.strokeStyle='#555';
    lanes.forEach((l,i)=>{
      const extra = levelTimer>0?10:0;
      ctx.strokeRect(l.x-(sz+extra)/2,hitY-extra/2,sz+extra,sz+extra);
    });

    // draw notes & holds
    notes.forEach(n=>{
      n.y+=dy;
      const x=lanes[n.lane].x;
      ctx.fillStyle=colors[n.lane];
      if(n.type==='tap'){
        const w=sz,h=sz*1.2;
        ctx.beginPath();
        ctx.moveTo(x,n.y);
        ctx.lineTo(x-w/2,n.y+h*0.4);
        ctx.quadraticCurveTo(x,n.y+h,x+w/2,n.y+h*0.4);
        ctx.closePath(); ctx.fill();
      } else { // hold
        ctx.globalAlpha=0.6;
        ctx.fillRect(x-sz/4, n.y, sz/2, n.len);
        ctx.globalAlpha=1;
        // head
        const w=sz/1.5,h=sz*0.9;
        ctx.beginPath();
        ctx.moveTo(x,n.y);
        ctx.lineTo(x-w/2,n.y+h*0.4);
        ctx.quadraticCurveTo(x,n.y+h,x+w/2,n.y+h*0.4);
        ctx.closePath(); ctx.fill();
      }
    });

    // off-screen removal
    for(let i=notes.length-1;i>=0;i--){
      if(notes[i].y > canvas.height){
        notes.splice(i,1);
        resetStreak();
      }
    }

    // flashes & particles
    effects.forEach((g,gi)=>{
      const a=g.t/flashDur, x=lanes[g.lane].x;
      ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#fff';
      ctx.fillRect(x-sz/2,hitY,sz,sz);ctx.restore();
      g.t-=dt;
      g.parts.forEach(p=>{
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.t-=dt;
        ctx.save();
        ctx.globalAlpha=p.t/partLife;
        ctx.fillStyle=colors[p.ci];
        ctx.fillRect(p.x-3,p.y-3,6,6);
        ctx.restore();
      });
      g.parts=g.parts.filter(p=>p.t>0);
      if(g.t<=0 && g.parts.length===0) effects.splice(gi,1);
    });

    // floating texts
    texts.forEach((t,ti)=>{
      const prog=1-(t.t/textDur),
            y   = t.y0 - (floatDist*prog),
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
})();
