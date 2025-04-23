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

// Timing (135 BPM, squares fall for 2 beats)
const bpm               = 135;
const beatInterval      = 60 / bpm;         // seconds per beat
const travelBeats       = 2;                // how many beats to fall
const travelTime        = beatInterval * travelBeats;
const fps               = 60;
const pixelsPerFrame    = (hitZoneY + squareSize) / (travelTime * fps);
const scheduleInterval  = '16n';            // 16th-note subdivisions

// ---- Start & Tap Handler ----
canvas.addEventListener('click', onCanvasClick);

async function onCanvasClick(e) {
  if (!started) {
    // — First tap: unlock audio & kick off the song + drops
    started = true;
    msgDiv.style.display = 'none';

    // 1) Resume the AudioContext
    await Tone.start();

    // 2) Play your song (must have been uploaded as 'mysong.mp3')
    new Tone.Player({
      url: 'mysong.mp3',
      autostart: true,
      loop:    false
    }).toDestination();

    // 3) Configure the Transport
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.scheduleRepeat((time) => {
      // 50% chance each 16th note
      if (Math.random() < 0.5) {
        const laneIndex = Math.floor(Math.random() * lanes.length);
        squares.push({ y: -squareSize, lane: laneIndex });
      }
    }, scheduleInterval);

    Tone.Transport.start();
    requestAnimationFrame(draw);

  } else {
    // — Subsequent taps: hit detection
    const rect  = canvas.getBoundingClientRect();
    const x     = e.clientX - rect.left;

    lanes.forEach((lane, idx) => {
      // if tap is inside this lane’s box
      if (x >= lane.x - squareSize/2 && x <= lane.x + squareSize/2) {
        // look for a square in the hit zone
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
            break;
          }
        }
      }
    });
  }
}

// ---- Render Loop ----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw hit-zone outlines
  ctx.strokeStyle = '#555';
  lanes.forEach(lane => {
    ctx.strokeRect(
      lane.x - squareSize/2,
      hitZoneY,
      squareSize,
      squareSize
    );
  });

  // update & draw each square
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
