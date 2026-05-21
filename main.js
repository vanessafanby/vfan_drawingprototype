const popup = document.getElementById("popup");
const okBtn = document.getElementById("okBtn");

const colorPicker = document.getElementById("colorPicker");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");

const toggleLoopBtn = document.getElementById("toggleLoopBtn");
const clearLoopBtn = document.getElementById("clearLoopBtn");

const recordingStatus = document.getElementById("recordingStatus");

const loopProgress = document.getElementById("loopProgress");

const recordDot = document.getElementById("recordDot");

const scaleSelect = document.getElementById("scaleSelect");

const volumeSlider = document.getElementById("volumeSlider");

const exportBtn = document.getElementById("exportBtn");

const toolButtons = document.querySelectorAll(".tool-btn");

const sizeButtons = document.querySelectorAll(".size-btn");

const stageContainer = document.getElementById("stage-container");

let currentTool = "pen";

let currentBrush = "medium";
let currentBrushWidth = 10;
let currentInstrument = "piano";

let isDrawing = false;
let currentLine = null;

let drawnShapes = [];
let redoShapes = [];

let lastSoundTime = 0;

let fluteSynth;
let pianoSynth;
let guitarSynth;
let activeSynth;

let audioStarted = false;

let recordedEvents = [];

let loopLength = 8000;

let isLooping = false;

let loopStartTime = null;

let loopAnimation;
let playbackInterval;

okBtn.addEventListener("click", async () => {
  popup.remove();

  await Tone.start();

  setupAudio();

  audioStarted = true;
});

const stage = new Konva.Stage({
  container: "stage-container",

  width: stageContainer.clientWidth,

  height: stageContainer.clientHeight,
});

const bgLayer = new Konva.Layer();

const drawLayer = new Konva.Layer();

const replayLayer = new Konva.Layer();

stage.add(bgLayer);
stage.add(drawLayer);
stage.add(replayLayer);

const background = new Konva.Rect({
  x: 0,
  y: 0,

  width: stage.width(),

  height: stage.height(),

  fillLinearGradientStartPoint: {
    x: 0,
    y: 0,
  },

  fillLinearGradientEndPoint: {
    x: 0,
    y: stage.height(),
  },

  fillLinearGradientColorStops: [0, "#fbf7fc", 1, "#eaf4f6"],

  listening: false,
});

bgLayer.add(background);

bgLayer.draw();

function setupAudio() {
  const reverb = new Tone.Reverb({
    decay: 5,
    wet: 0.3,
  }).toDestination();

  const delay = new Tone.FeedbackDelay({
    delayTime: "8n",

    feedback: 0.15,

    wet: 0.1,
  }).connect(reverb);

  fluteSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "sine",
    },

    envelope: {
      attack: 0.08,

      decay: 0.12,

      sustain: 0.35,

      release: 1.2,
    },

    volume: -10,
  }).connect(delay);

  pianoSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "triangle",
    },

    envelope: {
      attack: 0.02,

      decay: 0.2,

      sustain: 0.15,

      release: 1.4,
    },

    volume: -6,
  }).connect(delay);

  guitarSynth = new Tone.PluckSynth({
    attackNoise: 1.5,

    dampening: 1800,

    resonance: 0.95,
  }).connect(reverb);

  setBrushType("medium");
}

function setBrushType(type) {
  currentBrush = type;

  sizeButtons.forEach((btn) => {
    btn.classList.remove("active");
  });

  document.querySelector(`[data-size="${type}"]`).classList.add("active");

  if (type === "small") {
    currentBrushWidth = 4;

    currentInstrument = "flute";

    activeSynth = fluteSynth;
  }

  if (type === "medium") {
    currentBrushWidth = 10;

    currentInstrument = "piano";

    activeSynth = pianoSynth;
  }

  if (type === "large") {
    currentBrushWidth = 20;

    currentInstrument = "guitar";

    activeSynth = guitarSynth;
  }
}

sizeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setBrushType(btn.dataset.size);
  });
});

toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toolButtons.forEach((b) => {
      b.classList.remove("active");
    });

    btn.classList.add("active");

    currentTool = btn.dataset.tool;
  });
});

const pentatonicNotes = ["C5", "A4", "G4", "E4", "D4", "C4", "A3"];

const majorNotes = ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"];

const minorNotes = ["C5", "Bb4", "Ab4", "G4", "F4", "Eb4", "D4", "C4"];

let currentScale = pentatonicNotes;

scaleSelect.addEventListener("change", () => {
  if (scaleSelect.value === "pentatonic") {
    currentScale = pentatonicNotes;
  }

  if (scaleSelect.value === "major") {
    currentScale = majorNotes;
  }

  if (scaleSelect.value === "minor") {
    currentScale = minorNotes;
  }
});

volumeSlider.addEventListener("input", () => {
  const volume = Number(volumeSlider.value);

  fluteSynth.volume.value = volume - 2;

  pianoSynth.volume.value = volume;
});

function getMappedNote(y) {
  const h = stage.height();

  const index = Math.floor((y / h) * currentScale.length);

  return currentScale[Math.max(0, Math.min(currentScale.length - 1, index))];
}

function playDrawSound(point) {
  if (!audioStarted || !activeSynth) return;

  const now = performance.now();

  if (now - lastSoundTime < 90) return;

  const note = getMappedNote(point.y);

  if (currentInstrument === "guitar") {
    activeSynth.triggerAttack(note);
  } else {
    activeSynth.triggerAttackRelease(note, "8n");
  }

  if (isLooping) {
    recordedEvents.push({
      x: point.x,

      y: point.y,

      note: note,

      color: colorPicker.value,

      width: currentTool === "soft" ? currentBrushWidth * 2 : currentBrushWidth,

      instrument: currentInstrument,

      tool: currentTool,

      opacity: currentTool === "soft" ? 0.18 : 1,

      time: (performance.now() - loopStartTime) % loopLength,
    });
  }

  lastSoundTime = now;
}

function createReplayTrail(event) {
  if (event.tool === "pen") {
    const ring = new Konva.Circle({
      x: event.x,

      y: event.y,

      radius: event.width * 0.9,

      stroke: event.color,

      strokeWidth: 2,

      opacity: 0.65,

      shadowColor: event.color,

      shadowBlur: 25,

      scaleX: 0.5,

      scaleY: 0.5,
    });

    replayLayer.add(ring);

    replayLayer.draw();

    const tween = new Konva.Tween({
      node: ring,

      duration: 1,

      opacity: 0,

      scaleX: 3,

      scaleY: 3,

      onFinish: () => {
        ring.destroy();

        replayLayer.draw();
      },
    });

    tween.play();
  }

  if (event.tool === "soft") {
    const glow = new Konva.Circle({
      x: event.x,

      y: event.y,

      radius: event.width,

      fill: event.color,

      opacity: 0.18,

      shadowColor: event.color,

      shadowBlur: 40,
    });

    replayLayer.add(glow);

    replayLayer.draw();

    const tween = new Konva.Tween({
      node: glow,

      duration: 1.4,

      opacity: 0,

      scaleX: 2.6,

      scaleY: 2.6,

      onFinish: () => {
        glow.destroy();

        replayLayer.draw();
      },
    });

    tween.play();
  }
}

function startDraw() {
  const pos = stage.getPointerPosition();

  if (!pos) return;

  isDrawing = true;

  redoShapes = [];

  currentLine = new Konva.Line({
    stroke: colorPicker.value,

    strokeWidth:
      currentTool === "soft" ? currentBrushWidth * 2 : currentBrushWidth,

    opacity: currentTool === "soft" ? 0.18 : 1,

    lineCap: "round",

    lineJoin: "round",

    tension: 0.3,

    points: [pos.x, pos.y],
  });

  drawLayer.add(currentLine);

  drawnShapes.push(currentLine);

  drawLayer.draw();

  playDrawSound(pos);
}

function drawMove() {
  if (!isDrawing || !currentLine) return;

  const pos = stage.getPointerPosition();

  if (!pos) return;

  const newPoints = currentLine.points().concat([pos.x, pos.y]);

  currentLine.points(newPoints);

  drawLayer.batchDraw();

  playDrawSound(pos);
}

function endDraw() {
  isDrawing = false;

  currentLine = null;
}

function updateLoopUI() {
  if (!isLooping) {
    recordingStatus.textContent = "Echo ready";

    loopProgress.style.width = "0%";

    return;
  }

  const elapsed = (performance.now() - loopStartTime) % loopLength;

  const percent = (elapsed / loopLength) * 100;

  loopProgress.style.width = percent + "%";

  recordingStatus.textContent = "Recording echo...";
}

function playLoop() {
  recordedEvents.forEach((event) => {
    setTimeout(() => {
      createReplayTrail(event);

      if (event.instrument === "flute") {
        activeSynth = fluteSynth;
      }

      if (event.instrument === "piano") {
        activeSynth = pianoSynth;
      }

      if (event.instrument === "guitar") {
        activeSynth = guitarSynth;
      }

      if (event.instrument === "guitar") {
        activeSynth.triggerAttack(event.note);
      } else {
        activeSynth.triggerAttackRelease(event.note, "8n");
      }
    }, event.time);
  });
}

function startLoop() {
  isLooping = true;

  loopStartTime = performance.now();

  toggleLoopBtn.textContent = "Stop Echo";

  recordDot.classList.add("recording");

  playLoop();

  playbackInterval = setInterval(() => {
    playLoop();
  }, loopLength);

  loopAnimation = setInterval(() => {
    updateLoopUI();
  }, 30);
}

function stopLoop() {
  isLooping = false;

  toggleLoopBtn.textContent = "Begin Echo";

  recordDot.classList.remove("recording");

  clearInterval(playbackInterval);

  clearInterval(loopAnimation);

  updateLoopUI();
}

toggleLoopBtn.addEventListener("click", () => {
  if (!isLooping) {
    startLoop();
  } else {
    stopLoop();
  }
});

clearLoopBtn.addEventListener("click", () => {
  recordedEvents = [];

  stopLoop();

  recordingStatus.textContent = "Echo cleared";

  loopProgress.style.width = "0%";
});

undoBtn.addEventListener("click", () => {
  const shape = drawnShapes.pop();

  if (!shape) return;

  shape.remove();

  redoShapes.push(shape);

  drawLayer.draw();
});

redoBtn.addEventListener("click", () => {
  const shape = redoShapes.pop();

  if (!shape) return;

  drawLayer.add(shape);

  drawnShapes.push(shape);

  drawLayer.draw();
});

clearBtn.addEventListener("click", () => {
  // clear drawings
  drawnShapes.forEach((shape) => {
    shape.destroy();
  });

  drawnShapes = [];
  redoShapes = [];

  drawLayer.draw();

  // clear echo recording
  recordedEvents = [];

  // stop echo playback
  stopLoop();

  // reset loop UI
  recordingStatus.textContent = "Echo cleared";

  loopProgress.style.width = "0%";

  // clear replay trails
  replayLayer.destroyChildren();

  replayLayer.draw();
});

exportBtn.addEventListener("click", () => {
  const dataURL = stage.toDataURL({
    pixelRatio: 2,
  });

  const link = document.createElement("a");

  link.download = "sketchy-sketch-sound.png";

  link.href = dataURL;

  link.click();
});

stage.on("mousedown touchstart", startDraw);

stage.on("mousemove touchmove", drawMove);

stage.on("mouseup touchend", endDraw);

stage.on("mouseleave touchend", endDraw);

window.addEventListener("resize", () => {
  stage.width(stageContainer.clientWidth);

  stage.height(stageContainer.clientHeight);

  background.width(stage.width());

  background.height(stage.height());

  background.fillLinearGradientEndPoint({
    x: 0,
    y: stage.height(),
  });

  bgLayer.draw();

  drawLayer.draw();

  replayLayer.draw();
});
