console.log('Loading game.js v13');

(() => {
  const canvas = document.getElementById('gameCanvas'),
        ctx    = canvas.getContext('2d'),
        scoreEl    = document.getElementById('score'),
        pctEl      = document.getElementById('percent'),
        mulEl      = document.getElementById('multiplier'),
        strEl      = document.getElementById('streak'),
        msg        = document.getElementById('message'),
        pauseBtn   = document.getElementById('pauseButton'),
        audio      = document.getElementById('gameAudio'),
        ov         = document.getElementById('leaderboardOverlay'),
        fin        = document.getElementById('finalScore'),
        initIn     = document.getElementById('initials'),
        subBtn     = document.getElementById('submitScore'),
        listEl     = document.getElementById('leaderboardList'),
        closeBtn   = document.getElementById('closeLeaderboard');

  let started=false, paused=false,
      score=0, total=0, spawnID,
      streak=0, combo=1;
  const notes=[], effects=[], texts=[];
  const sz=50, flashDur=0.1, partLife=0.5, textDur=0.5, floatDist=100,
        bpm=135, colors=['#0ff','#f0f','#0f0'];
  let dy, hitY;
  const lanes=[{x:0},{x:0},{x:0}];

  function resize(){
    canvas.width  = innerWidth;
    canvas.height = innerHeight;
    hitY          = canvas.height - 100;
    lanes[0].x    = canvas.width * 0.25;
    lanes[1].x    = canvas.width * 0.50;
    lanes[2].x    = canvas.width * 0.75;
    dy            = (hitY + sz) / ((60/bpm)*2*60);
  }
  window.addEventListener('resize', resize);
  resize();

  function startGame(){
    started=true; paused=false;
    score=0; total=0; streak=0; combo=1;
    scoreEl.textContent='Score: 0';
    pctEl.textContent='0%';
    mulEl.textContent='x1';
    strEl.textContent='Streak: 0';
    msg.style.display='none';
    pauseBtn.style.display='block';
    audio.currentTime=0; audio.play().catch(console.warn);
    audio.onended = endGame;
    spawnNote();
    spawnID = setInterval(spawnNote, (60/bpm)*1000/4);
    draw();
  }

  function togglePause(e){
    e.stopPropagation();
    if(!started) return;
    paused = !paused;
    if(paused){
      audio.pause(); clearInterval(spawnID);
      pauseBtn.textContent='Resume';
    } else {
      audio.play().catch(console.warn);
      spawnID = setInterval(spawnNote, (60/bpm)*1000/4);
      pauseBtn.textContent='Pause';
      draw();
    }
  }
  pauseBtn.addEventListener('click', togglePause);

  function spawnNote(){
    if(!started) return;
    if(Math.random()<0.5){
      notes.push({y:-sz, lane:Math.floor(Math.random()*3)});
      total++; updatePct();
    }
  }

  function endGame(){
    started=false;
    clearInterval(spawnID);
    fin.textContent = `Score: ${score} (${pctEl.textContent})`;
    showLeaderboard();
    ov.style.display='block';
  }

  function handleTap(e){
    e.preventDefault();
    if(!started) startGame();
    else if(!paused){
      if(!hit(e)) resetStreak();
    }
  }
  canvas.addEventListener('pointerdown', handleTap, {passive:false});
  canvas.addEventListener('touchstart',  handleTap, {passive:false});
  canvas.addEventListener('mousedown',   handleTap);

  function hit(e){
    const rect = canvas.getBoundingClientRect(),
          x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
          tol  = 30;
    for(let i=notes.length-1; i>=0; i--){
      const n = notes[i], lx = lanes[n.lane].x;
      if(
        x >= lx - sz/2 - tol &&
        x <= lx + sz/2 + tol &&
        n.y >= hitY - tol &&
        n.y <= hitY + sz + tol
      ){
        notes.splice(i,1);
        // Always increment streak
        streak++;
        // Recalculate combo: 1× for 0-3 hits, 2× for 4-7, … up to 8×
        combo = Math.min(8, Math.floor(streak/4) + 1);
        // Award points
        const base = getBase(n.y),
              pts  = base * combo;
        score += pts;
        scoreEl.textContent = `Score: ${score}`;
        scoreEl.classList.add('pop');
        scoreEl.onanimationend = () => scoreEl.classList.remove('pop');
        // Update displays
        mulEl.textContent = `x${combo}`;
        strEl.textContent = `Streak: ${streak}`;
        updatePct();
        // Effects + text
        flashFx(n.lane, lx, hitY + sz/2);
        texts.push({ txt: getLabel(n.y), x: lx, y0: hitY-20, t: textDur });
        return true;
      }
    }
    return false;
  }

  function resetStreak(){
    streak = 0;
    combo  = 1;
    mulEl.textContent = 'x1';
    strEl.textContent = 'Streak: 0';
  }

  function getBase(y){
    const d = Math.abs(y - hitY);
    if(d < 5)   return 100;
    if(d < 15)  return 80;
    if(d < 30)  return 50;
    if(d < 45)  return 20;
    return 10;
  }
  function getLabel(y){
    const d = Math.abs(y - hitY);
    if(d < 5)   return 'Perfect';
    if(d < 15)  return 'Excellent';
    if(d < 30)  return 'Great';
    if(d < 45)  return 'Good';
    return 'Ok';
  }

  function updatePct(){
    const p = total ? Math.round(score/(total*100)*100) : 0;
    pctEl.textContent = `${p}%`;
  }

  function showLeaderboard(){
    const art = [
      {i:'ALX',s:500,p:'50%'},
      {i:'BRN',s:650,p:'65%'},
      {i:'CER',s:800,p:'80%'}
    ];
    const mePct = parseInt(pctEl.textContent,10),
          me    = {
            i: initIn.value.toUpperCase().slice(0,3) || 'YOU',
            s: score,
            p: pctEl.textContent
          };
    let board = art.slice();
    if(mePct >= 85) board.splice(2,0,me);
    else            board.push(me);
    const saved = JSON.parse(localStorage.getItem('leaderboard')||'[]');
    board = board.concat(saved);

    listEl.innerHTML = '';
    board.slice(0,5).forEach(r=>{
      const li = document.createElement('li');
      li.textContent = `${r.i} - ${r.s} (${r.p})`;
      listEl.appendChild(li);
    });
  }
  subBtn.addEventListener('click', ()=>{
    const inits = initIn.value.toUpperCase().slice(0,3) || '---',
          rec   = {i: inits, s: score, p: pctEl.textContent},
          sv    = JSON.parse(localStorage.getItem('leaderboard')||'[]');
    sv.unshift(rec);
    localStorage.setItem('leaderboard', JSON.stringify(sv.slice(0,10)));
    showLeaderboard();
  });
  closeBtn.addEventListener('click', ()=>ov.style.display='none');

  function flashFx(lane, cx, cy){
    effects.push({
      lane, t: flashDur,
      parts: Array.from({length:8}).map(_=>{
        const a=Math.random()*Math.PI*2,
              s=100+Math.random()*100;
        return { x:cx, y:cy, vx:Math.cos(a)*s, vy:Math.sin(a)*s, t:partLife, ci:lane };
      })
    });
  }

  function draw(){
    if(paused) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // glowing strings
    ctx.save();
    ctx.shadowColor = combo>4 ? 'orange':'cyan';
    ctx.shadowBlur  = combo*2;
    [4,2,1].forEach((w,i)=>{
      ctx.strokeStyle='#bbb'; ctx.lineWidth=w;
      const x=lanes[i].x;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
    });
    ctx.restore();

    // target zones
    ctx.strokeStyle='#555';
    lanes.forEach(l=>ctx.strokeRect(l.x-sz/2,hitY,sz,sz));

    // draw notes
    notes.forEach(n=>{
      n.y += dy;
      const x=lanes[n.lane].x;
      ctx.fillStyle=colors[n.lane];
      const w=sz, h=sz*1.2;
      ctx.beginPath();
      ctx.moveTo(x,n.y);
      ctx.lineTo(x-w/2, n.y+h*0.4);
      ctx.quadraticCurveTo(x, n.y+h, x+w/2, n.y+h*0.4);
      ctx.closePath(); ctx.fill();
    });

    // remove misses
    for(let i=notes.length-1;i>=0;i--){
      if(notes[i].y > canvas.height){
        notes.splice(i,1);
        resetStreak();
      }
    }

    const dt=1/60;
    // flashes & particles
    effects.forEach((g,gi)=>{
      const alpha=g.t/flashDur,
            x=lanes[g.lane].x;
      ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle='#fff';
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

    // floating texts
    texts.forEach((t,ti)=>{
      const prog = 1 - (t.t/textDur),
            y    = t.y0 - (floatDist*prog),
            alpha= t.t/textDur;
      ctx.save(); ctx.globalAlpha=alpha; ctx.textAlign='center'; ctx.font='20px sans-serif';
      let fill='#fff';
      if(t.txt==='Perfect') fill='yellow';
      else if(t.txt==='Excellent') fill='magenta';
      ctx.fillStyle=fill;
      ctx.fillText(t.txt,t.x,y);
      ctx.restore();
      t.t -= dt;
      if(t.t<=0) texts.splice(ti,1);
    });

    requestAnimationFrame(draw);
  }
})();
