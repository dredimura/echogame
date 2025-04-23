(() => {
  const canvas    = document.getElementById('gameCanvas');
  const ctx       = canvas.getContext('2d');
  const scoreEl   = document.getElementById('score');
  const percentEl = document.getElementById('percent');
  const multiEl   = document.getElementById('multiplier');
  const streakEl  = document.getElementById('streak');
  const msgEl     = document.getElementById('message');
  const pauseBtn  = document.getElementById('pauseButton');
  const audio     = document.getElementById('gameAudio');
  const overlay   = document.getElementById('leaderboardOverlay');
  const finalP    = document.getElementById('finalScore');
  const initials  = document.getElementById('initials');
  const submitBtn = document.getElementById('submitScore');
  const listEl    = document.getElementById('leaderboardList');
  const closeBtn  = document.getElementById('closeLeaderboard');

  let started     = false;
  let paused      = false;
  let score       = 0;
  let totalNotes  = 0;
  let spawnID     = null;
  let combo       = 1;
  let streak      = 0;
  const squares   = [];
  const effects   = [];
  const texts     = [];
  const sqSz      = 50;

  const flashDur  = 0.1;
  const partLife  = 0.5;
  const textDur   = 0.5;
  const floatDist = 100; // pixels to float up

  let hitY;
  const lanes = [{x:0},{x:0},{x:0}];

  function resize(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    hitY          = canvas.height - 100;
    lanes[0].x    = canvas.width * 0.25;
    lanes[1].x    = canvas.width * 0.50;
    lanes[2].x    = canvas.width * 0.75;
  }
  window.addEventListener('resize', resize);
  resize();

  const bpm        = 135;
  const beatSec    = 60 / bpm;
  const travelSec  = beatSec * 2;
  const fps        = 60;
  const dy         = (hitY + sqSz) / (travelSec * fps);
  const spawnMs    = (beatSec * 1000) / 4;

  const colors = ['#0ff','#f0f','#0f0'];

  function onTap(e){
    e.preventDefault();
    if (!started) startGame();
    else if (!paused){
      const hit = handleHit(e);
      if (!hit) resetCombo();
    }
  }
  canvas.addEventListener('pointerdown', onTap, { passive:false });
  canvas.addEventListener('touchstart',  onTap, { passive:false });
  canvas.addEventListener('mousedown',   onTap);

  function startGame(){
    started     = true;
    paused      = false;
    score       = 0;
    totalNotes  = 0;
    combo       = 1;
    streak      = 0;
    scoreEl.textContent   = 'Score: 0';
    percentEl.textContent = '0%';
    multiEl.textContent   = 'x1';
    streakEl.textContent  = 'Streak: 0';
    msgEl.style.display   = 'none';
    pauseBtn.style.display= 'block';
    audio.currentTime = 0;
    audio.play().catch(console.warn);
    audio.addEventListener('ended', endGame);
    spawnSquare();
    spawnID = setInterval(spawnSquare, spawnMs);
    requestAnimationFrame(draw);
  }

  pauseBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!started) return;
    paused = !paused;
    if (paused){
      audio.pause();
      clearInterval(spawnID);
      pauseBtn.textContent = 'Resume';
    } else {
      audio.play().catch(console.warn);
      spawnID = setInterval(spawnSquare, spawnMs);
      pauseBtn.textContent = 'Pause';
      requestAnimationFrame(draw);
    }
  });

  function endGame(){
    started = false;
    clearInterval(spawnID);
    finalP.textContent = `Score: ${score} (${percentEl.textContent})`;
    showLeaderboard();
    overlay.style.display = 'block';
  }

  function spawnSquare(){
    if (!started) return;
    if (Math.random() < 0.5){
      squares.push({ y:-sqSz, lane:Math.floor(Math.random()*3) });
      totalNotes++;
      updatePercent();
    }
  }

  function handleHit(e){
    const rect = canvas.getBoundingClientRect();
    const x    = (e.touches?e.touches[0].clientX:e.clientX) - rect.left;
    const tol  = 30;
    for (let i=squares.length-1; i>=0; i--){
      const sq = squares[i], lx = lanes[sq.lane].x;
      if (
        x >= lx - sqSz/2 - tol &&
        x <= lx + sqSz/2 + tol &&
        sq.y >= hitY - tol &&
        sq.y <= hitY + sqSz + tol
      ){
        // correct hit
        squares.splice(i,1);
        streak++;
        if (streak % 4 === 0 && combo < 8) combo++;
        score += tierPoints(sq.y);
        scoreEl.textContent = `Score: ${score}`;
        scoreEl.classList.add('pop');
        scoreEl.addEventListener('animationend', ()=>
          scoreEl.classList.remove('pop'), { once:true }
        );
        multiEl.textContent  = `x${combo}`;
        streakEl.textContent = `Streak: ${streak}`;
        updatePercent();
        triggerEffects(sq.lane, lx, hitY + sqSz/2);
        texts.push({
          text:  accuracyText(sq.y),
          x:     lx,
          y0:    hitY - 20,
          t:     textDur
        });
        return true;
      }
    }
    // ghost tap
    resetCombo();
    return false;
  }

  function resetCombo(){
    combo  = 1;
    streak = 0;
    multiEl.textContent  = 'x1';
    streakEl.textContent = 'Streak: 0';
  }

  function tierPoints(y){
    const diff = Math.abs(y - hitY);
    if (diff < 5)       return 100 * combo;
    if (diff < 15)      return 80  * combo;
    if (diff < 30)      return 50  * combo;
    if (diff < 45)      return 20  * combo;
    return 10 * combo;
  }

  function accuracyText(y){
    const diff = Math.abs(y - hitY);
    if (diff < 5)       return 'Perfect';
    if (diff < 15)      return 'Excellent';
    if (diff < 30)      return 'Great';
    if (diff < 45)      return 'Good';
    return 'Ok';
  }

  function updatePercent(){
    const pct = totalNotes
      ? Math.round((score/(totalNotes*100))*100)
      : 0;
    percentEl.textContent = `${pct}%`;
  }

  function showLeaderboard(){
    const art = [
      { initials:'ALX', score:500, percent:'50%' },
      { initials:'BRN', score:650, percent:'65%' },
      { initials:'CER', score:800, percent:'80%' }
    ];
    const pPct = parseInt(percentEl.textContent,10);
    let board = art.slice();
    const me = {
      initials: initials.value.toUpperCase() || 'YOU',
      score, percent: percentEl.textContent
    };
    if (pPct >= 85) board.splice(2,0,me);
    else            board.push(me);
    const saved = JSON.parse(localStorage.getItem('leaderboard')||'[]');
    board = board.concat(saved);

    listEl.innerHTML = '';
    board.slice(0,5).forEach(r=>{
      const li=document.createElement('li');
      li.textContent = `${r.initials} - ${r.score} (${r.percent})`;
      listEl.appendChild(li);
    });
  }

  submitBtn.addEventListener('click',()=>{
    const inits = initials.value.toUpperCase().slice(0,3) || '---';
    const pct   = percentEl.textContent;
    const rec   = { initials:inits, score, percent:pct };
    const saved = JSON.parse(localStorage.getItem('leaderboard')||'[]');
    saved.unshift(rec);
    localStorage.setItem('leaderboard', JSON.stringify(saved.slice(0,10)));
    showLeaderboard();
  });

  closeBtn.addEventListener('click', ()=> overlay.style.display='none');

  function triggerEffects(lane, cx, cy){
    // remove old
    for (let i=effects.length-1;i>=0;i--){
      if (effects[i].lane===lane) effects.splice(i,1);
    }
    const g={ lane, t:flashDur, pieces:[] };
    for (let j=0;j<8;j++){
      const ang=Math.random()*2*Math.PI, s=100+Math.random()*100;
      g.pieces.push({ x:cx,y:cy,vx:Math.cos(ang)*s,vy:Math.sin(ang)*s,t:partLife,ci:lane });
    }
    effects.push(g);
  }

  function draw(){
    if (paused) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // glowing strings
    ctx.save();
    ctx.shadowColor = combo > 4 ? 'orange' : 'cyan';
    ctx.shadowBlur  = combo * 2;
    [4,2,1].forEach((lw,i)=>{
      ctx.strokeStyle = '#bbb';
      ctx.lineWidth   = lw;
      const x = lanes[i].x;
      ctx.beginPath();
      ctx.moveTo(x,0);
      ctx.lineTo(x,canvas.height);
      ctx.stroke();
    });
    ctx.restore();

    // hit-zone outlines
    ctx.strokeStyle = '#555';
    lanes.forEach(l=>{
      ctx.strokeRect(l.x - sqSz/2, hitY, sqSz, sqSz);
    });

    // draw picks
    squares.forEach(sq=>{
      sq.y += dy;
      const lx = lanes[sq.lane].x;
      ctx.fillStyle = colors[sq.lane];
      const w=sqSz,h=sqSz*1.2;
      ctx.beginPath();
      ctx.moveTo(lx,sq.y);
      ctx.lineTo(lx - w/2, sq.y + h*0.4);
      ctx.quadraticCurveTo(lx, sq.y + h, lx + w/2, sq.y + h*0.4);
      ctx.closePath();
      ctx.fill();
    });

    // remove misses
    for (let i=squares.length-1;i>=0;i--){
      if (squares[i].y > canvas.height){
        squares.splice(i,1);
        resetCombo();
      }
    }

    const dt = 1/fps;
    // draw flashes & particles
    effects.forEach((g,gi)=>{
      const alpha = g.t/flashDur;
      const lx = lanes[g.lane].x;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#fff';
      ctx.fillRect(lx - sqSz/2, hitY, sqSz, sqSz);
      ctx.restore();
      g.t -= dt;
      g.pieces.forEach(p=>{
        p.x += p.vx*dt; p.y += p.vy*dt; p.t -= dt;
        ctx.save();
        ctx.globalAlpha = p.t/partLife;
        ctx.fillStyle   = colors[p.ci];
        ctx.fillRect(p.x-3, p.y-3, 6,6);
        ctx.restore();
      });
      g.pieces = g.pieces.filter(p=>p.t>0);
      if (g.t<=0 && g.pieces.length===0) effects.splice(gi,1);
    });

    // draw floating accuracy texts
    texts.forEach((tx,ti)=>{
      const prog = 1 - (tx.t/textDur);
      const yPos = tx.y0 - (floatDist * prog);
      const alpha = tx.t/textDur;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign   = 'center';
      ctx.font        = '20px sans-serif';
      if (tx.text==='Perfect'){
        const grad=ctx.createLinearGradient(tx.x-40,yPos-10,tx.x+40,yPos+10);
        grad.addColorStop(0,'#ff0'); grad.addColorStop(1,'#fff');
        ctx.fillStyle = grad;
      } else if (tx.text==='Excellent'){
        const grad=ctx.createLinearGradient(tx.x-40,yPos-10,tx.x+40,yPos+10);
        grad.addColorStop(0,'#f0f'); grad.addColorStop(1,'#fff');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#fff';
      }
      ctx.fillText(tx.text, tx.x, yPos);
      ctx.restore();
      tx.t -= dt;
      if (tx.t <= 0) texts.splice(ti,1);
    });

    requestAnimationFrame(draw);
  }
})();
