const audioBtn = document.getElementById("audioBtn");
const colorPicker = document.getElementById("colorPicker");
const sizeSlider = document.getElementById("sizeSlider");
const undoBtn = document.getElementById("undoBtn");
const clearBtn = document.getElementById("clearBtn");
const toolButtons = document.querySelectorAll(".tool-btn");
const instrumentButtons = document.querySelectorAll(".instrument-btn");
const stageContainer = document.getElementById("stage-container");

let currentTool = "pen";
let currentInstrument = "piano";
let isDrawing = false;
let currentLine = null;
let drawnShapes = [];
let lastSoundTime = 0;
let lastPoint = null;

// =========================
// KONVA SETUP
// =========================
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

// =========================
// AUDIO SETUP
// =========================
let pianoSynth;
let fluteSynth;
let activeSynth;
let ambientPad;
let ambientLoop;
let audioStarted = false;

function setupAudio() {
  const reverb = new Tone.Reverb({
    decay: 8,
    wet: 0.4,
  }).toDestination();

  const delay = new Tone.FeedbackDelay({
    delayTime: "8n",
    feedback: 0.2,
    wet: 0.18,
  }).connect(reverb);

  pianoSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.02,
      decay: 0.2,
      sustain: 0.15,
      release: 1.6,
    },
    volume: -4,
  }).connect(delay);

  fluteSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 0.08,
      decay: 0.15,
      sustain: 0.45,
      release: 1.4,
    },
    volume: -6,
  }).connect(delay);

  ambientPad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 2.4,
      decay: 0.6,
      sustain: 0.5,
      release: 3,
    },
    volume: -14,
  }).connect(reverb);

  activeSynth = pianoSynth;

  const chords = [
    ["C4", "E4", "G4"],
    ["A3", "C4", "E4"],
    ["F3", "A3", "C4"],
    ["G3", "B3", "D4"],
  ];

  let chordIndex = 0;

  ambientLoop = new Tone.Loop((time) => {
    const chord = chords[chordIndex % chords.length];
    ambientPad.triggerAttackRelease(chord, "2n", time, 0.3);
    chordIndex++;
  }, "1m");
}

function switchInstrument(name) {
  currentInstrument = name;
  activeSynth = name === "flute" ? fluteSynth : pianoSynth;
}

const notes = ["C5", "A4", "G4", "E4", "D4", "C4", "A3", "G3"];

function getMappedNote(y) {
  const h = stage.height();
  const index = Math.floor((y / h) * notes.length);
  return notes[Math.max(0, Math.min(notes.length - 1, index))];
}

function playDrawSound(point) {
  if (!audioStarted || !activeSynth) return;

  const now = performance.now();
  if (now - lastSoundTime < 90) return;

  const note = getMappedNote(point.y);

  let velocity = 0.35;

  if (lastPoint) {
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const speed = Math.sqrt(dx * dx + dy * dy);
    velocity = Math.min(0.8, 0.25 + speed / 30);
  }

  activeSynth.triggerAttackRelease(note, "8n", undefined, velocity);

  lastSoundTime = now;
  lastPoint = point;
}

// =========================
// DRAWING
// =========================
function startDraw() {
  const pos = stage.getPointerPosition();
  if (!pos) return;

  isDrawing = true;
  lastPoint = pos;

  if (currentTool === "pen") {
    currentLine = new Konva.Line({
      stroke: colorPicker.value,
      strokeWidth: Number(sizeSlider.value),
      lineCap: "round",
      lineJoin: "round",
      tension: 0.2,
      points: [pos.x, pos.y],
    });

    drawLayer.add(currentLine);
    drawnShapes.push(currentLine);
    drawLayer.draw();
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

    drawLayer.add(currentLine);
    drawnShapes.push(currentLine);
    drawLayer.draw();
  }

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
  lastPoint = null;
}

// =========================
// UI EVENTS
// =========================
toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toolButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentTool = btn.dataset.tool;
  });
});

instrumentButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    instrumentButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    switchInstrument(btn.dataset.instrument);

    if (btn.dataset.instrument === "piano") {
      colorPicker.value = "#7ea8bf";
    } else {
      colorPicker.value = "#a8bf97";
    }
  });
});

audioBtn.addEventListener("click", async () => {
  await Tone.start();

  if (!pianoSynth) {
    setupAudio();
  }

  if (Tone.Transport.state !== "started") {
    Tone.Transport.bpm.value = 50;
    ambientLoop.start(0);
    Tone.Transport.start();
    audioStarted = true;
    audioBtn.textContent = "Sound On";
  }
});

undoBtn.addEventListener("click", () => {
  const lastShape = drawnShapes.pop();
  if (lastShape) {
    lastShape.destroy();
    drawLayer.draw();
  }
});

clearBtn.addEventListener("click", () => {
  drawnShapes.forEach((shape) => shape.destroy());
  drawnShapes = [];
  drawLayer.draw();
});

// =========================
// STAGE EVENTS
// =========================
stage.on("mousedown touchstart", startDraw);
stage.on("mousemove touchmove", drawMove);
stage.on("mouseup touchend", endDraw);
stage.on("mouseleave touchend", endDraw);

// =========================
// RESIZE
// =========================
window.addEventListener("resize", () => {
  stage.width(stageContainer.clientWidth);
  stage.height(stageContainer.clientHeight);

  background.width(stage.width());
  background.height(stage.height());
  background.fillLinearGradientEndPoint({ x: 0, y: stage.height() });

  bgLayer.draw();
  drawLayer.draw();
});
