const popup = document.getElementById("popup");
const okBtn = document.getElementById("okBtn");
// I wanted the website to begin with a short introduction screen so the audience understands that this is not just a normal drawing canvas, but an experience where drawing creates sound.

const colorPicker = document.getElementById("colorPicker");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
// I included these because I wanted the canvas to feel low pressure.
// Users can experiment, make mistakes, remove things, and restart without feeling like the drawing needs to be perfect.

const toggleLoopBtn = document.getElementById("toggleLoopBtn");
// I added this because I wanted the user to be able to record their drawing sounds into a loop.
//  This is to make the experience feel more musical and playful, like building a small sound performance through drawing.

const recordingStatus = document.getElementById("recordingStatus");
const loopProgress = document.getElementById("loopProgress");
const recordDot = document.getElementById("recordDot");
// I added the 'record loop', 'recording in progress' so that users are able to see when the system is recording.
// The progress bar and red dot makes the looping system feel more alive and understandable.

const scaleSelect = document.getElementById("scaleSelect");
const volumeSlider = document.getElementById("volumeSlider");
const exportBtn = document.getElementById("exportBtn");
// I added these to give users more control over the experience without making the interface too complicated.
// The scale/key changes the mood of the sound
// The volume helps users control comfort, overall feeling
// Export allows them to save their final drawing

const toolButtons = document.querySelectorAll(".tool-btn");
const sizeButtons = document.querySelectorAll(".size-btn");

const stageContainer = document.getElementById("stage-container");

let currentTool = "pen";
let currentBrush = "medium";
let currentBrushWidth = 10;
let currentInstrument = "piano";
// I set the default tool to pen and the default brush size to medium
// Since the brush size is medium, the default instrument is set to piano too. This is because these feel familiar and easy to understand when the user first enters the page
// Since the piano sound is not as thin as flute, and not as heavy as guitar, so I feel this is the most natural starting point

let isDrawing = false;
let currentLine = null;
// I added this to track whether the user is currently drawing or not.
// Like when to create marks and to store the line that is being drawn

let drawnShapes = [];
let redoShapes = [];
// I added these so undo and redo can work properly

let lastSoundTime = 0;

let fluteSynth;
let pianoSynth;
let guitarSynth;
let activeSynth;
// These are the three different instrument sounds I've decided to use for my website.
// I added 'activeSynth' because I wanted each brush size to feel like it has its own sound personality

let audioStarted = false;

let recordedEvents = [];
let loopLength = 8000;
let isLooping = false;
let loopStartTime = null;
let loopAnimation;
let playbackInterval;
let loopTimeouts = [];
// Here, I chose a 8 second loop. It's long enough for users to make a small phrase, but also short enough to feel rhythmic and repeatable.
// Here, I have also included 'recordedEvents' to store the sound, colour, instrument and positions so the loop can replay both audio and visual trails.

okBtn.addEventListener("click", async () => {
  popup.remove();

  await Tone.start();

  setupAudio();

  audioStarted = true;
});
// When the user clicks 'Enter', Tone.js starts and the audio instruments are created. So, the user wont need to click 'SOUND ON' and 'SOUND OFF', sound will be generate automatically. (I had this in my previous assignment, but now I have deleted it)

const stage = new Konva.Stage({
  container: "stage-container",
  width: stageContainer.clientWidth,
  height: stageContainer.clientHeight,
});
// This is the main drawing area

const bgLayer = new Konva.Layer();
const drawLayer = new Konva.Layer();
const replayLayer = new Konva.Layer();

stage.add(bgLayer);
stage.add(drawLayer);
stage.add(replayLayer);

// Here, I separated the canvas into layers.
// The background layer holds the canvas background, the draw layer holds the user’s actual drawing, and the replay layer holds the echo trails.
// I added this to keep the system organised and makes it easier to replay certain parts

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
// I used a soft gradient background from pale lavender to mint, just to make the space feel calm, gentle, and more atmospheric.
// By using pale pink and blue tones, I aim to create a dreamy like feeling to the project.
// I added 'listening: false' to ignore mouse events on the background

bgLayer.add(background);
bgLayer.draw();

// I kept the sound design soft because I wanted the audience to feel relaxed whilst drawing
function setupAudio() {
  const reverb = new Tone.Reverb({
    // I added reverb to make the sound feel more spacious and dreamy.
    // Without reverb, the notes feels too dry and flat. This isn't what I was aiming for. I want my project to have a calming atmosphere
    decay: 5,
    wet: 0.3,
  }).toDestination();

  // I added delay to create a slight echo effect. I feel this also helps the drawing feel like it leaves behind a sound memory.
  const delay = new Tone.FeedbackDelay({
    delayTime: "8n",
    feedback: 0.15,
    wet: 0.1,
  }).connect(reverb);
  // Here, every instrument passes through delay and then reverb.

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
  // This creates the flute sound.
  // I chose a sine oscillator because it sounds smooth, soft, and airy.
  // I connected the flute to the small brush because small marks feel delicate, and I wanted the sound to match that lightness.
  // I make the 'attack' to be 0.08 seconds, to allow notes fade in slowly, which matches how a flute breathes into a note.
  // Furthermore, I used 'PolySynth' so multiple notes can overlap when the user draws

  pianoSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "sine",
    },
    envelope: {
      attack: 0.005,
      decay: 0.35,
      sustain: 0.08,
      release: 1.6,
    },
    volume: -6,
  }).connect(delay);
  // This creates the piano sound.
  // Comparing to the previous prototype piano sound, I changed it to be softer and more bell like (feedback of peer user testing)
  // I wanted the piano to sit in the middle between airy flute sounds and shorter guitar sound
  // Here, I have made the piano 'attack' sound to be 0.005 seconds, which is close to instant

  guitarSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "triangle",
    },
    envelope: {
      attack: 0.005,
      decay: 0.18,
      sustain: 0.03,
      release: 0.65,
    },
    volume: -10,
  }).connect(delay);
  // This creates the guitar sound.
  // I used a triangle oscillator instead of a sawtooth. This is because the sawtooth sounded too electronic.
  // Furthermore, I adjusted the decay and release to make the guitar feel more plucked and quick.
  // This is why I paired this with the large brush size on purpose. A thick stroke should carry a sound that feels equally heavy.

  setBrushType("medium");
}
// I set the default brush type to medium so the experience starts with piano.

function setBrushType(type) {
  currentBrush = type;
  // changes the brush size and instrument at the same time, different from previous prototype where users can pick different instruments and adjust brush size. Now, the instrument is selected based on the brush size, just to make it more connected and easy to use.

  sizeButtons.forEach((btn) => {
    btn.classList.remove("active");
  });

  document.querySelector(`[data-size="${type}"]`).classList.add("active");
  // I added this so users know which instrument brush is currently being used.

  if (type === "small") {
    currentBrushWidth = 4;
    currentInstrument = "flute";
    activeSynth = fluteSynth;
  }
  // The small brush creates a thin line and uses flute.
  // I chose this because small gestures feel light and delicate.

  if (type === "medium") {
    currentBrushWidth = 10;
    currentInstrument = "piano";
    activeSynth = pianoSynth;
  }
  // Medium brush uses piano.
  // I chose piano as the middle option because it feels balanced and familiar.

  if (type === "large") {
    currentBrushWidth = 20;
    currentInstrument = "guitar";
    activeSynth = guitarSynth;
  }
}
// Large brush uses guitar.
// I wanted the larger brush to feel more grounded and bold, so the guitar gives it a stronger presence.

// Here, the visual weight of the stroke matches the weight of the sound. Users don't need to read instructions to understand this, it works by feel.

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
// I added this because the two tools have different visual moods: pen is clearer and sharper, whilst soft brush feels more atmospheric.

const pentatonicNotes = ["C5", "A4", "G4", "E4", "D4", "C4", "A3"];
const majorNotes = ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"];
const minorNotes = ["C5", "Bb4", "Ab4", "G4", "F4", "Eb4", "D4", "C4"];
// Here, I've added different scales so users can change the mood of the sound.
// Pentatonic feels calm and safe, major feels brighter, and minor feels slightly more emotional.
// From my previous prototype idea, I have moved onto this one as well. Which is to map notes based on vertical position. High on the canvas plays high notes, and low on the canvas plays low notes.
// Here, my aim is achieved as well: Able to draw a natural melodic phrase without any music knowledge needed.

let currentScale = pentatonicNotes;
// Pentatonic is set as default

scaleSelect.addEventListener("change", () => {
  if (scaleSelect.value === "pentatonic") {
    currentScale = pentatonicNotes;
  }
  // When the user selects pentatonic, the notes change to the pentatonic set.

  if (scaleSelect.value === "major") {
    currentScale = majorNotes;
  }
  // When the user selects major, the interaction becomes brighter.

  if (scaleSelect.value === "minor") {
    currentScale = minorNotes;
  }
});
// When the user selects minor, the sound becomes more emotional.

volumeSlider.addEventListener("input", () => {
  const volume = Number(volumeSlider.value);

  fluteSynth.volume.value = volume - 2;
  pianoSynth.volume.value = volume;
  guitarSynth.volume.value = volume - 4;
});
// Here, it allows users to control the overall loudness.
// Since each instrument has a slightly different volume, I wanted the user to adjust to make the sound stay most comfortable as possible

function getMappedNote(y) {
  const h = stage.height();
  const index = Math.floor((y / h) * currentScale.length);
  // turns the vertical position into a musical note

  return currentScale[Math.max(0, Math.min(currentScale.length - 1, index))];
}
// Here, I divided the canvas height into equal bands, one per note in the scale. The top of the canvas always plays the highest note. The bottom always plays the lowest.

function playDrawSound(point) {
  if (!audioStarted || !activeSynth) return;

  const now = performance.now();

  if (now - lastSoundTime < 90) return;
  // I added this because too many notes at once would make the experience noisy and stressful.
  // My aim is for the sound to feel responsive but still calm at the same time

  const note = getMappedNote(point.y);

  if (currentInstrument === "guitar") {
    activeSynth.triggerAttackRelease(note, "16n");
  } else {
    activeSynth.triggerAttackRelease(note, "8n");
  }
  // Here, I made the guitar shorter using "16n" because guitar works better as a quick plucked sound.
  // Flute and piano use "8n" so they feel more sustained.

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
  // When the loop is recording, it will save everything at that the moment. This includes: position, note, colour, brush etc. Here, it stores all of this so the echo replays what the user drew, both visually and sonically.
  // By adding the '% loopLength', this records the timing inside the 8 second loop and making the loop cycle back to the beginning after 8 seconds.
  // "WHY 8 SECONDS?" Because it's not too long and not too short. It is a time frame that is just perfect for users to explore, create and try music whilst engaging and not feel confused, and loose patience

  lastSoundTime = now;
}

function createReplayTrail(event) {
  // This creates the visual effect when the echo loop replays. I added this because I wanted the audience to see the sound being remembered visually, not just hear it.

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
    // For pen strokes, I've animated a ring that grows outward and fades. I chose this because the pen is sharper and bold.

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
    // For soft brush strokes, a glow circle blooms and disappears. This is because I wanted this to feel more dreamy and atmospheric, matching the soft brush’s original appearance.

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
    // When the loop replays, users are able to see a brief pulse of light and colour at each point where a note plays.
    // I've added in a tween where it animates the trail to get a fading and expanding effect.
    // I added this because I wanted the loop replay to visually reflect on the users original drawing action.

    tween.play();
  }
}

function startDraw() {
  const pos = stage.getPointerPosition();

  if (!pos) return;

  isDrawing = true;
  redoShapes = [];
  // Here, it tells the system that drawing has started.
  // I also decided to make it clear the redo history because once the user draws something new, the previous redo path should no longer apply.

  currentLine = new Konva.Line({
    stroke: colorPicker.value,
    // This uses the colour chosen by the user
    strokeWidth:
      currentTool === "soft" ? currentBrushWidth * 2 : currentBrushWidth,
    opacity: currentTool === "soft" ? 0.18 : 1,
    // The soft brush is transparent, whilst the pen is solid. This is to allow users test out the visual difference of the two drawing tools.
    lineCap: "round",
    lineJoin: "round",
    // I wanted the drawing experience to feel gentle rather than sharp, therefore I've made the lines smooth and rounded.
    tension: 0.3,
    points: [pos.x, pos.y],
  });
  // This makes the soft brush wider than the pen. I added this because I wanted the soft brush to feel more airy and expressive.

  drawLayer.add(currentLine);
  drawnShapes.push(currentLine);
  drawLayer.draw();

  playDrawSound(pos);
}

function drawMove() {
  if (!isDrawing || !currentLine) return;
  // draws when the user is drawing

  const pos = stage.getPointerPosition();

  if (!pos) return;

  const newPoints = currentLine.points().concat([pos.x, pos.y]);

  currentLine.points(newPoints);
  drawLayer.batchDraw();

  playDrawSound(pos);
}
// Here, it updates the canvas and plays sound while the user draws.
// I used this so the relationship between movement and sound feels immediate.

function endDraw() {
  isDrawing = false;
  currentLine = null;
}
// This stops the drawing action.
// I added this so the system stops when the user lifts the mouse or finger.

function updateLoopUI() {
  // Updates the loop status display
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
// Here, it updates the progress bar and status text. I added this so users can see that their drawing is being recorded into a loop.

function clearLoopTimeouts() {
  loopTimeouts.forEach((timeout) => {
    clearTimeout(timeout);
  });

  loopTimeouts = [];
}
// Here, it clears the scheduled loop playback. I added this because when the user presses 'Stop Echo', I want the playback to stop immediately instead of continuing to play sounds that were already scheduled
//  Before deleting the "clear loop" there was a bug. There was music playing even though I pressed cleared, so I deleted that and replaced it with this.

function playLoop() {
  recordedEvents.forEach((event) => {
    // replays every recorded event in the loop
    const timeout = setTimeout(() => {
      if (!isLooping) return;

      createReplayTrail(event);
      // I added this so users can visually follow their recorded sound gestures.

      if (event.instrument === "flute") {
        activeSynth = fluteSynth;
      }
      // This switches to flute if that was the recorded instrument.

      if (event.instrument === "piano") {
        activeSynth = pianoSynth;
      }
      // This switches to piano if that was recorded.

      if (event.instrument === "guitar") {
        activeSynth = guitarSynth;
      }
      // This switches to guitar if that was recorded.

      if (event.instrument === "guitar") {
        activeSynth.triggerAttackRelease(event.note, "16n");
      } else {
        activeSynth.triggerAttackRelease(event.note, "8n");
      }
      // Here, I kept the guitar shorter so it feels more plucked.
    }, event.time);

    loopTimeouts.push(timeout);
  });
}

function startLoop() {
  isLooping = true;

  loopStartTime = performance.now();
  // starts loop and stores the starting time

  toggleLoopBtn.textContent = "Stop Echo";
  recordDot.classList.add("recording");
  // updates the button and turns on the recording indicator

  playLoop();
  // starts replaying previous recorded events

  playbackInterval = setInterval(() => {
    playLoop();
  }, loopLength);
  // repeats loop every 8 seconds

  loopAnimation = setInterval(() => {
    updateLoopUI();
  }, 30);
}
// updates the progress bar

function stopLoop() {
  isLooping = false;
  // stops the loop state

  toggleLoopBtn.textContent = "Begin Echo";
  recordDot.classList.remove("recording");

  clearInterval(playbackInterval);
  clearInterval(loopAnimation);
  clearLoopTimeouts();
  // stops loop playback, animation and scheduled sounds

  fluteSynth.releaseAll();
  pianoSynth.releaseAll();
  guitarSynth.releaseAll();
  // I added this to stop any sustained instrument sound, that will affect the overall experience

  replayLayer.destroyChildren();
  replayLayer.draw();

  updateLoopUI();
}

toggleLoopBtn.addEventListener("click", () => {
  if (!isLooping) {
    startLoop();
  } else {
    stopLoop();
  }
});
// This makes the same button start and stop the echo. I chose one button instead of separate buttons because it keeps the interface simpler and calmer.

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
  drawnShapes.forEach((shape) => {
    shape.destroy();
  });

  drawnShapes = [];
  redoShapes = [];
  drawLayer.draw();

  recordedEvents = [];
  stopLoop();
  // I added this so clearing the canvas also clears the echo loop. This makes the canvas and sound feel connected as one system.

  recordingStatus.textContent = "Echo cleared";
  loopProgress.style.width = "0%";
  // I set the status text to "Echo cleared" so the user knows the loop was reset too.

  replayLayer.destroyChildren();
  replayLayer.draw();
});

exportBtn.addEventListener("click", () => {
  const dataURL = stage.toDataURL({
    pixelRatio: 2,
  });
  // This runs when the user clicks save their artwork
  // This captures the canvas as an image. I used a higher pixel ratio so the exported drawing looks clearer.

  const link = document.createElement("a");

  link.download = "sketchy-sketch-sound.png";
  link.href = dataURL;
  link.click();
});
// This creates a download link and automatically downloads the image.
// I added this because I wanted users to keep the drawing they created, even though the project is more about process than final outcome.

stage.on("mousedown touchstart", startDraw);
stage.on("mousemove touchmove", drawMove);
stage.on("mouseup touchend", endDraw);
stage.on("mouseleave touchend", endDraw);
// These connect drawing to mouse and touch interaction.
// I added both because I wanted the project to work across different devices and feel accessible.

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
// This redraws all layers after resizing so the canvas stays the correct size
// on any screen. I also update the background rectangle and its gradient end
// point so it covers the full canvas after the resize.

// What changed from my previous version:

// I added a guitar synth for the large brush, giving each brush size its own
// instrument. I added a scale selector with three options — pentatonic, major,
// and minor — so users can change the mood of the notes without changing how
// drawing works.

// I added a volume slider and a redo button. The previous version only had undo
// and clear. Redo gives users more control over their drawing history.

// I added a loop system. It records each note with its position, colour, brush
// type, instrument, and timestamp. When the loop plays back, it replays both
// the sound and a visual trail on the canvas.

// Pen strokes replay as expanding rings. Soft brush strokes replay as glowing
// circles. This keeps the two tools visually distinct during playback.

// I updated the clear button so it resets both the drawing and the loop. The
// canvas and the sound clear together as one action.

// Compared to the previous prototype, this version feels and looks more
// interactive, more musical and engaging.
