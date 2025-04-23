// grab the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// game state
const squares    = [];
let score        = 0;
const hitZoneY   = canvas.height - 100;
const squareSize = 50;

// timing (adjust bpm to match your song)
const bpm          = 120;
const beatInterval = 60 / bpm;        // seconds per beat
const travelBeats  = 2;               // how many beats the square falls
const travelTime   = beatInterval * travelBeats;
const pixelsPerFrame = (hitZoneY + squareSize) / (travelTime * 60);

// load your song (must be uploaded as mysong.mp3)
const player = new Tone.Player({
  url: 'mysong.mp3',
  autostart: false,
  loop: false
}).toDestination();

// start button handler
document.getElementById('startButton').addEventListener('click', async () => {
  await Tone.start();      // unlock audio
  player.start(0);         // play your track immediately
  Tone.Transport.bpm.value = bpm;

  // schedule a square every quarter-note
  Tone.Transport.scheduleRepeat((time) => {
    squares.push({ y: -squareSize });
  }, '4n');

  Tone.Transport.start();
  document.getElementById('startButton').style.display = 'none';
  requestAnimationFrame(draw);
});

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
