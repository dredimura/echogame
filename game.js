// -- Elements --
const canvas   = document.getElementById('gameCanvas');
const ctx      = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const msgDiv   = document.getElementById('message');
const pauseBtn = document.getElementById('pauseButton');
const audio    = document.getElementById('gameAudio');

// -- State --
let started    = false;
let paused     = false;
let score      = 0;
const squares  = [];
const squareSize = 50;

// Hit zone and lanes (will be set in resize())
let hitZoneY;
const lanes = [{x:0},{x:0},{x:0}];

// -- Resize & Setup Canvas --
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  hitZoneY = canvas.height - 100;
  lanes[0].x = canvas.width * 0.25;
  lanes[1].x = canvas.width * 0.50;
  lanes[2].x = canvas.width * 0.75;
}
window.addEventListener('resize', resize);
resize();

// -- Timing Config --
const bpm             = 135;
const beatInterval    = 60 / bpm;                
const travelBeats     = 2;                      
const travelTime      = beatInterval * travelBeats; 
const fps             = 60;
const pixelsPerFrame  = (hitZoneY + squareSize) / (travelTime * fps);
const spawnIntervalMs = (beatInterval * 1000) / 4;  // 16th-note

// -- Input Handling --
canvas.addEventListener('touchstart', onTap, {passive:false});
canvas.addEventListener('mousedown', onTap);

function onTap(e) {
  e.preventDefault();
  if (!started) {
    startGame();
  } else if (!paused) {
    registerHit(e);
  }
}

// -- Start Game --
let spawnIntervalID;
function startGame() {
  started = true;
  msgDiv.style.display = 'none';
  pauseBtn.style.display = 'block';

  // play audio
  audio.currentTime = 0;
  audio.play().catch(console.warn);

  // spawn one immediately
  spawnSquare();
  // schedule random spawns
  spawnIntervalID = setInterval(spawnSquare, spawnIntervalMs);

  requestAnimationFrame(draw);
}

// -- Pause/Resume --
pauseBtn.addEventListener('click', () => {
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
    const laneIndex = Math.floor(Math.random() * lanes.length);
    squares.push({ y: -squareSize, lane: laneIndex });
  }
}

// -- Hit Detection + Effects --
function registerHit(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const x = clientX - rect.left;

  for (let i = squares.length - 1; i >= 0; i--) {
    const sq = squares[i];
    const laneX = lanes[sq.lane].x;
    if (x >= laneX - squareSize/2 &&
        x <= laneX + squareSize/2 &&
        sq.y >= hitZoneY &&
        sq.y <= hitZoneY + squareSize) {

      // remove square
      squares.splice(i,1);

      // increment score + pop animation
      score++;
      scoreDiv.textContent = `Score: ${score}`;
      scoreDiv.classList.add('pop');
      scoreDiv.addEventListener('animationend', () => {
        scoreDiv.classList.remove('pop');
      }, { once: true });

      // draw a brief flash circle effect
      flashEffect(laneX, hitZoneY + squareSize/2);
      return;
    }
  }
}

// store and render hit effects
const effects = [];
function flashEffect(x, y) {
  effects.push({ x, y, t: 0.3 });
}

// -- Draw Loop --
function draw() {
  if (paused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw hit zones
  ctx.strokeStyle = '#555';
  lanes.forEach(lane => {
    ctx.strokeRect(lane.x - squareSize/2, hitZoneY, squareSize, squareSize);
  });

  // update & draw squares
  squares.forEach(sq => {
    sq.y += pixelsPerFrame;
    const laneX = lanes[sq.lane].x;
    ctx.fillStyle = '#0ff';
    ctx.fillRect(laneX - squareSize/2, sq.y, squareSize, squareSize);
  });
  // remove off-screen squares
  for (let i = squares.length -1; i>=0; i--) {
    if (squares[i].y > canvas.height) squares.splice(i,1);
  }

  // update & draw effects
  effects.forEach((fx,idx) => {
    const alpha = fx.t/0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 4 * alpha;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, squareSize, 0, 2*Math.PI);
    ctx.stroke();
    ctx.restore();
    fx.t -= 1/fps;
    if (fx.t <= 0) effects.splice(idx,1);
  });

  requestAnimationFrame(draw);
}
