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
const beatInterval    = 60 / bpm;               // seconds per beat
const travelBeats     = 2;                      // how many beats squares fall
const travelTime      = beatInterval * travelBeats; // seconds
const fps             = 60;
const pixelsPerFrame  = (hitZoneY + squareSize) / (travelTime * fps);

// Spawn every 16th note = (beatInterval / 4) seconds
const spawnIntervalMs = (beatInterval * 1000) / 4;
let spawnIntervalID   = null;

// ---- Input Handling ----
// Capture taps/clicks on canvas
canvas.addEventListener('pointerdown', onTap, { passive: false });
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

  // Play the audio (HTML5 audio)
  audio.currentTime = 0;
  audio.play();

  // Begin spawning squares at random on each 16th note
  spawnIntervalID = setInterval(() => {
    if (Math.random() < 0.5) {              // 50% chance
      const laneIndex = Math.floor(Math.random() * lanes.length);
      squares.push({ y: -squareSize, lane: laneIndex });
    }
  }, spawnIntervalMs);

  // Kick off render loop
  requestAnimationFrame(draw);
}

// ---- Hit Detection ----
function handleHit(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const x = clientX - rect.left;

  lanes.forEach((lane, idx) => {
    if (x >= lane.x - squareSize/2 && x <= lane.x + squareSize/2) {
      // Look for a square in the hit zone
      for (let i = squares.length - 1; i >= 0; i--) {
        const sq = squares[i];
        if (
          sq.lane === idx &&
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
  });
}

// ---- Render Loop ----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the hit-zone outlines
  ctx.strokeStyle = '#555';
  lanes.forEach(lane => {
    ctx.strokeRect(
      lane.x - squareSize/2,
      hitZoneY,
      squareSize,
      squareSize
    );
  });

  // Update & draw squares
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

    // Remove if off-screen
    if (sq.y > canvas.height) {
      squares.splice(i, 1);
    }
  }

  requestAnimationFrame(draw);
}
