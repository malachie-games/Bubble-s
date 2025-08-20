
/* Bubble’s — polished build
   - Improved visuals (glass HUD, glossy bubbles, particles)
   - Sounds: pop/win/fail
   - Loss if timer ends with bubbles remaining
   - +3 or +4 bubbles per level (configurable)
*/
const arena = document.getElementById('arena');
const levelEl = document.getElementById('level');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const timerPath = document.getElementById('timer-path');

const btnPlay = document.getElementById('btnPlay');
const btnRestart = document.getElementById('btnRestart');
const btnPause = document.getElementById('btnPause');
const incBubblesSel = document.getElementById('incBubbles');
const levelTimeSel = document.getElementById('levelTime');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMsg = document.getElementById('overlayMsg');
const overlayBtn = document.getElementById('overlayBtn');

// Sounds
const sPop = document.getElementById('sfx-pop');
const sWin = document.getElementById('sfx-win');
const sFail = document.getElementById('sfx-fail');

let state = {
  running:false,
  paused:false,
  level:1,
  score:0,
  baseBubbles:6, // starting point
  incPerLevel: 3, // user can switch to 4
  timePerLevel: 25, // seconds
  remaining:0,
  timerId:null,
  tStart:0,
  tLeft:0
};

// Resize observer for collision-safe padding
function rand(min, max){ return Math.random()*(max-min)+min; }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

function formatTime(s){
  return String(Math.max(0, Math.ceil(s))).padStart(2,'0');
}

// Timer ring progress (0..1)
function setRing(p){
  const dash = clamp(100 * (1 - p), 0, 100);
  timerPath.style.strokeDasharray = "100 100";
  timerPath.style.strokeDashoffset = String(dash);
}

function playSound(aud){
  try {
    aud.currentTime = 0;
    aud.play();
  } catch(e){ /* autoplay might be blocked until first user gesture */ }
}

function showOverlay(title, msg, type){
  overlayTitle.textContent = title;
  overlayMsg.textContent = msg;
  overlay.classList.remove('hidden');
}

function hideOverlay(){
  overlay.classList.add('hidden');
}

function reset(){
  clearInterval(state.timerId);
  state.running = false;
  state.paused = false;
  state.level = 1;
  state.score = 0;
  updateHUD();
  clearArena();
  setRing(0);
}

function updateHUD(){
  levelEl.textContent = state.level;
  scoreEl.textContent = state.score;
}

function clearArena(){
  arena.querySelectorAll('.bubble, .particle').forEach(n => n.remove());
}

function particleBurst(x,y, count=12){
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = (x-3) + 'px';
    p.style.top = (y-3) + 'px';
    const ang = rand(0, Math.PI*2);
    const dist = rand(20, 80);
    p.style.setProperty('--dx', Math.cos(ang)*dist + 'px');
    p.style.setProperty('--dy', Math.sin(ang)*dist + 'px');
    arena.appendChild(p);
    setTimeout(()=>p.remove(), 650);
  }
}

function spawnBubbles(count){
  const rect = arena.getBoundingClientRect();
  const pad = 24;
  for(let i=0;i<count;i++){
    const size = rand(42, 82);
    const x = rand(pad, rect.width - size - pad);
    const y = rand(pad, rect.height - size - pad);
    const b = document.createElement('div');
    b.className = 'bubble spark';
    b.style.setProperty('--size', size+'px');
    b.style.setProperty('--floatDur', rand(2.5, 4.2)+'s');
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    // subtle hue
    const hue = Math.floor(rand(180, 320));
    b.style.filter = `hue-rotate(${hue}deg)`;
    b.addEventListener('pointerdown', onPop);
    arena.appendChild(b);
    setTimeout(()=> b.classList.remove('spark'), 250);
  }
  state.remaining = count;
}

function onPop(e){
  if(!state.running || state.paused) return;
  const b = e.currentTarget;
  b.classList.add('pop');
  b.style.pointerEvents = 'none';
  const rect = b.getBoundingClientRect();
  particleBurst(rect.left + rect.width/2, rect.top + rect.height/2, 10);
  playSound(sPop);
  setTimeout(()=> b.remove(), 180);
  state.remaining--;
  state.score += 10;
  updateHUD();
  if(state.remaining <= 0){
    onWin();
  }
}

function nextLevelBubbleCount(){
  // Increase bubbles by +3 or +4 per level, starting from base
  const inc = state.incPerLevel;
  return state.baseBubbles + (state.level-1)*inc;
}

function startLevel(){
  clearArena();
  const count = nextLevelBubbleCount();
  spawnBubbles(count);
  runTimer(state.timePerLevel);
}

function runTimer(seconds){
  clearInterval(state.timerId);
  const start = performance.now();
  state.tStart = start;
  state.tLeft = seconds;
  setRing(0);
  timeEl.textContent = formatTime(seconds);

  state.timerId = setInterval(()=>{
    const elapsed = (performance.now() - state.tStart)/1000;
    const left = seconds - elapsed;
    state.tLeft = left;
    timeEl.textContent = formatTime(left);
    const p = clamp(elapsed/seconds, 0, 1);
    setRing(p);
    if(left <= 0){
      clearInterval(state.timerId);
      if(state.remaining > 0){
        onFail();
      }else{
        onWin();
      }
    }
  }, 80);
}

function onWin(){
  playSound(sWin);
  state.running = false;
  clearInterval(state.timerId);
  showOverlay('Bravo 👏', `Tu as validé le niveau ${state.level}. Prêt pour le suivant ?`);
  overlayBtn.onclick = ()=>{
    hideOverlay();
    state.level++;
    updateHUD();
    state.running = true;
    startLevel();
  };
}

function onFail(){
  playSound(sFail);
  state.running = false;
  clearInterval(state.timerId);
  // Count remaining bubbles to show feedback
  showOverlay('Raté 😅', `Il restait ${state.remaining} bulle(s). Réessaye ce niveau ?`);
  overlayBtn.onclick = ()=>{
    hideOverlay();
    state.running = true;
    startLevel();
  };
}

// Controls
btnPlay.addEventListener('click', ()=>{
  hideOverlay();
  state.incPerLevel = parseInt(incBubblesSel.value, 10);
  state.timePerLevel = parseInt(levelTimeSel.value, 10);
  if(!state.running){
    state.running = true;
    startLevel();
  }
});

btnRestart.addEventListener('click', ()=>{
  reset();
  hideOverlay();
});

btnPause.addEventListener('click', ()=>{
  if(!state.running) return;
  state.paused = !state.paused;
  btnPause.textContent = state.paused ? 'Reprendre' : 'Pause';
  if(state.paused){
    clearInterval(state.timerId);
  }else{
    // resume timer
    runTimer(state.tLeft);
  }
});

// Keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  if(e.key === ' '){
    e.preventDefault();
    btnPause.click();
  }else if(e.key === 'Enter'){
    btnPlay.click();
  }else if(e.key.toLowerCase() === 'r'){
    btnRestart.click();
  }
});

// Auto layout safety on resize
let resizeTO;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTO);
  resizeTO = setTimeout(()=>{
    if(state.running && !state.paused){
      // reflow bubbles within new bounds
      const nodes = [...arena.querySelectorAll('.bubble')];
      const rect = arena.getBoundingClientRect();
      const pad = 24;
      nodes.forEach(b=>{
        const size = parseFloat(getComputedStyle(b).getPropertyValue('--size'));
        const x = clamp(parseFloat(b.style.left), pad, rect.width - size - pad);
        const y = clamp(parseFloat(b.style.top), pad, rect.height - size - pad);
        b.style.left = x+'px';
        b.style.top = y+'px';
      });
    }
  }, 120);
});

// Expose simple API for custom sounds
window.BubblesConfig = {
  setSounds({pop, win, fail}){
    if(pop) sPop.src = pop;
    if(win) sWin.src = win;
    if(fail) sFail.src = fail;
  }
};

// Initial overlay
showOverlay('Bubble’s', 'Clique “Jouer”. Pop toutes les bulles avant la fin du chrono pour gagner le niveau.');
overlayBtn.onclick = ()=> overlay.classList.add('hidden');
