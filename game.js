// ---- Setup & State ----
const canvas     = document.getElementById('gameCanvas');
const ctx        = canvas.getContext('2d');
const scoreDiv   = document.getElementById('score');
const msgDiv     = document.getElementById('message');
const audio      = document.getElementById('gameAudio');

let started    = false;
let score      = 0;
const squares  = [];
const squareSize = 50;
const hitZoneY = canvas.height - 100;

// 3 lanes at 25%, 50%, 75% across the canvas
const lanes = [
  { x: canvas.width * 0.25 },
  { x: canvas.width * 0.50 },
  { x: canvas.width * 0.75 },
];

// Timing for 135 BPM
const bpm             = 135;
const beatInterval    = 60 / bpm;               
const travelBeats     = 2;                      
const travelTime      = beatInterval * travelBeats; 
const fps             = 60;
const pixelsPerFrame  = (hitZoneY + squareSize) / (travelTime * fps);

// Spawn every 16th note = (beatInterval/4) seconds
const spawnIntervalMs = (beatInterval * 1000) / 4;
let spawnIntervalID   = null;

// ---- Input Handling ----
// Desktop: mousedown; Mobile: touchstart
canvas.addEventListener('mousedown', onTap);
canvas.addEventListener('touchstart', onTap, { passive: false });

function onTap(e) {
  e.preventDefault();
  if (!started) {
    startGame();
  } else {
    handleHit(e);
  }
}

// ---- Game Start ----
function startGame() {
  started = true;
  msgDiv.style.display = 'none';

  // 1) Play audio (HTML5)
  audio.currentTime = 0;
  audio.play().catch(err => {
    console.log('Audio play failed:', err);
  });

  // 2) Spawn one square immediately so you see something
  spawnSquare();

  // 3) Then start random spawns
  spawnIntervalID = setInterval(spawnSquare, spawnIntervalMs);

  // 4) Kick off render loop
  requestAnimationFrame(draw);
}

// Helper to spawn a square in a random lane
function spawnSquare() {
  if (Math.random() < 0.5) {
    const laneIndex = Math.floor(Math.random() * lanes.length);
    squares.push({ y: -squareSize, lane: laneIndex });
  }
}

// ---- Hit Detection ----
function handleHit(e) {
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
      score++;
      scoreDiv.textContent = `Score: ${score}`;
      squares.splice(i, 1);
      return;
    }
  }
}

// ---- Render Loop ----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw hit-zones
  ctx.strokeStyle = '#555';
  lanes.forEach(lane => {
    ctx.strokeRect(lane.x - squareSize/2, hitZoneY, squareSize, squareSize);
  });

  // update & draw squares
  for (let i = squares.length - 1; i >= 0; i--) {
    const sq = squares[i];
    sq.y += pixelsPerFrame;
    const laneX = lanes[sq.lane].x;

    ctx.fillStyle = '#0ff';
    ctx.fillRect(laneX - squareSize/2, sq.y, squareSize, squareSize);

    if (sq.y > canvas.height) {
      squares.splice(i, 1);
    }
  }

  requestAnimationFrame(draw);
}
