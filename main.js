const popup = document.getElementById("popup");
const okBtn = document.getElementById("okBtn");

const audioBtn = document.getElementById("audioBtn");
const colorPicker = document.getElementById("colorPicker");
const sizeSlider = document.getElementById("sizeSlider");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");

const toggleLoopBtn = document.getElementById("toggleLoopBtn");
const clearLoopBtn = document.getElementById("clearLoopBtn");
const recordingStatus = document.getElementById("recordingStatus");
const loopProgress = document.getElementById("loopProgress");
const recordDot = document.getElementById("recordDot");

const toolButtons = document.querySelectorAll(".tool-btn");
const stageContainer = document.getElementById("stage-container");

let currentTool = "pen";
let currentInstrument = "piano";

let isDrawing = false;
let currentLine = null;

let drawnShapes = [];
let redoShapes = [];

let lastSoundTime = 0;
let lastPoint = null;

let pianoSynth;
let fluteSynth;
let guitarSynth;
let activeSynth;
let audioStarted = false;

let recordedNotes = [];

let loopStartTime = null;
let loopTimer = null;
let loopPlaybackTimer = null;
let isLooping = false;

const loopLength = 8000;

okBtn.addEventListener("click", () => {
  popup.remove();
});

const stage = new Konva.Stage({
  container: "stage-container",
  width: stageContainer.clientWidth,
  height: stageContainer.clientHeight,
});

const bgLayer = new Konva.Layer();
const drawLayer = new Konva.Layer();

stage.add(bgLayer);
stage.add(drawLayer);

const background = new Konva.Rect({
  x: 0,
  y: 0,
  width: stage.width(),
  height: stage.height(),
  fillLinearGradientStartPoint: { x: 0, y: 0 },
  fillLinearGradientEndPoint: { x: 0, y: stage.height() },
  fillLinearGradientColorStops: [0, "#f6fbfb", 1, "#e7f0f1"],
  listening: false,
});

bgLayer.add(background);
bgLayer.draw();

function setupAudio() {
  const reverb = new Tone.Reverb({
    decay: 6,
    wet: 0.35,
  }).toDestination();

  const delay = new Tone.FeedbackDelay({
    delayTime: "8n",
    feedback: 0.18,
    wet: 0.12,
  }).connect(reverb);

  pianoSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.02,
      decay: 0.2,
      sustain: 0.15,
      release: 1.4,
    },
    volume: -4,
  }).connect(delay);

  fluteSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 0.08,
      decay: 0.15,
      sustain: 0.45,
      release: 1.2,
    },
    volume: -6,
  }).connect(delay);

  guitarSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sawtooth" },
    envelope: {
      attack: 0.01,
      decay: 0.25,
      sustain: 0.12,
      release: 1,
    },
    volume: -8,
  }).connect(delay);

  chooseInstrumentFromBrushSize();
}

function switchInstrument(name) {
  currentInstrument = name;

  if (name === "flute") {
    activeSynth = fluteSynth;
  } else if (name === "guitar") {
    activeSynth = guitarSynth;
  } else {
    activeSynth = pianoSynth;
  }
}

function chooseInstrumentFromBrushSize() {
  const brushSize = Number(sizeSlider.value);

  if (brushSize <= 10) {
    switchInstrument("flute");
    colorPicker.value = "#a8bf97";
  } else if (brushSize >= 20) {
    switchInstrument("guitar");
    colorPicker.value = "#c6a477";
  } else {
    switchInstrument("piano");
    colorPicker.value = "#7ea8bf";
  }
}

sizeSlider.addEventListener("input", () => {
  if (audioStarted) {
    chooseInstrumentFromBrushSize();
  }
});

const notes = ["C5", "A4", "G4", "E4", "D4", "C4", "A3", "G3"];

function getMappedNote(y) {
  const h = stage.height();
  const index = Math.floor((y / h) * notes.length);

  return notes[Math.max(0, Math.min(notes.length - 1, index))];
}

function getLoopTime() {
  if (loopStartTime === null) {
    return 0;
  }

  return (performance.now() - loopStartTime) % loopLength;
}

function updateLoopUI() {
  if (!isLooping || loopStartTime === null) {
    recordingStatus.textContent = "Echo ready";
    loopProgress.style.width = "0%";
    recordDot.classList.remove("recording");
    return;
  }

  const loopTime = getLoopTime();
  const seconds = loopTime / 1000;
  const percent = (loopTime / loopLength) * 100;

  loopProgress.style.width = percent + "%";

  if (isDrawing) {
    recordingStatus.textContent =
      "Recording echo: " + seconds.toFixed(1) + "s / 8.0s";
    recordDot.classList.add("recording");
  } else {
    recordingStatus.textContent =
      "Echo looping: " + seconds.toFixed(1) + "s / 8.0s";
    recordDot.classList.remove("recording");
  }
}

function startEchoLoop() {
  if (!audioStarted) {
    return;
  }

  isLooping = true;
  loopStartTime = performance.now();

  toggleLoopBtn.textContent = "Stop Echo";

  clearInterval(loopTimer);
  loopTimer = setInterval(updateLoopUI, 50);

  playRecordedLoop();
  clearInterval(loopPlaybackTimer);
  loopPlaybackTimer = setInterval(playRecordedLoop, loopLength);
}

function stopEchoLoop() {
  isLooping = false;

  toggleLoopBtn.textContent = "Begin Echo";

  clearInterval(loopTimer);
  clearInterval(loopPlaybackTimer);

  updateLoopUI();
}

function playRecordedLoop() {
  if (!audioStarted || recordedNotes.length === 0) {
    return;
  }

  recordedNotes.forEach((item) => {
    setTimeout(() => {
      switchInstrument(item.instrument);

      activeSynth.triggerAttackRelease(
        item.note,
        "8n",
        undefined,
        item.velocity
      );
    }, item.time);
  });
}

function saveNoteToLoop(note, velocity) {
  if (!isLooping || loopStartTime === null) {
    return;
  }

  recordedNotes.push({
    note: note,
    time: getLoopTime(),
    velocity: velocity,
    instrument: currentInstrument,
  });
}

function playDrawSound(point) {
  if (!audioStarted || !activeSynth) return;

  const now = performance.now();

  if (now - lastSoundTime < 90) return;

  chooseInstrumentFromBrushSize();

  const note = getMappedNote(point.y);

  let velocity = 0.35;

  if (lastPoint) {
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    velocity = Math.min(0.8, 0.25 + speed / 30);
  }

  activeSynth.triggerAttackRelease(note, "8n", undefined, velocity);

  saveNoteToLoop(note, velocity);

  lastSoundTime = now;
  lastPoint = point;
}

function startDraw() {
  const pos = stage.getPointerPosition();

  if (!pos) return;

  isDrawing = true;
  lastPoint = pos;

  redoShapes = [];

  if (currentTool === "pen") {
    currentLine = new Konva.Line({
      stroke: colorPicker.value,
      strokeWidth: Number(sizeSlider.value),
      lineCap: "round",
      lineJoin: "round",
      tension: 0.2,
      points: [pos.x, pos.y],
    });
  }

  if (currentTool === "soft") {
    currentLine = new Konva.Line({
      stroke: colorPicker.value,
      strokeWidth: Number(sizeSlider.value) * 2,
      opacity: 0.16,
      lineCap: "round",
      lineJoin: "round",
      tension: 0.3,
      points: [pos.x, pos.y],
    });
  }

  if (!currentLine) return;

  drawLayer.add(currentLine);
  drawnShapes.push(currentLine);
  drawLayer.draw();

  playDrawSound(pos);
  updateLoopUI();
}

function drawMove() {
  if (!isDrawing || !currentLine) return;

  const pos = stage.getPointerPosition();

  if (!pos) return;

  const newPoints = currentLine.points().concat([pos.x, pos.y]);
  currentLine.points(newPoints);

  drawLayer.batchDraw();
  playDrawSound(pos);
  updateLoopUI();
}

function endDraw() {
  isDrawing = false;
  currentLine = null;
  lastPoint = null;

  updateLoopUI();
}

toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toolButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentTool = btn.dataset.tool;
  });
});

audioBtn.addEventListener("click", async () => {
  if (!audioStarted) {
    await Tone.start();

    if (!pianoSynth) {
      setupAudio();
    }

    audioStarted = true;

    Tone.Destination.mute = false;

    audioBtn.textContent = "🔊";
  } else {
    Tone.Destination.mute = !Tone.Destination.mute;

    if (Tone.Destination.mute) {
      audioBtn.textContent = "🔇";
    } else {
      audioBtn.textContent = "🔊";
    }
  }
});

undoBtn.addEventListener("click", () => {
  const lastShape = drawnShapes.pop();

  if (lastShape) {
    lastShape.remove();
    redoShapes.push(lastShape);
    drawLayer.draw();
  }
});

redoBtn.addEventListener("click", () => {
  const redoShape = redoShapes.pop();

  if (redoShape) {
    drawLayer.add(redoShape);
    drawnShapes.push(redoShape);
    drawLayer.draw();
  }
});

clearBtn.addEventListener("click", () => {
  drawnShapes.forEach((shape) => shape.destroy());
  redoShapes.forEach((shape) => shape.destroy());

  drawnShapes = [];
  redoShapes = [];

  drawLayer.draw();
});

toggleLoopBtn.addEventListener("click", () => {
  if (!audioStarted) {
    return;
  }

  if (isLooping) {
    stopEchoLoop();
  } else {
    startEchoLoop();
  }
});

clearLoopBtn.addEventListener("click", () => {
  recordedNotes = [];

  stopEchoLoop();

  recordingStatus.textContent = "Echo cleared";
  loopProgress.style.width = "0%";
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
});
