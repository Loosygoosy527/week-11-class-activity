/* DM3014 Interactive Devices, Ashley Hi 2026
   Week 11 – Remote Interaction
   Dance party edition (simple): come closer and a sunburst beats
   in a new colour on every beat. Leave and it collapses away.
*/

// ── Settings ─────────────────────────────────────────────────────
const FAR_CM = 200; // anything further than this counts as "nobody"
const DAY = "#f3e8ff"; // background when nobody is near
const NIGHT = "#1b1030"; // background when someone is right there
const BPM = 100; // speed of the beat
const BARS = 48; // number of bars in the sunburst

const COLORS = ["#ff78c8", "#ffb347", "#ffe066", "#5eead4", "#60a5fa", "#c084fc"];

const LINES = [
  "Join me for a dancing party!",
  "Come closer, feel the beat!",
  "The party starts when you do.",
  "Dance with me!",
];

let smooth = FAR_CM; // eased distance
let shown = 0; // text visibility, 0 to 1
let message = "";
let palette = [];
let confetti = []; // burst when someone arrives
let leaveRing = null; // collapsing ring when someone leaves

// ── Setup ────────────────────────────────────────────────────────

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  palette = COLORS.map((c) => color(c));

  sensor.connect(firebaseConfig, DATA_PATH);

  sensor.on("near", () => {
    message = random(LINES);
    for (let i = 0; i < 60; i++) {
      const a = random(TWO_PI);
      const sp = random(3, 10);
      confetti.push({
        x: width / 2,
        y: height / 2,
        vx: cos(a) * sp,
        vy: sin(a) * sp - 2,
        col: random(palette),
        life: 1,
      });
    }
  });

  sensor.on("far", () => {
    leaveRing = { t: 0, col: random(palette) };
  });
}

// ── Draw ─────────────────────────────────────────────────────────

function draw() {
  const cx = width / 2;
  const cy = height / 2;
  const maxR = min(width, height) * 0.45;

  const target = sensor.distance > 0 ? min(sensor.distance, FAR_CM) : FAR_CM;
  smooth = lerp(smooth, target, 0.08);
  const closeness = constrain(map(smooth, FAR_CM, 10, 0, 1), 0, 1);

  const beats = (millis() / 1000) * (BPM / 60);
  const kick = pow(1 - (beats % 1), 3);
  const beat = kick * closeness;
  const glow = palette[floor(beats) % palette.length]; // new colour each beat

  // 3. Background darkens as they come closer.
  background(lerpColor(color(DAY), color(NIGHT), closeness));

  // 4. Sunburst of bars. Grows as they come close, shrinks as they leave.
  push();
  translate(cx, cy);
  rotate(millis() * 0.0003);
  strokeCap(ROUND);
  strokeWeight(max(1, maxR * 0.025 * closeness));
  const innerR = maxR * 0.2 * closeness * (1 + 0.25 * beat);
  for (let i = 0; i < BARS; i++) {
    const ang = (TWO_PI * i) / BARS;
    const len = maxR * 0.5 * closeness * (0.2 + 0.8 * noise(i * 0.25, millis() * 0.0015) + 0.6 * beat);
    stroke(red(glow), green(glow), blue(glow), 60 + 195 * closeness);
    line(cos(ang) * innerR, sin(ang) * innerR, cos(ang) * (innerR + len), sin(ang) * (innerR + len));
  }
  pop();

  // 5. Glowing core that punches out on each kick.
  noStroke();
  fill(red(glow), green(glow), blue(glow), 230 * closeness);
  circle(cx, cy, maxR * 0.28 * closeness * (1 + 0.35 * beat));

  // 6. Ring that collapses inward when someone leaves.
  if (leaveRing) {
    leaveRing.t += 0.03;
    if (leaveRing.t >= 1) {
      leaveRing = null;
    } else {
      noFill();
      stroke(red(leaveRing.col), green(leaveRing.col), blue(leaveRing.col), 200 * (1 - leaveRing.t));
      strokeWeight(6);
      circle(cx, cy, maxR * 1.8 * (1 - leaveRing.t * leaveRing.t));
      noStroke();
    }
  }

  // 7. Confetti from arrivals.
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i];
    p.vy += 0.25;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.012;
    if (p.life <= 0) {
      confetti.splice(i, 1);
      continue;
    }
    fill(red(p.col), green(p.col), blue(p.col), 255 * p.life);
    rect(p.x, p.y, 10, 5);
  }

  // 8. The message fades in while they're near, and bounces on the beat.
  shown = lerp(shown, sensor.near ? 1 : 0, 0.06);
  fill(255, 255 * shown);
  textFont("Karla");
  textSize(min(width, height) * 0.05 * (1 + 0.08 * beat));
  text(message, cx, cy + min(width, height) * 0.3, width * 0.8, min(width, height) * 0.2);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}