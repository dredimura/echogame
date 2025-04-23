// grab the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// game state
const squares    = [];
let score        = 0;
const hitZoneY   = canvas.height - 100;
const squareSize = 50;

// timing (adjust bpm to match your song)
const bpm            = 120;
const beatInterval   = 60 / bpm;        // seconds per beat
const travelBeats    = 2;               // how many beats the square falls
const travelTime     = beatInterval * travelBeats;
const pixelsPerFrame = (hitZoneY + squareSize) / (travelTime * 60);

// start button handler
document.getElementById('startButton').addEventListener('click', async () => {
  // 1) Unlock/resume the AudioContext (must be in a user gesture)
  await Tone.start();

  // 2) Instantiate and play your song AFTER context is unlocked
  const player = new Tone.Player({
    url: 'mysong.mp3',   // your uploaded file
    autostart: true,     // start immediately
    loop: false
  }).toDestination();

  // 3) Set the tempo
  Tone.Transport.bpm.value = bpm;

  // 4) Schedule a square every quarter-note
  Tone.Transport.scheduleRepeat((time) => {
    squares.push({ y: -squareSize });
  }, '4n');

  // 5) Start the transport (which drives the scheduling)
  Tone.Transport.start();

  // 6) Hide the button and kick off the render loop
  document.getElementById('startButton').style.display = 'none';
  requestAnimationFrame(draw);
});

// draw loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw the hit zone
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(
    (canvas.width - squareSize) / 2,
    hitZoneY,
    squareSize,
    squareSize
  );

  // move & draw each square
  for (let i = squares.length - 1; i >= 0; i--) {
    squares[i].y += pixelsPerFrame;
    ctx.fillStyle = '#0ff';
    ctx.fillRect(
      (canvas.width - squareSize) / 2,
      squares[i].y,
      squareSize,
      squareSize
    );
    // remove if it falls past the bottom
    if (squares[i].y > canvas.height) {
      squares.splice(i, 1);
    }
  }

  requestAnimationFrame(draw);
}

// hit detection on Spacebar
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    for (let i = squares.length - 1; i >= 0; i--) {
      const y = squares[i].y;
      if (y >= hitZoneY && y <= hitZoneY + squareSize) {
        score++;
        document.getElementById('score').textContent = `Score: ${score}`;
        squares.splice(i, 1);
        break;
      }
    }
  }
});
