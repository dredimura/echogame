// ---- Elements & State ----
const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');
const scoreDiv    = document.getElementById('score');
const msgDiv      = document.getElementById('message');
const pauseBtn    = document.getElementById('pauseButton');
const audio       = document.getElementById('gameAudio');

let started       = false;
let paused        = false;
let score         = 0;
const squares     = [];
const squareSize  = 50;
let spawnIntervalID = null;

// Full-screen canvas
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  // update hit zone and lanes after resize:
  hitZoneY = canvas.height - 100;
  lanes[0].x = canvas.width * 0.25;
  lanes[1].x = canvas.width * 0.50;
  lanes[2].x = canvas.width * 0.75;
}
window.addEventListener('resize', resize);
resize();

// Hit zone and lanes
let hitZoneY = canvas.height - 100;
const lanes = [
  { x: canvas.width * 0.25 },
  { x: canvas.width * 0.50 },
  { x: canvas.width * 0.75 },
];

// Timing (135 BPM, 2-beat travel)
const bpm             = 135;
const beatInterval    = 60 / bpm;               
const travelBeats     = 2;                      
const travelTime      = beatInterval * travelBeats; 
const fps             = 60;
const pixelsPerFrame  = (hitZoneY + squareSize) / (travelTime * fps);
const spawnIntervalMs = (beatInterval * 1000) / 4;  // 16th-note

// Store hit effects
const effects = [];
const effectDuration = 0.3; // seconds

// ---- Input Handling ----
canvas.addEventListener('touchstart', onTap, { passive:false });
canvas.addEventListener('mousedown', onTap);

function onTap(e) {
  e.preventDefault();
  if (!started) return startGame();
  if (paused) return;
  registerHit(e);
}

// ---- Game Start ----
function startGame() {
  started = true;
  msgDiv.style.display = 'none';
  pauseBtn.style.display = 'block';

  // Play audio
  audio.currentTime = 0;
  audio.play().catch(console.warn);

  // Immediate feedback
  spawnSquare();

  // Schedule random spawns
  spawnIntervalID = setInterval(spawnSquare, spawnIntervalMs);

  requestAnimationFrame(draw);
}

// ---- Pause / Resume ----
pauseBtn.addEventListener('click', () => {
  if (!started) return;
  if (!paused) {
    paused = true;
    audio.pause();
    clearInterval(spawnIntervalID);
    pauseBtn.textContent = 'Resume';
  } else {
    paused = false;
    audio.play().catch(console.warn);
    spawnIntervalID = setInterval(spawnSquare, spawnIntervalMs);
    pauseBtn.textContent = 'Pause';
    requestAnimationFrame(draw);
  }
});

// ---- Spawn Logic ----
function spawnSquare() {
  if (Math.random() < 0.5) {
    const laneIndex = Math.floor(Math.random() * lanes.length);
    squares.push({ y: -squareSize, lane: laneIndex });
  }
}

// ---- Hit Detection ----
function registerHit(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
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
      // Score
      squares.splice(i, 1);
      score += 1;
      scoreDiv.textContent = `Score: ${score}`;

      // Score pop
      scoreDiv.classList.add('score-pop');
      scoreDiv.addEventListener('animationend', () => {
        scoreDiv.classList.remove('score-pop');
      }, { once: true });

      // Hit effect
      effects.push({
        x: laneX,
        y: hitZoneY + squareSize/2,
        t: effectDuration
      });
      return;
    }
  }
}

// ---- Render Loop ----
function draw() {
  if (paused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw hit zones
  ctx.strokeStyle = '#555';
  lanes.forEach(lane => {
    ctx.strokeRect(
      lane.x - squareSize/2,
      hitZoneY,
      squareSize,
      squareSize
    );
  });

  // Draw & update squares
  for (let i = squares.length - 1; i >= 0; i--) {
    const sq = squares[i];
    sq.y += pixelsPerFrame;
    const laneX = lanes[sq.lane].x;
    ctx.fillStyle = '#0ff';
    ctx.fillRect(
      laneX - squareSize/2,
      sq.y,
      squareSize,
      squareSize
    );
    if (sq.y > canvas.height) squares.splice(i,1);
  }

  // Draw & update effects
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    const alpha = fx.t / effectDuration;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 4 * alpha;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, squareSize, 0, 2*Math.PI);
    ctx.stroke();
    ctx.restore();
    fx.t -= 1/fps;
    if (fx.t <= 0) effects.splice(i,1);
  }

  requestAnimationFrame(draw);
}
