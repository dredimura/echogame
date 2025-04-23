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
  const effects    = []; // holds flash+particles
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

  // Colors for lanes
  const colors = ['#0ff','#f0f','#0f0'];

  // Input handler
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!started) startGame();
    else if (!paused) handleHit(e);
  }, { passive: false });

  // Start gameplay
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

  // Pause/resume
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

  // Spawn squares randomly
  function spawnSquare() {
    if (Math.random() < 0.5) {
      squares.push({ y: -squareSize, lane: Math.floor(Math.random()*3) });
      totalNotes++;
      updatePercent();
    }
  }

  // Hit detection with ±30px window
  function handleHit(e) {
    const rect = canvas.getBoundingClientRect();
    const x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const tol  = 30;
    for (let i = squares.length - 1; i >= 0; i--) {
      const sq = squares[i];
      const lx = lanes[sq.lane].x;
      if (
        x >= lx - squareSize/2 - tol &&
        x <= lx + squareSize/2 + tol &&
        sq.y >= hitZoneY - tol &&
        sq.y <= hitZoneY + squareSize + tol
      ) {
        // correct hit!
        squares.splice(i,1);
        score++;
        scoreEl.textContent = `Score: ${score}`;
        scoreEl.classList.add('pop');
        scoreEl.addEventListener('animationend', () => scoreEl.classList.remove('pop'), { once: true });
        updatePercent();
        triggerEffects(sq.lane, lx, hitZoneY + squareSize/2);
        return;
      }
    }
  }

  // Update % display
  function updatePercent() {
    const pct = totalNotes ? Math.round(score/totalNotes*100) : 0;
    percentEl.textContent = `${pct}%`;
  }

  // When audio ends → show leaderboard
  function onGameEnd() {
    paused = true;
    clearInterval(spawnID);
    finalScoreP.textContent = `Score: ${score} (${percentEl.textContent})`;
    loadLeaderboard();
    overlay.style.display = 'block';
  }

  // Leaderboard helpers
  function loadLeaderboard() {
    const board = JSON.parse(localStorage.getItem('leaderboard')||'[]');
    boardList.innerHTML = '';
    board.slice(0,5).forEach(r=>{
      const li = document.createElement('li');
      li.textContent = `${r.initials} - ${r.score} (${r.percent}%)`;
      boardList.appendChild(li);
    });
  }
  submitBtn.addEventListener('click', () => {
    const initials = initialsIn.value.toUpperCase().slice(0,3)||'---';
    const board = JSON.parse(localStorage.getItem('leaderboard')||'[]');
    board.unshift({ initials, score, percent: percentEl.textContent.replace('%','') });
    localStorage.setItem('leaderboard', JSON.stringify(board.slice(0,10)));
    loadLeaderboard();
  });
  closeBtn.addEventListener('click', () => overlay.style.display='none');

  // Effect: white flash + break-apart particles
  function triggerEffects(lane, cx, cy) {
    // flash
    effects.push({ lane, t: 0.2, pieces: [] });
    // particles
    const group = effects[effects.length-1];
    for (let j=0; j<8; j++) {
      const ang = Math.random()*Math.PI*2;
      const speed = 100 + Math.random()*100;
      group.pieces.push({
        x: cx, y: cy,
        vx: Math.cos(ang)*speed,
        vy: Math.sin(ang)*speed,
        t: 0.5,
        ci: lane
      });
    }
  }

  // Draw everything
  function draw() {
    if (paused) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // draw target zones
    ctx.strokeStyle = '#555';
    lanes.forEach(lane => {
      ctx.strokeRect(lane.x - squareSize/2, hitZoneY, squareSize, squareSize);
    });

    // draw & move curved-bottom picks
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

    // remove off-screen
    for (let i=squares.length-1; i>=0; i--) {
      if (squares[i].y > canvas.height) squares.splice(i,1);
    }

    // render & update effects
    const dt = 1/fps;
    for (let i=effects.length-1; i>=0; i--) {
      const g = effects[i];
      const alpha = g.t / 0.2;
      const lx = lanes[g.lane].x;
      // white flash
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.fillRect(lx - squareSize/2, hitZoneY, squareSize, squareSize);
      ctx.restore();
      g.t -= dt;
      // particles
      g.pieces.forEach(p => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.t -= dt;
        ctx.save(); ctx.globalAlpha = p.t/0.5;
        ctx.fillStyle = colors[p.ci];
        ctx.fillRect(p.x-3, p.y-3, 6,6);
        ctx.restore();
      });
      g.pieces = g.pieces.filter(p=>p.t>0);
      if (g.t <= 0 && g.pieces.length===0) effects.splice(i,1);
    }

    requestAnimationFrame(draw);
  }
})();
