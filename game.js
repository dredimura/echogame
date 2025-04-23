// -- Elements & State --
const canvas   = document.getElementById('gameCanvas');
const ctx      = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const msgDiv   = document.getElementById('message');
const pauseBtn = document.getElementById('pauseButton');
const audio    = document.getElementById('gameAudio');

let started      = false;
let paused       = false;
let score        = 0;
const squares    = [];
const squareSize = 50;

// Effects for hit‐zone flash
const flashes = [];
const flashDuration = 0.2; // seconds

// -- Canvas Resize & Lanes/Zone Setup --
let hitZoneY;
const lanes = [{x:0},{x:0},{x:0}];

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  hitZoneY      = canvas.height - 100;
  lanes[0].x    = canvas.width * 0.25;
  lanes[1].x    = canvas.width * 0.50;
  lanes[2].x    = canvas.width * 0.75;
}
window.addEventListener('resize', resize);
resize();

// -- Timing Config (135 BPM, 16th‐note spawn) --
const bpm             = 135;
const beatInterval    = 60 / bpm;
const travelBeats     = 2;
const travelTime      = beatInterval * travelBeats;
const fps             = 60;
const pixelsPerFrame  = (hitZoneY + squareSize) / (travelTime * fps);
const spawnIntervalMs = (beatInterval * 1000) / 4;
let spawnIntervalID;

// -- Input Handling --
canvas.addEventListener('touchstart', onTap, {passive:false});
canvas.addEventListener('mousedown', onTap);

function onTap(e) {
  e.preventDefault();
  if (!started)        return startGame();
  if (paused)          return;
  registerHit(e);
}

// -- Start Game --
function startGame() {
  started         = true;
  msgDiv.style.display   = 'none';
  pauseBtn.style.display = 'block';

  // play track
  audio.currentTime = 0;
  audio.play().catch(console.warn);

  // initial immediate spawn
  spawnSquare();
  // regular random spawns
  spawnIntervalID = setInterval(spawnSquare, spawnIntervalMs);

  requestAnimationFrame(draw);
}

// -- Pause / Resume --
pauseBtn.addEventListener('click', () => {
  if (!started) return;
  paused = !paused;
  if (paused) {
    audio.pause();
    clearInterval(spawnIntervalID);
    pauseBtn.textContent = 'Resume';
  } else {
    audio.play().catch(console.warn);
    spawnIntervalID = setInterval(spawnSquare, spawnIntervalMs);
    pauseBtn.textContent = 'Pause';
    requestAnimationFrame(draw);
  }
});

// -- Spawn Logic --
function spawnSquare() {
  if (Math.random() < 0.5) {
    const laneIdx = Math.floor(Math.random() * lanes.length);
    squares.push({ y: -squareSize, lane: laneIdx });
  }
}

// -- Hit Detection + Flash & Score Pop --
function registerHit(e) {
  const rect    = canvas.getBoundingClientRect();
  const x       = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

  for (let i = squares.length - 1; i >= 0; i--) {
    const sq    = squares[i];
    const laneX = lanes[sq.lane].x;
    if (
      x >= laneX - squareSize/2 &&
      x <= laneX + squareSize/2 &&
      sq.y >= hitZoneY &&
      sq.y <= hitZoneY + squareSize
    ) {
      // remove square
      squares.splice(i,1);

      // score + pop
      score++;
      scoreDiv.textContent = `Score: ${score}`;
      scoreDiv.classList.add('pop');
      scoreDiv.addEventListener('animationend', () => {
        scoreDiv.classList.remove('pop');
      }, { once: true });

      // add flash effect
      flashes.push({ lane: sq.lane, t: flashDuration });
      return;
    }
  }
}

// -- Draw Loop --
function draw() {
  if (paused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw hit‐zones
  ctx.strokeStyle = '#555';
  lanes.forEach(lane => {
    ctx.strokeRect(lane.x - squareSize/2, hitZoneY, squareSize, squareSize);
  });

  // draw squares
  squares.forEach(sq => {
    sq.y += pixelsPerFrame;
    const laneX = lanes[sq.lane].x;
    ctx.fillStyle = '#0ff';
    ctx.fillRect(laneX - squareSize/2, sq.y, squareSize, squareSize);
  });
  // clean off‐screen
  for (let i = squares.length-1; i>=0; i--) {
    if (squares[i].y > canvas.height) squares.splice(i,1);
  }

  // draw & update flashes
  for (let i = flashes.length-1; i>=0; i--) {
    const f = flashes[i];
    const alpha = f.t / flashDuration;
    const laneX = lanes[f.lane].x;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.fillRect(
      laneX - squareSize/2,
      hitZoneY,
      squareSize,
      squareSize
    );
    ctx.restore();

    f.t -= 1/fps;
    if (f.t <= 0) flashes.splice(i,1);
  }

  requestAnimationFrame(draw);
}
