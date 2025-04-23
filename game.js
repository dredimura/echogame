(() => {
  // -- Elements & State --
  const canvas   = document.getElementById('gameCanvas');
  const ctx      = canvas.getContext('2d');
  const scoreDiv = document.getElementById('score');
  const msgDiv   = document.getElementById('message');
  const pauseBtn = document.getElementById('pauseButton');
  const audio    = document.getElementById('gameAudio');

  let started    = false;
  let paused     = false;
  let score      = 0;
  let spawnIntervalID = null;
  const squares  = [];
  const squareSize = 50;
  const flashes  = [];
  const flashDuration = 0.2; // seconds

  // -- Resize & Lanes Setup --
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

  // -- Timing Config (135 BPM, travel & spawn) --
  const bpm             = 135;
  const beatInterval    = 60 / bpm;                 
  const travelBeats     = 2;                        
  const travelTime      = beatInterval * travelBeats;
  const fps             = 60;
  const pixelsPerFrame  = (hitZoneY + squareSize) / (travelTime * fps);
  const spawnIntervalMs = (beatInterval * 1000) / 4; // 16th notes

  // -- Colors per lane --
  const colors = ['#0ff','#f0f','#0f0']; // blue, pink, neon-green

  // -- Input Handling --
  canvas.addEventListener('pointerdown', onTap, { passive: false });

  function onTap(e) {
    e.preventDefault();
    if (!started)      startGame();
    else if (!paused)  registerHit(e);
  }

  // -- Start Game --
  function startGame() {
    started = true;
    msgDiv.style.display   = 'none';
    pauseBtn.style.display = 'block';

    // play track
    audio.currentTime = 0;
    audio.play().catch(console.warn);

    // initial square & recurring spawns
    spawnSquare();
    spawnIntervalID = setInterval(spawnSquare, spawnIntervalMs);

    requestAnimationFrame(draw);
  }

  // -- Pause / Resume --
  pauseBtn.addEventListener('click', e => {
    e.stopPropagation(); // don’t trigger canvas tap
    if (!started) return;
    paused = !paused;
    if (paused) {
      audio.pause();
      clearInterval(spawnIntervalID);
      pauseBtn.textContent = 'Resume';
    } else {
      audio.play().catch(console.warn);
      spawnIntervalID = setInterval(spawnSquare, spawnIntervalMs);
      pauseBtn.textContent = 'Pause';
      requestAnimationFrame(draw);
    }
  });

  // -- Spawn Logic --
  function spawnSquare() {
    if (Math.random() < 0.5) {
      const lane = Math.floor(Math.random() * lanes.length);
      squares.push({ y: -squareSize, lane });
    }
  }

  // -- Hit Detection + Effects --
  function registerHit(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
    const x = clientX - rect.left;

    for (let i = squares.length - 1; i >= 0; i--) {
      const sq = squares[i];
      const laneX = lanes[sq.lane].x;
      if (
        x >= laneX - squareSize/2 &&
        x <= laneX + squareSize/2 &&
        sq.y >= hitZoneY &&
        sq.y <= hitZoneY + squareSize
      ) {
        squares.splice(i,1);

        // score & pop
        score++;
        scoreDiv.textContent = `Score: ${score}`;
        scoreDiv.classList.add('pop');
        scoreDiv.addEventListener('animationend',
          () => scoreDiv.classList.remove('pop'),
          { once: true }
        );

        // lane flash
        flashes.push({ lane: sq.lane, alpha: 1 });
        return;
      }
    }
  }

  // -- Draw Loop --
  function draw() {
    if (paused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw hit‐zones
    ctx.strokeStyle = '#555';
    lanes.forEach(lane => {
      ctx.strokeRect(
        lane.x - squareSize/2,
        hitZoneY,
        squareSize,
        squareSize
      );
    });

    // draw & move squares
    for (let i = squares.length - 1; i >= 0; i--) {
      const sq = squares[i];
      sq.y += pixelsPerFrame;
      const laneX = lanes[sq.lane].x;
      ctx.fillStyle = colors[sq.lane];
      ctx.fillRect(
        laneX - squareSize/2,
        sq.y,
        squareSize,
        squareSize
      );
      if (sq.y > canvas.height) squares.splice(i,1);
    }

    // draw & fade flashes
    for (let i = flashes.length - 1; i >= 0; i--) {
      const fx = flashes[i];
      const laneX = lanes[fx.lane].x;
      ctx.save();
      ctx.globalAlpha = fx.alpha;
      ctx.fillStyle = '#fff';
      ctx.fillRect(
        laneX - squareSize/2,
        hitZoneY,
        squareSize,
        squareSize
      );
      ctx.restore();
      fx.alpha -= 1 / (fps * flashDuration);
      if (fx.alpha <= 0) flashes.splice(i,1);
    }

    requestAnimationFrame(draw);
  }
})();
