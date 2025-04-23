(() => {
  // Elements & state
  const canvas      = document.getElementById('gameCanvas');
  const ctx         = canvas.getContext('2d');
  const scoreDiv    = document.getElementById('score');
  const percentDiv  = document.getElementById('percent');
  const msgDiv      = document.getElementById('message');
  const pauseBtn    = document.getElementById('pauseButton');
  const audio       = document.getElementById('gameAudio');
  const overlay     = document.getElementById('leaderboardOverlay');
  const finalScoreP = document.getElementById('finalScore');
  const initialsIn  = document.getElementById('initials');
  const submitBtn   = document.getElementById('submitScore');
  const boardList   = document.getElementById('leaderboardList');
  const closeBtn    = document.getElementById('closeLeaderboard');

  let started       = false;
  let paused        = false;
  let score         = 0;
  let totalNotes    = 0;
  let spawnIntID    = null;
  const squares     = [];
  const particles   = [];
  const squareSize  = 50;
  const flashDuration   = 0.2; // secs
  const particleLifetime = 0.5;

  // Resize & lanes
  let hitZoneY;
  const lanes = [{x:0},{x:0},{x:0}];
  function resize(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    hitZoneY      = canvas.height - 100;
    lanes[0].x = canvas.width*0.25;
    lanes[1].x = canvas.width*0.50;
    lanes[2].x = canvas.width*0.75;
  }
  window.addEventListener('resize', resize);
  resize();

  // Timing
  const bpm            = 135;
  const beatInterval   = 60/bpm;
  const travelTime     = beatInterval*2;
  const fps            = 60;
  const pixelsPerFrame = (hitZoneY+squareSize)/(travelTime*fps);
  const spawnMs        = (beatInterval*1000)/4;

  // Colors
  const colors = ['#0ff','#f0f','#0f0'];

  // Input
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if(!started)       startGame();
    else if(!paused)   handleHit(e);
  },{passive:false});

  // Start
  function startGame(){
    started = true;
    msgDiv.style.display   = 'none';
    pauseBtn.style.display = 'block';
    audio.currentTime = 0;
    audio.play().catch(console.warn);
    audio.addEventListener('ended', onGameEnd);
    spawnSquare();
    spawnIntID = setInterval(spawnSquare,spawnMs);
    requestAnimationFrame(draw);
  }

  // Pause
  pauseBtn.addEventListener('click', e=>{
    e.stopPropagation();
    if(!started) return;
    paused = !paused;
    if(paused){
      audio.pause();
      clearInterval(spawnIntID);
      pauseBtn.textContent='Resume';
    } else {
      audio.play().catch(console.warn);
      spawnIntID=setInterval(spawnSquare,spawnMs);
      pauseBtn.textContent='Pause';
      requestAnimationFrame(draw);
    }
  });

  // Spawn
  function spawnSquare(){
    if(Math.random()<0.5){
      squares.push({ y:-squareSize, lane:Math.floor(Math.random()*3) });
      totalNotes++;
      updatePercent();
    }
  }

  // Hit handling
  function handleHit(e){
    const r = canvas.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX)-r.left;
    for(let i=squares.length-1;i>=0;i--){
      const sq = squares[i], lx=lanes[sq.lane].x;
      const margin=30;
      if(x>=lx-squareSize/2-margin && x<=lx+squareSize/2+margin &&
         sq.y>=hitZoneY-margin && sq.y<=hitZoneY+squareSize+margin){
        squares.splice(i,1);
        score++; updatePercent();
        // score pop
        scoreDiv.classList.add('pop');
        scoreDiv.addEventListener('animationend',()=>{
          scoreDiv.classList.remove('pop');
        },{once:true});
        // flash
        particles.push({ lane:sq.lane, t:flashDuration, pieces:spawnParticles(lx,hitZoneY+squareSize/2) });
        return;
      }
    }
  }

  // Spawn particles for break-apart
  function spawnParticles(x,y){
    const arr=[];
    for(let i=0;i<8;i++){
      const ang = Math.random()*Math.PI*2;
      const speed = 100+Math.random()*100;
      arr.push({ x,y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed, t:particleLifetime });
    }
    return arr;
  }

  // Update percent
  function updatePercent(){
    const pct = totalNotes?Math.round(score/totalNotes*100):0;
    percentDiv.textContent = pct+'%';
  }

  // On end
  function onGameEnd(){
    paused = true;
    clearInterval(spawnIntID);
    finalScoreP.textContent = `Score: ${score} (${percentDiv.textContent})`;
    loadLeaderboard();
    overlay.style.display='block';
  }

  // Leaderboard
  function loadLeaderboard(){
    const board = JSON.parse(localStorage.getItem('leaderboard')||'[]');
    boardList.innerHTML='';
    board.slice(0,5).forEach(rec=>{
      const li=document.createElement('li');
      li.textContent=`${rec.initials} - ${rec.score} (${rec.percent}%)`;
      boardList.appendChild(li);
    });
  }
  submitBtn.addEventListener('click',()=>{
    const initials=initialsIn.value.toUpperCase().slice(0,3)||'---';
    const board=JSON.parse(localStorage.getItem('leaderboard')||'[]');
    board.unshift({ initials, score, percent:percentDiv.textContent.replace('%','') });
    localStorage.setItem('leaderboard', JSON.stringify(board.slice(0,10)));
    loadLeaderboard();
  });
  closeBtn.addEventListener('click',()=> overlay.style.display='none');

  // Draw loop
  function draw(){
    if(paused) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // hit zones
    ctx.strokeStyle='#555';
    lanes.forEach(lane=>{
      ctx.strokeRect(lane.x-squareSize/2,hitZoneY,squareSize,squareSize);
    });
    // squares as picks (triangles)
    squares.forEach(sq=>{
      sq.y+=pixelsPerFrame;
      const lx=lanes[sq.lane].x;
      ctx.fillStyle = colors[sq.lane];
      ctx.beginPath();
      ctx.moveTo(lx, sq.y);
      ctx.lineTo(lx - squareSize/2, sq.y + squareSize*1.1);
      ctx.lineTo(lx + squareSize/2, sq.y + squareSize*1.1);
      ctx.closePath();
      ctx.fill();
    });
    // remove off-screen
    for(let i=squares.length-1;i>=0;i--){
      if(squares[i].y>canvas.height) squares.splice(i,1);
    }
    // flashes and particles
    const dt=1/fps;
    for(let i=particles.length-1;i>=0;i--){
      const group = particles[i];
      // flash
      const alpha = group.t/flashDuration;
      const lx = lanes[group.lane].x;
      ctx.save(); ctx.globalAlpha=alpha;
      ctx.fillStyle='#fff';
      ctx.fillRect(lx-squareSize/2,hitZoneY,squareSize,squareSize);
      ctx.restore();
      // pieces
      group.pieces.forEach(p=>{
        p.x += p.vx*dt; p.y += p.vy*dt; p.t -= dt;
        ctx.save(); ctx.globalAlpha = p.t/particleLifetime;
        ctx.fillStyle = colors[group.lane];
        ctx.fillRect(p.x-3,p.y-3,6,6);
        ctx.restore();
      });
      group.t -= dt;
      if(group.t<=0) particles.splice(i,1);
      else group.pieces = group.pieces.filter(p=>p.t>0);
    }
    requestAnimationFrame(draw);
  }
})();
