const popup = document.getElementById("popup");
const okBtn = document.getElementById("okBtn");
// I added this popup page because I wanted users to have a short introduction before entering the experience. Since the project relies on sound, I felt it was important to let the audience know that the website will generate audio.

const audioBtn = document.getElementById("audioBtn");
const colorPicker = document.getElementById("colorPicker");
const sizeSlider = document.getElementById("sizeSlider");
const undoBtn = document.getElementById("undoBtn");
const clearBtn = document.getElementById("clearBtn");
const toolButtons = document.querySelectorAll(".tool-btn");
const instrumentButtons = document.querySelectorAll(".instrument-btn");
const stageContainer = document.getElementById("stage-container");
// Here, I've added lines to connect the JavaScript to the interface controls. Here, I have added the interactions with colour, size, tool, instrument, and canvas actions like undo and clear.
// This to make the website interactive and responsive --> since my project is aimed on expression and exploration

let currentTool = "pen";
let currentInstrument = "piano";
let isDrawing = false;
let currentLine = null;
let drawnShapes = [];
let lastSoundTime = 0;
let lastPoint = null;
// I added these to store the current state of the system. I needed them so the website can remember what the user is doing at any moment. For example, which brush is selected, whether the user is drawing, what line is currently being created, and which instrument is active.
// These are added because I want the interaction to feel smooth and continuous. Without these variables, the system wouldn't know how to react. Standing from an audience perspective, this helps create an more engaging and immersive experience where the drawing and sound feel connected and immediate.
// With features like undo, it feel like a safer and less pressured space. Allowing users experiment freely since they know they can remove and reset things if they don't want it anymore. In this case, I think I'll be adding an eraser tool and redo button to make the experience feel more completed and relaxing.

let pianoSynth;
let fluteSynth;
let activeSynth;
let audioStarted = false;
// I added these to store the sound instruments and keep track of whether sound has been activated.
// I chose this structure because I wanted users to be able to switch instruments easily.

okBtn.addEventListener("click", () => {
  popup.style.display = "none";
});
// I added this so the popup disappears when the user presses OK. Futhermore, it was a simple close interaction because I wanted the entry into the page to feel easy and direct.
// I wanted the audience to feel like they have acknowledged the introduction and are now ready to begin.

const stage = new Konva.Stage({
  container: "stage-container",
  width: stageContainer.clientWidth,
  height: stageContainer.clientHeight,
});
// Konva --> for drawing interactions
// I wanted the stage to fill the whole canvas space, so the user feels like they are drawing in a proper environment as an open, expressive space.

const bgLayer = new Konva.Layer();
const drawLayer = new Konva.Layer();

stage.add(bgLayer);
stage.add(drawLayer);
// I added separate background and drawing layers to keep the system organised. This is to manage the background independently from the user’s marks.
// I decided to add this since it'll make the project easier to control technically, especially when the user clears, undos, or resizes

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
// I added this to create a soft gradient background for the canvas. Furthermore, the colours I choose is very light and soft, which makes the page feel calm, light, and spacious. (my aim)
// I wanted the audience to feel like they are entering a softer, more atmospheric space. Where they can expressive themeselves, through music... calm instrumental sounds

function setupAudio() {
  const reverb = new Tone.Reverb({
    decay: 6,
    wet: 0.35,
  }).toDestination();
  // I added reverb to make the sound feel softer and more spacious. I found out that the longer decay, helps the sound linger slightly, which supports a calm and immersive feeling.
  // Therefore, I wanted the audience to hear this sound that feels atmospheric and spacious.

  const delay = new Tone.FeedbackDelay({
    delayTime: "8n",
    feedback: 0.18,
    wet: 0.12,
  }).connect(reverb);
  // I wanted the audience to feel like the sound trails behind their drawing slightly, making the experience feel more alive.
  // Therefore, I added delay to give the notes a nice echo. To add on, I chose a light delay since I wanted some depth, but not so much that it becomes distracting. This helped the sound feel layered and gentle.

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
  // In my prokect, I wanted the audience to hear something soft enough to draw with, not something aggressive.
  // Therefore, I added this to create the piano-like sound. I chose a triangle oscillator because it sounded softer than harsher waveforms.
  // Then, I adjusted the envelope so the note starts quickly but still fades gently. I wanted the piano to feel melodic, while still matching the calm tone of the project.

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

  // I did the same thing to create the flute-like sound.
  // I chose a sine oscillator because it feels smoother, rounder, and more airy. This is also because I want the flute to sound softer and more flowing than the piano.
  // This choice was deliberate because I wanted the audience to feel relaxed, and user feedback later confirmed that flute suited the experience well.

  activeSynth = pianoSynth;
}
// I set piano as the default since it is familiar and easy to recognise.
// Furthermore, I wanted the audience to enter the experience with something simple and understandable before exploring other options.

function switchInstrument(name) {
  currentInstrument = name;
  activeSynth = name === "flute" ? fluteSynth : pianoSynth;
}
// I added this function so users can change instruments quickly and easily
// I also wanted the audience to feel that they can shape the mood of the experience through sound choice.

const notes = ["C5", "A4", "G4", "E4", "D4", "C4", "A3", "G3"];
// Here are the note range that I used for my project.
// I chose these eight notes (octave) because they create a harmonious, musical band feeling.
// My aim is to allow users experiment safely, knowing that each sound will remain calm and musical --> range across different octaves so the sound has variation

function getMappedNote(y) {
  const h = stage.height();
  const index = Math.floor((y / h) * notes.length);
  return notes[Math.max(0, Math.min(notes.length - 1, index))];
}
// I added this so the user’s vertical position on the canvas changes the pitch. As an exmaple: higher on the screen gives higher notes, lower on the screen gives lower notes.
// This was both a musical and visual decision --> I wanted the audience to discover this naturally, without needing detailed instructions.

function playDrawSound(point) {
  if (!audioStarted || !activeSynth) return;

  const now = performance.now();
  if (now - lastSoundTime < 90) return;
  // I added these so sound only plays when audio is active and not too frequently.
  // Since my project aims to be calming, I chose to limit sound playback to avoid the notes become too chaotic.

  const note = getMappedNote(point.y);

  let velocity = 0.35;

  if (lastPoint) {
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const speed = Math.sqrt(dx * dx + dy * dy);
    velocity = Math.min(0.8, 0.25 + speed / 30);
  }
  // My main was to make the audience to feel like they're performing the sound, almost like conducting
  // Therefore I added this so both position and movement affects the sound --> note comes from vertical position, while the velocity comes from drawing speed.
  // Slower drawing creates softer sound, while faster movement creates stronger sound. (however, I don't think it was that obvious since nobody noticed during the peer user testing... I will need to change this in the future. Some people gave suggestions saying that brush size or colour shade changed the sound, I will need to have some experimentations with this in the future)

  activeSynth.triggerAttackRelease(note, "8n", undefined, velocity);

  lastSoundTime = now;
  lastPoint = point;
}
// I added this to actually play the note and update the timing and previous position. A short note duration was added too, to make sounds respond more faster to drawing.

function startDraw() {
  const pos = stage.getPointerPosition();
  if (!pos) return;

  isDrawing = true;
  lastPoint = pos;
  // I added this to start the drawing process when the user presses down. Furthermore, I needed the position so the line can begin exactly where the user interacts.

  if (currentTool === "pen") {
    currentLine = new Konva.Line({
      stroke: colorPicker.value,
      strokeWidth: Number(sizeSlider.value),
      lineCap: "round",
      lineJoin: "round",
      tension: 0.2,
      points: [pos.x, pos.y],
    });
    // Here, I added the pen as the default brush since I feel most users is most familiar with this tool
    // Furthermore, I chose rounded caps and joins for pens so the line feels smoother and friendlier --> cleaner, solid mark

    drawLayer.add(currentLine);
    drawnShapes.push(currentLine);
    drawLayer.draw();
  }
  // I added this so the new stroke appears visually and is also stored for undo and clear --> allowing users to freely experiment
  // Allows it to save every line --> to allow users reverse/restart without pressure (my main aim = calming and relaxing)

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
    // Here, I added the soft brush because I wanted a different kind of mark making. I wanted to make this brush less about precision and more about mood.
    // Therefore, I chose a larger size and lower opacity so the marks feel more layered, airy, and atmospheric.
    // *Maybe in the future when user draws using pens, it'll be a piano sound and when they use a brush to draw, it'll automatically turn into a flute sound (since they found flute is more airy which I think suits brush more, whereas pen is more solid so will suit piano more)

    drawLayer.add(currentLine);
    drawnShapes.push(currentLine);
    drawLayer.draw();
  }
  // I added this so the new stroke appears visually and is also stored for undo and clear --> allowing users to freely experiment
  // Allows it to save every line --> to allow users reverse/restart without pressure (my main aim = calming and relaxing)

  playDrawSound(pos);
}
// I added this so sound begins immediately when the user starts drawing. This is to allow the user have connection between action and sound to be felt right away.
// This is to also let the audience understand that drawing and sound are linked immediately

function drawMove() {
  if (!isDrawing || !currentLine) return;

  const pos = stage.getPointerPosition();
  if (!pos) return;

  const newPoints = currentLine.points().concat([pos.x, pos.y]);
  currentLine.points(newPoints);
  drawLayer.batchDraw();

  playDrawSound(pos);
}
// I added this to continue the line as the user moves --> update the points continuously so the line feels fluid and natural
// Sound is also continuously played so the audio evolves with the gesture.
// I also received feedback saying if I could record and track the users drawing with sound, and replay that as a looping music. I feel this sounds fun and intersting, but unsure if I can complete it... will also need to experiment in the future

function endDraw() {
  isDrawing = false;
  currentLine = null;
  lastPoint = null;
}
// I added this to stop the drawing when the user lifts the mouse. Then, these variabes are reset to allow the next gesture to start fresh.
// Therefore, there'll be no broken strokes or unwanted sound continuation, making the experience clean and feel nicer (wont be too loud and messy)

toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toolButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentTool = btn.dataset.tool;
  });
});
// I wanted the tool selection simple and understandable, therefore I added this so users can switch brushes and visually see which one is active.

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
//I wanted the user feel that sound and visuals belong to the same system, so I added this in to allow users switch between the two instruments: piano and flute.
// *Some feedback responses say that they want to hear more music instruments...so I will need to test out other sounds too
// I also linked the colour change to the instrument, this is because I wanted the sound choice to subtly affect the visual mood too.
// I chose blue for piano and green for flute because both feel soft and calm, but slightly different in atmosphere.

audioBtn.addEventListener("click", async () => {
  await Tone.start();

  if (!pianoSynth) {
    setupAudio();
  }

  audioStarted = true;
  audioBtn.textContent = "Sound Ready";
});
// I chose to make this explicit with a Start Sound button, so the user deliberately begins the audio experience.
// I wanted the audience to feel like they are entering the experience, even though I know this step could be clearer in future versions.

undoBtn.addEventListener("click", () => {
  const lastShape = drawnShapes.pop();
  if (lastShape) {
    lastShape.destroy();
    drawLayer.draw();
  }
});
// I wanted the audience to feel more relaxed and willing to try things so added the undo button
// This is to allow more experimentation, and let users go back when they make a mistake.

clearBtn.addEventListener("click", () => {
  drawnShapes.forEach((shape) => shape.destroy());
  drawnShapes = [];
  drawLayer.draw();
});
// I wanted the audience to feel that the canvas is open-ended, like a space they can reset whenever they want so added this clear button
// This was also an aim of my project, which is allow the process to be more important rather than a final perfect result.

stage.on("mousedown touchstart", startDraw);
stage.on("mousemove touchmove", drawMove);
stage.on("mouseup touchend", endDraw);
stage.on("mouseleave touchend", endDraw);
// I added these so both mouse and touch interactions work.

window.addEventListener("resize", () => {
  stage.width(stageContainer.clientWidth);
  stage.height(stageContainer.clientHeight);

  background.width(stage.width());
  background.height(stage.height());
  background.fillLinearGradientEndPoint({ x: 0, y: stage.height() });

  bgLayer.draw();
  drawLayer.draw();
});
// I added this because I wanted the stage and background resize correctly with the window.
