// ---- Setup & State ----
const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');
const scoreDiv    = document.getElementById('score');
const msgDiv      = document.getElementById('message');

let started       = false;
let score         = 0;
const squares     = [];
const squareSize  = 50;
const hitZoneY    = canvas.height - 100;

// 3 lanes at 25%, 50%, 75% across the canvas
const lanes = [
  { x: canvas.width * 0.25 },
  { x: canvas.width * 0.50 },
  { x: canvas.width * 0.75 },
];

// Timing (135 BPM, 2-beat travel)
const bpm               = 135;
const beatInterval      = 60 / bpm;         // seconds per beat
const travelBeats       = 2;
const travelTime        = beatInterval * travelBeats;
const fps               = 60;
const pixelsPerFrame    = (hitZoneY + squareSize) / (travelTime * fps);
const scheduleInterval  = '16n';            // every 16th note

// ---- Unified Tap/Click Handler ----
function onUserTap(e) {
  // 5) Prevent default to ensure this is treated as a user gesture
  e.preventDefault();

  // First tap = start the game
  if (!started) {
    started = true;
    msgDiv.style.display = 'none';
    startGame();
  } 
  // Subsequent taps = hit detection
  else {
    handleHit(e);
  }
}

// Attach to both pointerdown and touchstart so phones always fire it
['pointerdown','touchstart'].forEach(evt =>
  canvas.addEventListener(evt, onUserTap, { passive: false })
);

async function startGame() {
  // 6) Unlock/resume audio context
  await Tone.start();

  // 7) Play your song (must be uploaded as 'mysong.mp3')
  new Tone.Player({
    url: 'mysong.mp3',
    autostart: true,
    loop:    false
  }).toDestination();

  // 8) Configure transport & random drops
  Tone.Transport.bpm.value = bpm;
  Tone.Transport.scheduleRepeat((time) => {
    if (Math.random() < 0.5) {
      const laneIndex = Math.floor(Math.random() * lanes.length);
      squares.push({ y: -squareSize, lane: laneIndex });
    }
  }, scheduleInterval);

  Tone.Transport.start();
  requestAnimationFrame(draw);
}

function handleHit(e) {
  // Determine touch/click X coordinate
  const rect = canvas.getBoundingClientRect();
  let clientX;
  if (e.type === 'touchstart') clientX = e.touches[0].clientX;
  else clientX = e.clientX;

  const x = clientX - rect.left;

  // Check each lane for a square in the hit zone
  lanes.forEach((lane, idx) => {
    if (x >= lane.x - squareSize/2 && x <= lane.x + squareSize/2) {
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
          return;  // break out once you hit one
        }
      }
    }
  });
}

// ---- Render Loop ----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw hit-zone outlines
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
    const sq    = squares[i];
    sq.y       += pixelsPerFrame;
    const laneX = lanes[sq.lane].x;

    ctx.fillStyle = '#0ff';
    ctx.fillRect(
      laneX - squareSize/2,
      sq.y,
      squareSize,
      squareSize
    );

    if (sq.y > canvas.height) {
      squares.splice(i, 1);
    }
  }

  requestAnimationFrame(draw);
}
