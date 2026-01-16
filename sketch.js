//Spin & Pinch
//Shuyu Shang
//12/1/2026
//Playful, physics-driven 3D creatures

let handPose;
let video;
let hands = [];
let myFont;
let creatures = [];
const MAX_CREATURES = 18;
let lastSpawnTime = 0;

function preload() {
  handPose = ml5.handPose();
  myFont = loadFont(
    "https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Bold.otf"
  );
}

function setup() {
  setAttributes("depth", true);
  createCanvas(windowWidth, windowHeight, WEBGL);
  userStartAudio();

  video = createCapture(VIDEO);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  handPose.detectStart(video, (results) => {
    hands = results;
  });
}

function draw() {
  background(240, 238, 233);

  drawFullArtBackground();

  push();
  scale(-1, 1, 1); 

  push();
  tint(255, 35);
  imageMode(CENTER);
  let vScale = Math.max(width / 640, height / 480);
  image(video, 0, 0, 640 * vScale, 480 * vScale);
  pop();

  ambientLight(210);
  pointLight(255, 255, 255, 0, -300, 400);

  for (let i = 0; i < creatures.length; i++) {
    creatures[i].update();
    creatures[i].display();
  }

  drawFeedbackUI();
  pop();

  drawUI();
}

function drawFullArtBackground() {
  push();
  noStroke();


  fill(155, 175, 155);
  push();
  translate(width * 0.1, height * 0.45, -600);
  ellipse(200, 280, width * 2.5, height * 1.5);
  pop();

  fill(180, 195, 180);
  push();
  translate(-width * 0.3, height * 0.6, -250);
  ellipse(-40, 90, width * 2, height * 1);
  pop();

  push();
  translate(0, 0, -1); 
  noFill();
  stroke(170, 130, 90);
  strokeWeight(height * 0.08);
  rectMode(CENTER);
  rect(0, 0, width, height);
  pop();

  pop();
}

function getMappedPoint(hand, idx) {
  let kp = hand.keypoints[idx];
  return {
    x: map(kp.x, 0, 640, -width / 2, width / 2),
    y: map(kp.y, 0, 480, -height / 2, height / 2),
  };
}

function drawFeedbackUI() {
  if (hands && hands.length > 0) {
    let hand = hands[0];
    push();
    stroke(255, 100, 100, 140);
    strokeWeight(2);
    noFill();
    const fingerPaths = [
      [0, 1, 2, 3, 4],
      [0, 5, 6, 7, 8],
      [0, 9, 10, 11, 12],
      [0, 13, 14, 15, 16],
      [0, 17, 18, 19, 20],
    ];
    for (let path of fingerPaths) {
      beginShape();
      let p0 = getMappedPoint(hand, path[0]);
      curveVertex(p0.x, p0.y);
      for (let idx of path) {
        let p = getMappedPoint(hand, idx);
        curveVertex(p.x, p.y);
      }
      let pLast = getMappedPoint(hand, path[path.length - 1]);
      curveVertex(pLast.x, pLast.y);
      endShape();
    }
    pop();

    push();
    stroke(255, 215, 0, 220);
    strokeWeight(3);
    noFill();
    let richIndices = [0, 4, 8, 12, 16, 20, 17];
    beginShape();
    let pF = getMappedPoint(hand, richIndices[0]);
    curveVertex(pF.x, pF.y);
    for (let idx of richIndices) {
      let p = getMappedPoint(hand, idx);
      curveVertex(p.x, p.y);
    }
    let pL = getMappedPoint(hand, richIndices[richIndices.length - 1]);
    curveVertex(pL.x, pL.y);
    endShape();
    pop();
  }
}

function generateCreature(hand) {
  let rawPoints = [];
  let richIndices = [0, 4, 8, 12, 16, 20, 17, 0];
  let centerX = 0;
  for (let idx of richIndices) centerX += hand.keypoints[idx].x;
  centerX /= richIndices.length;
  let minY = 1000,
    maxY = -1000;
  for (let idx of richIndices) {
    let kp = hand.keypoints[idx];
    let x = abs(kp.x - centerX);
    let y = kp.y - 240;
    rawPoints.push(createVector(x, y));
    minY = min(minY, y);
    maxY = max(maxY, y);
  }
  // Core Adaptation: Data "Glue" Logic
  //Adapted from Dave Pagurek's Lathe algo.
  //Challenge: Converting noisy, absolute ML5 coordinates into a stable, 0-centered profile.
  //Solution: Calculate `centerX` to normalize position, use `abs()` to derive 3D radius.
  //(Math logic optimized with AI assistance to prevent mesh distortion)

  let finalPath = [];
  finalPath.push(createVector(0, minY - 15));
  for (let p of rawPoints) finalPath.push(p);
  finalPath.push(createVector(0, maxY + 15));
  let modelData = lathe(finalPath);
  let startX = map(hand.keypoints[8].x, 0, 640, -width / 2, width / 2);
  let startY = map(hand.keypoints[8].y, 0, 480, -height / 2, height / 2);
  creatures.push(new Creature(startX, startY, modelData));
  if (creatures.length > MAX_CREATURES) creatures.shift();
}

class Creature {
  constructor(x, y, modelData) {
    this.pos = createVector(x, y, 0);
    this.vel = createVector(random(-2, 2), random(-4, -1));
    this.acc = createVector(0, 0.15);
    this.rot = createVector(PI, random(TWO_PI), 0);
    this.rotVel = createVector(0, random(0.01, 0.03), 0);
    this.modelData = modelData;
    this.state = "falling";
    this.noiseOffsets = createVector(random(1000), random(2000), random(3000));
    colorMode(HSB, 360, 100, 100, 1);
    this.color = color(random(360), 30, 95, 1.0);
    colorMode(RGB, 255);
  }
  update() {
    if (this.state === "falling") {
      this.vel.add(this.acc);
      this.pos.add(this.vel);
      this.rot.add(this.rotVel);
      if (this.pos.y > height / 2 - 150) this.state = "wandering";
    } else {
      let speed = 1.0;
      let nx = map(noise(this.noiseOffsets.x), 0, 1, -speed, speed);
      let ny = map(noise(this.noiseOffsets.y), 0, 1, -speed, speed);
      this.pos.add(nx, ny, 0);
      this.rot.y += this.rotVel.y;
      this.noiseOffsets.add(0.005, 0.005, 0);
    }
  }
  display() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    rotateX(this.rot.x);
    rotateY(this.rot.y);
    rotateZ(this.rot.z);
    push();
    noStroke();
    fill(this.color);
    ambientMaterial(this.color);
    specularMaterial(100);
    shininess(5);
    scale(0.6);
    model(this.modelData.geom);
    pop();
    this.drawEye(22, -35, 45);
    this.drawEye(-22, -35, 45);
    pop();
  }
  drawEye(ox, oy, oz) {
    push();
    translate(ox, oy, oz);
    let look = sin(frameCount * 0.05) * 0.15;
    rotateY(look);
    fill(255);
    noStroke();
    sphere(11);
    translate(0, 0, 7);
    fill(40);
    sphere(7.5);
    translate(2, -2, 4);
    fill(255);
    sphere(2.5);
    pop();
  }
}

function mousePressed() {
  if (getAudioContext().state !== "running") {
    getAudioContext().resume();
  }

  let now = millis();
  if (now - lastSpawnTime > 300) {
    if (hands && hands.length > 0) {
      generateCreature(hands[0]);
      playCutePopSound();

      lastSpawnTime = now;
    }
  }
}

function keyPressed() {
  if (key === "f" || key === "F") fullscreen(!fullscreen());
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
function drawUI() {
  if (!myFont) return;
  push();
  translate(-width / 2 + 30, -height / 2 + 50);
  textFont(myFont);
  textSize(14);
  fill(150);
  noStroke();
  text("CLICK TO SPAWN CREATURE", 10, 0);
  pop();
}

function playCutePopSound() {
  let osc = new p5.Oscillator("sine");
  let freq = random(800, 1200);
  osc.freq(freq);
  osc.amp(0);
  osc.start();
  osc.amp(0.3, 0.01);
  osc.amp(0, 0.2, 0.05);
  osc.stop(0.3);
  // Optimized with AI assistance
}
