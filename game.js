(() => {
  // Elements
  const canvas      = document.getElementById('gameCanvas');
  const ctx         = canvas.getContext('2d');
  const scoreEl     = document.getElementById('score');
  const percentEl   = document.getElementById('percent');
  const msgEl       = document.getElementById('message');
  const pauseBtn    = document.getElementById('pauseButton');
  const audio       = document.getElementById('gameAudio');
  const overlay     = document.getElementById('leaderboardOverlay');
  const finalScoreP = document.getElementById('finalScore');
  const initialsIn  = document.getElementById('initials');
  const submitBtn   = document.getElementById('submitScore');
  const boardList   = document.getElementById('leaderboardList');
  const closeBtn    = document.getElementById('closeLeaderboard');

  // State
  let started      = false;
  let paused       = false;
  let score        = 0;
  let totalNotes   = 0;
  let spawnID      = null;
  const squares    = [];
  const particles  = [];
  const squareSize = 50;

  // Resize & lanes
  let hitZoneY;
  const lanes = [{x:0},{x:0},{x:0}];
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    hitZoneY      = canvas.height - 100;
    lanes[0].x = canvas.width * 0.25;
    lanes[1].x = canvas.width * 0.50;
    lanes[2].x = canvas.width * 0.75;
  }
  window.addEventListener('resize', resize);
  resize();

  // Timing
  const bpm          = 135;
  const beatSec      = 60 / bpm;
  const travelSec    = beatSec * 2;
  const fps          = 60;
  const pxPerFrame   = (hitZoneY + squareSize) / (travelSec * fps);
  const spawnMs      = (beatSec * 1000) / 4;

  // Colors: blue, pink, neon-green
  const colors = ['#0ff','#f0f','#0f0'];

  // Input
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!started) startGame();
    else if (!paused) handleHit(e);
  }, { passive: false });

  // Start
  function startGame() {
    started = true;
    msgEl.style.display    = 'none';
    pauseBtn.style.display = 'block';
    audio.currentTime = 0;
    audio.play().catch(console.warn);
    audio.addEventListener('ended', onGameEnd);
    spawnSquare();
    spawnID = setInterval(spawnSquare, spawnMs);
    requestAnimationFrame(draw);
  }

  // Pause/Resume
  pauseBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!started) return;
    paused = !paused;
    if (paused) {
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

  // Spawn logic
  function spawnSquare() {
    if (Math.random() < 0.5) {
      squares.push({ y: -squareSize, lane: Math.floor(Math.random()*3) });
      totalNotes++;
      updatePercent();
    }
  }

  // Hit detection
  function handleHit(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const tol = 30;
    for (let i = squares.length - 1; i >= 0; i--) {
      const sq = squares[i];
      const lx = lanes[sq.lane].x;
      if (
        x >= lx - squareSize/2 - tol &&
        x <= lx + squareSize/2 + tol &&
        sq.y >= hitZoneY - tol &&
        sq.y <= hitZoneY + squareSize + tol
      ) {
        squares.splice(i,1);
        score++;
        scoreEl.textContent = `Score: ${score}`;        // <-- FIXED
        scoreEl.classList.add('pop');
        scoreEl.addEventListener('animationend', () => {
          scoreEl.classList.remove('pop');
        }, { once: true });
        updatePercent();
        spawnParticles(sq.lane, lx, hitZoneY + squareSize/2);
        return;
      }
    }
  }

  // Update percent display
  function updatePercent() {
    const pct = totalNotes ? Math.round(score/totalNotes*100) : 0;
    percentEl.textContent = `${pct}%`;
  }

  // On song end → leaderboard
  function onGameEnd() {
    paused = true;
    clearInterval(spawnID);
    finalScoreP.textContent = `Score: ${score} (${percentEl.textContent})`;
    loadLeaderboard();
    overlay.style.display = 'block';
  }

  // Leaderboard
  function loadLeaderboard() {
    const board = JSON.parse(localStorage.getItem('leaderboard')||'[]');
    boardList.innerHTML = '';
    board.slice(0,5).forEach(r => {
      const li = document.createElement('li');
      li.textContent = `${r.initials} - ${r.score} (${r.percent}%)`;
      boardList.appendChild(li);
    });
  }
  submitBtn.addEventListener('click', () => {
    const initials = initialsIn.value.toUpperCase().slice(0,3) || '---';
    const board = JSON.parse(localStorage.getItem('leaderboard')||'[]');
    board.unshift({ initials, score, percent: percentEl.textContent.replace('%','') });
    localStorage.setItem('leaderboard', JSON.stringify(board.slice(0,10)));
    loadLeaderboard();
  });
  closeBtn.addEventListener('click', () => overlay.style.display = 'none');

  // Particles & flash
  function spawnParticles(lane, cx, cy) {
    const group = { lane, t: flashDur, pieces: [] };
    for (let j=0;j<8;j++){
      const ang = Math.random()*Math.PI*2;
      const speed = 100+Math.random()*100;
      group.pieces.push({
        x: cx, y: cy,
        vx: Math.cos(ang)*speed,
        vy: Math.sin(ang)*speed,
        t: particleLife,
        ci: lane
      });
    }
    particles.push(group);
  }

  // Draw loop
  function draw() {
    if (paused) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Hit zones
    ctx.strokeStyle = '#555';
    lanes.forEach(lane => {
      ctx.strokeRect(lane.x - squareSize/2, hitZoneY, squareSize, squareSize);
    });

    // Draw curved picks
    squares.forEach(sq => {
      sq.y += pxPerFrame;
      const lx = lanes[sq.lane].x;
      ctx.fillStyle = colors[sq.lane];
      const w = squareSize, h = squareSize*1.2;
      ctx.beginPath();
      ctx.moveTo(lx, sq.y);
      ctx.lineTo(lx - w/2, sq.y + h*0.4);
      ctx.quadraticCurveTo(lx, sq.y + h, lx + w/2, sq.y + h*0.4);
      ctx.closePath();
      ctx.fill();
    });

    // Remove off-screen
    for (let i = squares.length-1; i>=0; i--){
      if (squares[i].y>canvas.height) squares.splice(i,1);
    }

    // Draw flashes & particles
    const dt = 1/fps;
    for (let i = particles.length-1; i>=0; i--) {
      const grp = particles[i];
      const alpha = grp.t/flashDur;
      const lx = lanes[grp.lane].x;
      // flash
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.fillRect(lx - squareSize/2, hitZoneY, squareSize, squareSize);
      ctx.restore();
      grp.t -= dt;
      // pieces
      grp.pieces.forEach(p => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.t -= dt;
        ctx.save(); ctx.globalAlpha = p.t/particleLife;
        ctx.fillStyle = colors[p.ci];
        ctx.fillRect(p.x-3, p.y-3, 6, 6);
        ctx.restore();
      });
      grp.pieces = grp.pieces.filter(p => p.t>0);
      if (grp.t<=0 && grp.pieces.length===0) particles.splice(i,1);
    }

    requestAnimationFrame(draw);
  }
})();
