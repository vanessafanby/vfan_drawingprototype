let popup = document.getElementById("popup");
let okBtn = document.getElementById("okBtn");

okBtn.addEventListener("click", closePopup);

function closePopup() {
  popup.style.display = "none";
}

let currentTool = "pen";
let currentInstrument = "piano";
let audioStarted = false;

let isDrawing = false;
let currentLine = null;
let lastPoint = null;
let lastSoundTime = 0;

let drawnShapes = [];

let audioBtn = document.getElementById("audioBtn");
let colorPicker = document.getElementById("colorPicker");
let sizeSlider = document.getElementById("sizeSlider");
let undoBtn = document.getElementById("undoBtn");
let clearBtn = document.getElementById("clearBtn");

let penBtn = document.querySelector('[data-tool="pen"]');
let softBtn = document.querySelector('[data-tool="soft"]');

let pianoBtn = document.querySelector('[data-instrument="piano"]');
let fluteBtn = document.querySelector('[data-instrument="flute"]');

let stageContainer = document.getElementById("stage-container");

let stage = new Konva.Stage({
  container: "stage-container",
  width: stageContainer.clientWidth,
  height: stageContainer.clientHeight,
});

let bgLayer = new Konva.Layer();
let drawLayer = new Konva.Layer();

stage.add(bgLayer);
stage.add(drawLayer);

let background = new Konva.Rect({
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

let pianoSynth;
let fluteSynth;
let activeSynth;

audioBtn.addEventListener("click", startAudio);

async function startAudio() {
  await Tone.start();

  if (!pianoSynth) {
    setupSynths();
  }

  audioStarted = true;
  audioBtn.textContent = "Sound Ready";
}

function setupSynths() {
  let reverb = new Tone.Reverb({
    decay: 6,
    wet: 0.35,
  }).toDestination();

  let delay = new Tone.FeedbackDelay({
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

  activeSynth = pianoSynth;
}

let noteArray = ["C5", "A4", "G4", "E4", "D4", "C4", "A3", "G3"];

function getMappedNote(yPosition) {
  let canvasHeight = stage.height();
  let noteIndex = Math.floor((yPosition / canvasHeight) * noteArray.length);

  if (noteIndex < 0) {
    noteIndex = 0;
  }

  if (noteIndex > noteArray.length - 1) {
    noteIndex = noteArray.length - 1;
  }

  return noteArray[noteIndex];
}

function playDrawSound(point) {
  if (!audioStarted) {
    return;
  }

  if (!activeSynth) {
    return;
  }

  let now = performance.now();

  if (now - lastSoundTime < 90) {
    return;
  }

  let noteToPlay = getMappedNote(point.y);
  let velocity = 0.35;

  if (lastPoint) {
    let dx = point.x - lastPoint.x;
    let dy = point.y - lastPoint.y;
    let speed = Math.sqrt(dx * dx + dy * dy);

    velocity = 0.25 + speed / 30;

    if (velocity > 0.8) {
      velocity = 0.8;
    }
  }

  activeSynth.triggerAttackRelease(noteToPlay, "8n", undefined, velocity);

  lastSoundTime = now;
  lastPoint = point;
}

penBtn.addEventListener("click", choosePenTool);
softBtn.addEventListener("click", chooseSoftTool);

function choosePenTool() {
  currentTool = "pen";
  penBtn.classList.add("active");
  softBtn.classList.remove("active");
}

function chooseSoftTool() {
  currentTool = "soft";
  softBtn.classList.add("active");
  penBtn.classList.remove("active");
}

pianoBtn.addEventListener("click", choosePiano);
fluteBtn.addEventListener("click", chooseFlute);

function choosePiano() {
  currentInstrument = "piano";
  activeSynth = pianoSynth;

  pianoBtn.classList.add("active");
  fluteBtn.classList.remove("active");

  colorPicker.value = "#7ea8bf";
}

function chooseFlute() {
  currentInstrument = "flute";
  activeSynth = fluteSynth;

  fluteBtn.classList.add("active");
  pianoBtn.classList.remove("active");

  colorPicker.value = "#a8bf97";
}

stage.on("mousedown touchstart", startDraw);
stage.on("mousemove touchmove", drawMove);
stage.on("mouseup touchend", endDraw);
stage.on("mouseleave touchend", endDraw);

function startDraw() {
  let pos = stage.getPointerPosition();

  if (!pos) {
    return;
  }

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

  drawLayer.add(currentLine);
  drawnShapes.push(currentLine);
  drawLayer.draw();

  playDrawSound(pos);
}

function drawMove() {
  if (!isDrawing) {
    return;
  }

  if (!currentLine) {
    return;
  }

  let pos = stage.getPointerPosition();

  if (!pos) {
    return;
  }

  let newPoints = currentLine.points().concat([pos.x, pos.y]);
  currentLine.points(newPoints);

  drawLayer.batchDraw();

  playDrawSound(pos);
}

function endDraw() {
  isDrawing = false;
  currentLine = null;
  lastPoint = null;
}

undoBtn.addEventListener("click", undoLastShape);
clearBtn.addEventListener("click", clearCanvas);

function undoLastShape() {
  let lastShape = drawnShapes.pop();

  if (lastShape) {
    lastShape.destroy();
    drawLayer.draw();
  }
}

function clearCanvas() {
  for (let i = 0; i < drawnShapes.length; i++) {
    drawnShapes[i].destroy();
  }

  drawnShapes = [];
  drawLayer.draw();
}

window.addEventListener("resize", resizeStage);

function resizeStage() {
  stage.width(stageContainer.clientWidth);
  stage.height(stageContainer.clientHeight);

  background.width(stage.width());
  background.height(stage.height());
  background.fillLinearGradientEndPoint({ x: 0, y: stage.height() });

  bgLayer.draw();
  drawLayer.draw();
}
