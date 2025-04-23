const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const squares = [];
let score = 0;
const hitZoneY = canvas.height - 100;
const squareSize = 50;
const bpm = 120;
const beatInterval = 60 / bpm;  // seconds per beat
const travelBeats = 2;          // number of beats squares travel before reaching hit zone
const travelTime = beatInterval * travelBeats;  // time to fall
const pixelsPerFrame = (hitZoneY + squareSize) / (travelTime * 60);  // assuming ~60fps

const synth = new Tone.MembraneSynth().toDestination();

document.getElementById('startButton').addEventListener('click', async () => {
  await Tone.start();
  Tone.Transport.bpm.value = bpm;
  Tone.Transport.scheduleRepeat((time) => {
    squares.push({ y: -squareSize });
    synth.triggerAttackRelease('C2', '8n', time);
  }, '4n');
  Tone.Transport.start();
  document.getElementById('startButton').style.display = 'none';
  requestAnimationFrame(draw);
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw hit zone
  ctx.strokeStyle = '#fff';
  ctx.strokeRect((canvas.width - squareSize) / 2, hitZoneY, squareSize, squareSize);

  // Update and draw squares
  for (let i = squares.length - 1; i >= 0; i--) {
    squares[i].y += pixelsPerFrame;
    ctx.fillStyle = '#0ff';
    ctx.fillRect((canvas.width - squareSize) / 2, squares[i].y, squareSize, squareSize);
    // Remove off-screen
    if (squares[i].y > canvas.height) {
      squares.splice(i, 1);
    }
  }

  requestAnimationFrame(draw);
}

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
