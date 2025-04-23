// ---- Elements & State ----
const canvas   = document.getElementById('gameCanvas');
const ctx      = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const msgDiv   = document.getElementById('message');
const audio    = document.getElementById('gameAudio');

let started    = false;
let score      = 0;
const squares  = [];
const squareSize = 50;

// Fit canvas to full screen
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Hit zone
const hitZoneY = canvas.height - 100;

// Lanes at 25%, 50%, 75% width
const lanes = [
  { x: canvas.width * 0.25 },
  { x: canvas.width * 0.50 },
  { x: canvas.width * 0.75 },
];

// Timing (135 BPM, 2-beat fall, 16th-note spawn)
const bpm             = 135;
const beatInterval    = 60 / bpm;               // seconds per beat
const travelBeats     = 2;                      // beats to fall
const travelTime      = beatInterval * travelBeats; // seconds
const fps             = 60;
const pixelsPerFrame  = (hitZoneY + squareSize) / (travelTime * fps);
const spawnIntervalMs = (beatInterval * 1000) / 4;  // ms per 16th
let spawnIntervalID;

// ---- Touch / Click Handling ----
// Start or hit on first touch/click
canvas.addEventListener('touchstart', onTap, { passive: false });
canvas.addEventListener('mousedown', onTap);

function onTap(e) {
  e.preventDefault();
  if (!started) {
    startGame();
  } else {
    registerHit(e);
  }
}

// ---- Game Start ----
function startGame() {
  started = true;
  msgDiv.style.display = 'none';

  // Play your track immediately
  audio.currentTime = 0;
  audio.play().catch(err => console.log('Audio play failed:', err));

  // Show one square right away
  spawnSquare();

  // Then keep spawning randomly on 16th-note intervals
  spawnIntervalID = setInterval(spawnSquare, spawnIntervalMs);

  // Begin the draw loop
  requestAnimationFrame(draw);
}

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
      score++;
      scoreDiv.textContent = `Score: ${score}`;
      squares.splice(i, 1);
      return;
    }
  }
}

// ---- Draw Loop ----
function draw() {
  // Clear
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

  // Move & draw squares
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

    // Remove off-screen
    if (sq.y > canvas.height) squares.splice(i, 1);
  }

  requestAnimationFrame(draw);
}
