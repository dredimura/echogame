// ---- Setup ----
const canvas     = document.getElementById('gameCanvas');
const ctx        = canvas.getContext('2d');
const scoreDiv   = document.getElementById('score');
const msgDiv     = document.getElementById('message');

let started      = false;
let score        = 0;
const squares    = [];
const squareSize = 50;
const hitZoneY   = canvas.height - 100;

// Lanes configuration (3 lanes: 25%, 50%, 75% across the width)
const lanes = [
  { x: canvas.width * 0.25 },
  { x: canvas.width * 0.50 },
  { x: canvas.width * 0.75 },
];

// Timing & speed (135 BPM, 2-beat travel)
const bpm          = 135;
const beatInterval = 60 / bpm;        // seconds per beat
const travelBeats  = 2;               // squares fall for 2 beats
const travelTime   = beatInterval * travelBeats;
const fps          = 60;
const pixelsPerFrame = (hitZoneY + squareSize) / (travelTime * fps);

// Schedule interval: 16th notes (sub-divide each beat into 4)
const scheduleInterval = '16n';

// ---- Touch Handler: Start or Hit ----
canvas.addEventListener('pointerdown', async (e) => {
  if (!started) {
    // ---- Kick off the game ----
    started = true;
    msgDiv.style.display = 'none';

    await Tone.start();                // unlock audio on first tap

    // play your song (upload mysong.mp3 alongside these files)
    new Tone.Player({
      url: 'mysong.mp3',
      autostart: true,
      loop:  false
    }).toDestination();

    Tone.Transport.bpm.value = bpm;

    // schedule random drops on each 16th note
    Tone.Transport.scheduleRepeat((time) => {
      if (Math.random() < 0.5) {       // 50% chance per subdivision
        const laneIndex = Math.floor(Math.random() * lanes.length);
        squares.push({ y: -squareSize, lane: laneIndex });
      }
    }, scheduleInterval);

    Tone.Transport.start();
    requestAnimationFrame(draw);

  } else {
    // ---- Tap = hit detection ----
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // find which lane was tapped
    lanes.forEach((lane, idx) => {
      if (x >= lane.x - squareSize/2 && x <= lane.x + squareSize/2) {
        // check for a square in the hit zone
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
});

// ---- Render Loop ----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw hit-zones
  ctx.strokeStyle = '#555';
  lanes.forEach(lane => {
    ctx.strokeRect(
      lane.x - squareSize/2,
      hitZoneY,
      squareSize,
      squareSize
    );
  });

  // update & draw squares
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

    // remove if off-screen
    if (sq.y > canvas.height) squares.splice(i, 1);
  }

  requestAnimationFrame(draw);
}
