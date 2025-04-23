(() => {
  // Elements
  const canvas      = document.getElementById('gameCanvas');
  const ctx         = canvas.getContext('2d');
  const scoreEl     = document.getElementById('score');
  const percentEl   = document.getElementById('percent');
  const multiEl     = document.getElementById('multiplier');
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
  let multiplier   = 1;
  const squares    = [];
  const effects    = [];
  const texts      = [];
  const squareSize = 50;

  // Timings
  const flashDur     = 0.1;
  const particleLife = 0.5;
  const textDur      = 0.5;

  // Resize & lane positions
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

  // Tempo
  const bpm        = 135;
  const beatSec    = 60 / bpm;
  const travelSec  = beatSec * 2;
  const fps        = 60;
  const pxPerFrame = (hitZoneY + squareSize) / (travelSec * fps);
  const spawnMs    = (beatSec * 1000) / 4;

  // Lane colors
  const colors = ['#0ff','#f0f','#0f0'];

  // Input handling
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!started) startGame();
    else if (!paused) {
      const hit = handleHit(e);
      if (!hit) resetMultiplier();       // ghost tap resets combo
    }
  }, { passive: false });

  // Start the game
  function startGame() {
    started = true;
    paused  = false;
    score   = 0;
    totalNotes = 0;
    multiplier = 1;
    scoreEl.textContent   = 'Score: 0';
    percentEl.textContent = '0%';
    multiEl.textContent   = 'x1';
    msgEl.style.display   = 'none';
    pauseBtn.style.display= 'block';
    audio.currentTime = 0;
    audio.play().catch(console.warn);
    audio.addEventListener('ended', onGameEnd);
    spawnSquare();
    spawnID = setInterval(spawnSquare, spawnMs);
    requestAnimationFrame(draw);
  }

  // Pause / Resume
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

  // Stop spawning after end
  function onGameEnd() {
    started = false;
    clearInterval(spawnID);
    finalScoreP.textContent = `Score: ${score} (${percentEl.textContent})`;
    loadLeaderboard();
    overlay.style.display = 'block';
  }

  // Spawn notes randomly
  function spawnSquare() {
    if (!started) return;
    if (Math.random() < 0.5) {
      squares.push({ y: -squareSize, lane: Math.floor(Math.random()*3) });
      totalNotes++;
      updatePercent();
    }
  }

  // Handle taps
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
        // HIT!
        squares.splice(i,1);

        // Accuracy tiers
        const diff = Math.abs(sq.y - hitZoneY);
        let acc, pts;
        if (diff < 5)        { acc = 'Perfect';    pts = 100; }
        else if (diff < 15)  { acc = 'Excellent';  pts = 80;  }
        else if (diff < 30)  { acc = 'Great';      pts = 50;  }
        else if (diff < 45)  { acc = 'Good';       pts = 20;  }
        else                 { acc = 'Ok';         pts = 10;  }

        // Apply multiplier
        score += pts * multiplier;
        scoreEl.textContent = `Score: ${score}`;
        scoreEl.classList.add('pop');
        scoreEl.addEventListener('animationend',
          () => scoreEl.classList.remove('pop'),
          { once: true }
        );

        // Next combo
        multiplier++;
        multiEl.textContent = `x${multiplier}`;

        updatePercent();
        triggerEffects(sq.lane, lx, hitZoneY + squareSize/2);

        // Show accuracy text
        texts.push({ text: acc, x: lx, y: hitZoneY - 20, t: textDur });
        return true;
      }
    }
    return false; // ghost tap
  }

  // Reset combo
  function resetMultiplier() {
    multiplier = 1;
    multiEl.textContent = 'x1';
  }

  // Update percentage
  function updatePercent() {
    const pct = totalNotes
      ? Math.round((score / (totalNotes * 100)) * 100)
      : 0;
    percentEl.textContent = `${pct}%`;
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
  closeBtn.addEventListener('click', () => overlay.style.display='none');

  // Effects: flash + particles
  function triggerEffects(lane, cx, cy) {
    // Remove any existing flash on that lane
    for (let i = effects.length - 1; i >= 0; i--) {
      if (effects[i].lane === lane) effects.splice(i,1);
    }
    const g = { lane, t: flashDur, pieces: [] };
    for (let j = 0; j < 8; j++) {
      const ang = Math.random()*Math.PI*2;
      const speed = 100 + Math.random()*100;
      g.pieces.push({
        x: cx, y: cy,
        vx: Math.cos(ang)*speed,
        vy: Math.sin(ang)*speed,
        t: particleLife,
        ci: lane
      });
    }
    effects.push(g);
  }

  // Main draw loop
  function draw() {
    if (paused) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Guitar-string lines (thick→thin)
    [4,2,1].forEach((lw,i) => {
      ctx.strokeStyle = '#bbb';
      ctx.lineWidth   = lw;
      const x = lanes[i].x;
      ctx.beginPath();
      ctx.moveTo(x, 0);             // start at very top
      ctx.lineTo(x, canvas.height); // full height
      ctx.stroke();
    });

    // Hit-zone outlines
    ctx.strokeStyle = '#555';
    lanes.forEach(lane => {
      ctx.strokeRect(lane.x - squareSize/2, hitZoneY, squareSize, squareSize);
    });

    // Draw & move picks
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

    // Missed notes reset combo
    for (let i = squares.length - 1; i >= 0; i--) {
      if (squares[i].y > canvas.height) {
        squares.splice(i,1);
        resetMultiplier();
      }
    }

    // Draw effects
    const dt = 1/fps;
    effects.forEach((g, gi) => {
      // white flash
      const alpha = g.t/flashDur;
      const lx = lanes[g.lane].x;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#fff';
      ctx.fillRect(lx - squareSize/2, hitZoneY, squareSize, squareSize);
      ctx.restore();

      g.t -= dt;
      // particles
      g.pieces.forEach(p => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.t -= dt;
        ctx.save();
        ctx.globalAlpha = p.t/particleLife;
        ctx.fillStyle   = colors[p.ci];
        ctx.fillRect(p.x-3, p.y-3, 6, 6);
        ctx.restore();
      });
      g.pieces = g.pieces.filter(p => p.t>0);
      if (g.t<=0 && g.pieces.length===0) effects.splice(gi,1);
    });

    // Accuracy texts
    texts.forEach((tx, ti) => {
      const alpha = tx.t/textDur;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign   = 'center';
      ctx.font        = '20px sans-serif';
      if (tx.text==='Perfect') {
        const grad = ctx.createLinearGradient(tx.x-40,tx.y-10,tx.x+40,tx.y+10);
        grad.addColorStop(0,'#ff0');
        grad.addColorStop(1,'#fff');
        ctx.fillStyle = grad;
      } else if (tx.text==='Excellent') {
        const grad = ctx.createLinearGradient(tx.x-40,tx.y-10,tx.x+40,tx.y+10);
        grad.addColorStop(0,'#f0f');
        grad.addColorStop(1,'#fff');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#fff';
      }
      ctx.fillText(tx.text, tx.x, tx.y);
      ctx.restore();
      tx.t -= dt;
      if (tx.t <= 0) texts.splice(ti,1);
    });

    requestAnimationFrame(draw);
  }
})();
