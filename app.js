(() => {
  "use strict";

  const WORLDS = [
    { id: "meadow", name: "Sunlit Meadow", short: "Sunlit Meadow", icon: "☀", subtitle: "Tall grass & sleepy clouds", description: "A soft, sunny beginning where the flowers nod hello.", mood: "GENTLE", sky: ["#dcebdd", "#f4eecf"], far: "#a5c39a", near: "#769a70", ground: "#748f60", pipe: "#708b60", pale: "#e8eddc", motif: "flower" },
    { id: "orchard", name: "Amber Orchard", short: "Amber Orchard", icon: "🍂", subtitle: "Golden leaves & gentle breezes", description: "A warm little orchard with leaves that dance along.", mood: "GOLDEN", sky: ["#f0ddbe", "#f4c99e"], far: "#c7a873", near: "#aa805b", ground: "#817551", pipe: "#9b7550", pale: "#f1e4ce", motif: "leaf" },
    { id: "canyon", name: "Whispering Canyon", short: "Whispering Canyon", icon: "☁", subtitle: "Rust-red cliffs & open skies", description: "Big cliffs, long shadows, and room to find your wings.", mood: "WILD", sky: ["#e6c3a6", "#f0dfc3"], far: "#b98169", near: "#a76253", ground: "#90654b", pipe: "#99614b", pale: "#f1ddd0", motif: "cactus" },
    { id: "coast", name: "Bluebell Coast", short: "Bluebell Coast", icon: "〰", subtitle: "Salty air & rolling blue waves", description: "A seaside daydream, best explored one breeze at a time.", mood: "BREEZY", sky: ["#c7e4e0", "#ecf0d4"], far: "#83b8b1", near: "#689991", ground: "#738c76", pipe: "#588b82", pale: "#dcece5", motif: "wave" },
    { id: "moon", name: "Moonmilk Hollow", short: "Moonmilk Hollow", icon: "☾", subtitle: "Velvet skies & drowsy stars", description: "A quiet moonlit world for little night-owl birds.", mood: "DREAMY", sky: ["#293957", "#596184"], far: "#68718c", near: "#626781", ground: "#494f69", pipe: "#79758e", pale: "#e3e3ec", motif: "star" },
    { id: "bloom", name: "Poppyfield Rise", short: "Poppyfield Rise", icon: "✿", subtitle: "A confetti of bright wildflowers", description: "A joyful jumble of blooms, bees, and big blue sky.", mood: "JUBILANT", sky: ["#d2e6e5", "#f0e6cb"], far: "#a9bf98", near: "#7d9a70", ground: "#77865b", pipe: "#6e8b59", pale: "#eee7d4", motif: "poppy" },
  ];
  const BIRDS = [
    { id: "poppy", name: "Poppy", note: "The little daydreamer", icon: "✿", color: "#d27c50", bg: "#f2e4d1", body: "#ee995f", wing: "#cf6f4d" },
    { id: "blue", name: "Bluebell", note: "The happy wanderer", icon: "✦", color: "#5f91ac", bg: "#dce9e8", body: "#73a9bd", wing: "#54879c" },
    { id: "clover", name: "Clover", note: "The sunny-side-up", icon: "✿", color: "#768d53", bg: "#e5e9d8", body: "#a3b96e", wing: "#758c4f" },
    { id: "plum", name: "Plum", note: "The little night owl", icon: "✦", color: "#8b719d", bg: "#e9e1ed", body: "#a98cb4", wing: "#826b99" },
  ];
  const STORAGE_KEY = "littlewing-save-v1";
  const freshSave = () => ({ world: "meadow", bird: "poppy", best: 0, flights: 0, gates: 0, visited: [], sound: true });
  let save = loadSave();
  let tab = "flight";
  let mode = "ready";
  let worldId = save.world;
  let score = 0;
  let birdY = 295;
  let birdVelocity = 0;
  let obstacles = [];
  let sceneTime = 0;
  let lastFrame = 0;
  let frameRequest = 0;
  let audioContext = null;
  let pointerDown = false;

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  const canvasWrap = document.querySelector("#canvas-wrap");

  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!raw || typeof raw !== "object") return freshSave();
      const defaults = freshSave();
      return {
        ...defaults, ...raw,
        world: WORLDS.some((item) => item.id === raw.world) ? raw.world : defaults.world,
        bird: BIRDS.some((item) => item.id === raw.bird) ? raw.bird : defaults.bird,
        best: Number.isFinite(raw.best) ? Math.max(0, raw.best) : 0,
        flights: Number.isFinite(raw.flights) ? Math.max(0, raw.flights) : 0,
        gates: Number.isFinite(raw.gates) ? Math.max(0, raw.gates) : 0,
        visited: Array.isArray(raw.visited) ? raw.visited.filter((id) => WORLDS.some((item) => item.id === id)) : [],
        sound: raw.sound !== false,
      };
    } catch {
      return freshSave();
    }
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch { /* The game still works without storage. */ }
  }

  function currentWorld() { return WORLDS.find((item) => item.id === worldId) || WORLDS[0]; }
  function currentBird() { return BIRDS.find((item) => item.id === save.bird) || BIRDS[0]; }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(width / 390, 0, 0, height / 600, 0, 0);
    drawScene();
  }

  function seeded(index, salt = 0) {
    const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function drawCloud(x, y, size, alpha = 0.7) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fffdf3";
    ctx.beginPath();
    ctx.moveTo(x - size * .68, y + size * .12);
    ctx.quadraticCurveTo(x - size * .8, y - size * .04, x - size * .57, y - size * .1);
    ctx.quadraticCurveTo(x - size * .51, y - size * .48, x - size * .16, y - size * .34);
    ctx.quadraticCurveTo(x + size * .08, y - size * .63, x + size * .3, y - size * .33);
    ctx.quadraticCurveTo(x + size * .67, y - size * .38, x + size * .57, y - size * .06);
    ctx.quadraticCurveTo(x + size * .87, y + size * .11, x + size * .58, y + size * .19);
    ctx.quadraticCurveTo(x, y + size * .31, x - size * .68, y + size * .12);
    ctx.fill();
    ctx.strokeStyle = "#fffdf3";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawHills(color, base, amplitude, offset, frequency) {
    ctx.beginPath();
    ctx.moveTo(0, 600);
    for (let x = 0; x <= 410; x += 5) {
      const wobble = (seeded(Math.floor(x / 10), Math.floor(offset / 13)) - .5) * amplitude * .055;
      const y = base + Math.sin((x + offset) * frequency) * amplitude + Math.sin((x + offset) * frequency * .43) * amplitude * .48 + wobble;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(410, 600);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    for (let x = 0; x <= 410; x += 5) {
      const wobble = (seeded(Math.floor(x / 10), Math.floor(offset / 13)) - .5) * amplitude * .055;
      const y = base + Math.sin((x + offset) * frequency) * amplitude + Math.sin((x + offset) * frequency * .43) * amplitude * .48 + wobble;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.save();
    ctx.globalAlpha = .32;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  function drawPetalBloom(x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#67533c88";
    ctx.lineWidth = 1;
    ctx.fillStyle = color;
    for (let petal = 0; petal < 6; petal++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * petal) / 6);
      ctx.beginPath();
      ctx.ellipse(0, -size * .52, size * .25, size * .48, -.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.fillStyle = "#d5a34f";
    ctx.arc(0, 0, size * .2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawFieldDetails(world, time, width, height) {
    ctx.save();
    for (let i = 0; i < 13; i++) {
      const span = width + 50;
      const x = ((seeded(i, 72) * span + time * .012 * (1 + (i % 3) * .25)) % span) - 25;
      const y = height * (.78 + seeded(i, 73) * .15);
      const stemHeight = 8 + seeded(i, 74) * 12;
      ctx.strokeStyle = world.id === "moon" ? "#e8e0c5a8" : `${world.ground}b8`;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.quadraticCurveTo(x + 2, y + 2, x - 1 + seeded(i, 75) * 3, y - stemHeight);
      ctx.stroke();
      if (world.id === "meadow" || world.id === "bloom" || world.id === "orchard") {
        const flowerColor = world.id === "bloom" ? (i % 2 ? "#df725e" : "#e4c56f") : world.id === "orchard" ? "#e6ad65" : "#f1d58e";
        ctx.fillStyle = world.near;
        ctx.beginPath();
        ctx.ellipse(x - 3, y + 1, 4, 1.8, -.5, 0, Math.PI * 2);
        ctx.ellipse(x + 3, y - 3, 4, 1.8, .5, 0, Math.PI * 2);
        ctx.fill();
        drawPetalBloom(x, y - stemHeight, 4 + seeded(i, 76) * 3, flowerColor);
      } else if (world.id === "canyon") {
        ctx.strokeStyle = world.ground;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + 7);
        ctx.lineTo(x, y - stemHeight);
        ctx.moveTo(x, y - 1);
        ctx.lineTo(x - 4, y - 4);
        ctx.lineTo(x - 4, y - 8);
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x + 4, y - 1);
        ctx.lineTo(x + 4, y - 5);
        ctx.stroke();
      } else if (world.id === "coast") {
        ctx.strokeStyle = "#fff9e9";
        ctx.beginPath();
        ctx.moveTo(x - 7, y);
        ctx.quadraticCurveTo(x - 2, y - 3, x + 2, y);
        ctx.quadraticCurveTo(x + 6, y + 3, x + 10, y);
        ctx.stroke();
      } else if (world.id === "moon") {
        drawMotif(x, y - stemHeight, 5 + seeded(i, 77) * 3, "star", "#efe3c0", .7);
      }
    }
    ctx.restore();
  }

  function drawPaperGrain(width, height) {
    ctx.save();
    ctx.globalAlpha = .09;
    for (let i = 0; i < 110; i++) {
      const x = seeded(i, 101) * width;
      const y = seeded(i, 102) * height;
      const size = .45 + seeded(i, 103) * .75;
      ctx.fillStyle = i % 3 ? "#6c6048" : "#fff8e8";
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  function drawMotif(x, y, size, motif, color, alpha = .55) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    if (motif === "star") {
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const angle = (Math.PI * p) / 4 - Math.PI / 2;
        const radius = p % 2 ? size * .18 : size * .48;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    } else if (motif === "wave") {
      ctx.beginPath(); ctx.moveTo(-size, 0);
      for (let px = -size; px <= size; px += 3) ctx.lineTo(px, Math.sin(px / size * Math.PI * 2) * size * .14);
      ctx.stroke();
    } else if (motif === "cactus") {
      ctx.beginPath(); ctx.moveTo(0, size); ctx.lineTo(0, -size);
      ctx.lineTo(size * .3, -size); ctx.lineTo(size * .3, -size * .35);
      ctx.lineTo(size * .7, -size * .35); ctx.lineTo(size * .7, size * .05);
      ctx.moveTo(0, size * .2); ctx.lineTo(-size * .42, size * .2); ctx.lineTo(-size * .42, -size * .25);
      ctx.lineTo(-size * .12, -size * .25); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, size * .48, size * .26, -.65, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-size * .35, size * .35); ctx.lineTo(size * .35, -size * .35); ctx.stroke();
      if (motif === "flower" || motif === "poppy") {
        ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const a = (Math.PI * 2 * p) / 5;
          ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * size * .55, Math.sin(a) * size * .55);
        }
        ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, size * .13, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBackdrop(world, time = sceneTime, width = 390, height = 600) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, world.sky[0]);
    gradient.addColorStop(1, world.sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (world.id === "moon") {
      ctx.fillStyle = "#f4e6bf";
      ctx.beginPath(); ctx.arc(width * .77, height * .17, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = world.sky[0];
      ctx.beginPath(); ctx.arc(width * .8, height * .14, 25, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 32; i++) {
        const x = seeded(i, 41) * width;
        const y = seeded(i, 17) * height * .57;
        const pulse = .5 + .4 * Math.sin(time * .001 + i);
        drawMotif(x, y, 3 + seeded(i, 4) * 5, "star", "#f6edce", pulse);
      }
    } else {
      ctx.fillStyle = "#f4dc9d";
      ctx.globalAlpha = .76;
      ctx.beginPath(); ctx.arc(width * .77, height * .16, 27, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {
        const span = width + 150;
        let x = ((seeded(i, 9) * span + time * .008 * (i % 2 ? .6 : .36)) % span) - 75;
        drawCloud(x, height * (.19 + seeded(i, 6) * .25), 22 + seeded(i, 2) * 25, .38);
      }
      if (world.id === "coast") {
        for (let i = 0; i < 4; i++) drawMotif(seeded(i, 13) * width, 100 + seeded(i, 8) * 185, 12 + seeded(i, 7) * 12, "wave", "#fffef3", .27);
      }
    }

    drawHills(world.far, height * .63, height * .075, time * .008, .009);
    drawHills(world.near, height * .74, height * .048, time * .014, .013);

    for (let i = 0; i < 18; i++) {
      const x = seeded(i, 37) * width;
      const y = height * .67 + seeded(i, 52) * height * .25;
      const size = 7 + seeded(i, 61) * 11;
      const motif = world.id === "moon" ? "star" : world.motif;
      drawMotif(x, y, size, motif, world.id === "moon" ? "#dad1bb" : world.ground, .23);
    }

    drawFieldDetails(world, time, width, height);

    const groundY = height - 20;
    ctx.fillStyle = world.ground;
    ctx.fillRect(0, groundY, width, 20);
    ctx.fillStyle = "#fff7e9";
    ctx.globalAlpha = .25;
    for (let x = 0; x < width; x += 11) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 2 + seeded(x, 6) * 5, groundY - 3 - seeded(x, 8) * 4);
      ctx.lineTo(x + 7, groundY);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawPaperGrain(width, height);
  }

  function drawGateColumn(x, y, width, height, world) {
    if (height <= 0) return;
    const segments = 8;
    ctx.beginPath();
    ctx.moveTo(x + 3, y);
    for (let i = 0; i <= segments; i++) {
      const py = y + (height * i) / segments;
      const wobble = (seeded(i, Math.floor(x)) - .5) * 3;
      ctx.lineTo(x + wobble, py);
    }
    ctx.lineTo(x + width + 2, y + height);
    for (let i = segments; i >= 0; i--) {
      const py = y + (height * i) / segments;
      const wobble = (seeded(i, Math.floor(x) + 17) - .5) * 3;
      ctx.lineTo(x + width + wobble, py);
    }
    ctx.closePath();
    ctx.fillStyle = world.pipe;
    ctx.fill();
    ctx.strokeStyle = "#344d3b9a";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = .28;
    ctx.strokeStyle = "#fff4da";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const markY = y + 10 + seeded(i, Math.floor(x) + 27) * Math.max(10, height - 20);
      const markX = x + 8 + seeded(i, 35) * (width - 15);
      ctx.beginPath();
      ctx.moveTo(markX, markY);
      ctx.lineTo(markX + 4 + seeded(i, 36) * 8, markY - 2 + seeded(i, 37) * 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGateCap(x, y, width, height, world) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 3);
    ctx.quadraticCurveTo(x + width * .45, y - 1, x + width - 3, y + 3);
    ctx.quadraticCurveTo(x + width + 1, y + height * .48, x + width - 2, y + height - 3);
    ctx.quadraticCurveTo(x + width * .51, y + height + 2, x + 3, y + height - 2);
    ctx.quadraticCurveTo(x - 2, y + height * .48, x + 4, y + 3);
    ctx.closePath();
    ctx.fillStyle = world.pipe;
    ctx.fill();
    ctx.strokeStyle = "#344d3b9a";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = .34;
    ctx.strokeStyle = "#fff3d3";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + height * .35);
    ctx.quadraticCurveTo(x + width * .48, y + height * .2, x + width - 8, y + height * .38);
    ctx.stroke();
    ctx.restore();
  }

  function drawObstacle(obstacle, world) {
    const cap = 18;
    const bottom = 580;
    const topHeight = Math.max(0, obstacle.gapY - obstacle.gap / 2);
    const bottomY = obstacle.gapY + obstacle.gap / 2;
    ctx.save();
    drawGateColumn(obstacle.x, -8, 48, topHeight + 8, world);
    drawGateCap(obstacle.x - 6, topHeight - 12, 60, 20, world);
    drawGateColumn(obstacle.x, bottomY, 48, bottom - bottomY, world);
    drawGateCap(obstacle.x - 6, bottomY - 8, 60, 20, world);
    ctx.strokeStyle = "#fff6db8a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 11, 7);
    ctx.quadraticCurveTo(obstacle.x + 8, topHeight * .45, obstacle.x + 12, Math.max(5, topHeight - cap));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 11, bottomY + 25);
    ctx.quadraticCurveTo(obstacle.x + 14, bottomY + (bottom - bottomY) * .48, obstacle.x + 10, bottom - 5);
    ctx.stroke();
    ctx.restore();
  }

  function drawBird(x, y, time, tilt = 0) {
    const bird = currentBird();
    const wingLift = Math.sin(time * .018) * 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.strokeStyle = "#664a3c";
    ctx.lineWidth = 1.7;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.fillStyle = bird.wing;
    ctx.beginPath();
    ctx.moveTo(-17, 1);
    ctx.quadraticCurveTo(-26, -5, -23, -11);
    ctx.quadraticCurveTo(-17, -10, -15, -5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = bird.body;
    ctx.beginPath();
    ctx.moveTo(-19, 2);
    ctx.bezierCurveTo(-19, -8, -12, -15, -3, -15);
    ctx.bezierCurveTo(7, -17, 16, -10, 18, -3);
    ctx.bezierCurveTo(21, 5, 13, 13, 4, 14);
    ctx.bezierCurveTo(-6, 16, -16, 11, -19, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = bird.wing;
    ctx.beginPath();
    ctx.moveTo(-11, 0 + wingLift);
    ctx.quadraticCurveTo(-12, -8 + wingLift, -6, -9 + wingLift);
    ctx.quadraticCurveTo(-2, -11 + wingLift, 1, -7 + wingLift);
    ctx.quadraticCurveTo(7, -8 + wingLift, 8, -2 + wingLift);
    ctx.quadraticCurveTo(1, 4 + wingLift, -11, 0 + wingLift);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = .56;
    ctx.lineWidth = .9;
    ctx.beginPath();
    ctx.moveTo(-7, -1 + wingLift);
    ctx.quadraticCurveTo(-2, -5 + wingLift, 3, -3 + wingLift);
    ctx.moveTo(-4, 1 + wingLift);
    ctx.quadraticCurveTo(1, -2 + wingLift, 5, 0 + wingLift);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#fff6df";
    ctx.beginPath(); ctx.arc(8, -5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#30403b";
    ctx.beginPath(); ctx.arc(10, -5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d78256";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.quadraticCurveTo(21, 2, 26, 4);
    ctx.quadraticCurveTo(21, 7, 16, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#664a3c";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, 13);
    ctx.lineTo(-4, 17);
    ctx.lineTo(-8, 18);
    ctx.moveTo(5, 13);
    ctx.lineTo(6, 17);
    ctx.lineTo(2, 18);
    ctx.stroke();
    ctx.restore();
  }

  function drawScoreOnCanvas() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "700 40px Fraunces, Georgia, serif";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#39493845";
    ctx.strokeText(String(score), 195, 72);
    ctx.fillStyle = "#fffdf0";
    ctx.fillText(String(score), 195, 72);
    ctx.restore();
  }

  function drawReadySign() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#384e3c";
    ctx.font = "700 18px Fraunces, Georgia, serif";
    ctx.fillText("a little adventure awaits", 195, 155);
    ctx.fillStyle = "#667766";
    ctx.font = "16px Kalam, cursive";
    ctx.fillText("flap when you're ready", 195, 176);
    ctx.restore();
  }

  function drawScene() {
    if (!ctx || !canvas.width || !canvas.height) return;
    ctx.save();
    ctx.setTransform(canvas.width / 390, 0, 0, canvas.height / 600, 0, 0);
    const world = currentWorld();
    drawBackdrop(world, sceneTime);
    if (mode === "playing" || mode === "paused" || mode === "over") {
      obstacles.forEach((obstacle) => drawObstacle(obstacle, world));
      drawScoreOnCanvas();
    }
    if (mode === "ready") {
      const idleY = 285 + Math.sin(sceneTime * .003) * 6;
      drawBird(110, idleY, sceneTime, -.07);
      drawReadySign();
    } else {
      const tilt = mode === "over" ? .62 : Math.max(-.45, Math.min(.62, birdVelocity * .065));
      drawBird(105, birdY, sceneTime, tilt);
    }
    if (mode === "over") {
      ctx.fillStyle = "#f5f2e9";
      ctx.globalAlpha = .86;
      ctx.fillRect(53, 204, 284, 144);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#667f65";
      ctx.lineWidth = 1;
      ctx.strokeRect(53.5, 204.5, 283, 143);
      ctx.textAlign = "center";
      ctx.fillStyle = "#355440";
      ctx.font = "700 24px Fraunces, Georgia, serif";
      ctx.fillText("What a lovely try.", 195, 246);
      ctx.fillStyle = "#73766a";
      ctx.font = "12px DM Sans, sans-serif";
      ctx.fillText(score ? `You flew past ${score} little gate${score === 1 ? "" : "s"}.` : "Every great flight starts with a flap.", 195, 274);
      ctx.fillStyle = "#a0804a";
      ctx.font = "10px DM Mono, monospace";
      ctx.fillText("TAP TO TRY AGAIN", 195, 320);
    }
    ctx.restore();
  }

  function resetFlight(nextMode = "ready") {
    score = 0;
    birdY = 290;
    birdVelocity = 0;
    obstacles = [];
    if (nextMode === "playing") {
      obstacles = [{ x: 315, gapY: 287, gap: 170, scored: false }];
    }
    mode = nextMode;
    updateFlightUI();
    drawScene();
  }

  function startFlight() {
    if (mode === "playing") return;
    if (mode === "paused") {
      mode = "playing";
      document.querySelector("#pause-chip").hidden = true;
      document.querySelector("#run-label").textContent = "IN THE AIR";
      document.querySelector("#run-indicator").classList.add("running");
      lastFrame = performance.now();
      return;
    }
    resetFlight("playing");
    save.flights += 1;
    save.visited = Array.from(new Set([...save.visited, worldId]));
    persist();
    updateJournal();
    flap();
    document.querySelector("#canvas-hint").classList.add("is-hidden");
    document.querySelector("#run-label").textContent = "IN THE AIR";
    document.querySelector("#run-indicator").classList.add("running");
    lastFrame = performance.now();
  }

  function flap() {
    if (mode === "ready" || mode === "over") {
      startFlight();
      return;
    }
    if (mode !== "playing") return;
    birdVelocity = -6.25;
    playTone(460 + Math.random() * 90, .045, "sine", .035);
  }

  function pauseFlight() {
    if (mode === "playing") {
      mode = "paused";
      document.querySelector("#pause-chip").hidden = false;
      document.querySelector("#run-label").textContent = "TAKE YOUR TIME";
      document.querySelector("#run-indicator").classList.remove("running");
      document.querySelector("#run-indicator").classList.add("paused");
    } else if (mode === "paused") {
      startFlight();
      document.querySelector("#run-indicator").classList.remove("paused");
    }
    drawScene();
  }

  function endFlight() {
    if (mode !== "playing") return;
    mode = "over";
    document.querySelector("#run-label").textContent = "A LOVELY LITTLE TRY";
    document.querySelector("#run-indicator").classList.remove("running", "paused");
    document.querySelector("#pause-chip").hidden = true;
    document.querySelector("#canvas-hint").classList.remove("is-hidden");
    document.querySelector("#start-button span:first-child").textContent = "Fly again";
    playTone(190, .14, "triangle", .045);
    if (score > save.best) save.best = score;
    persist();
    updateFlightUI();
    drawScene();
  }

  function updateFlightUI() {
    document.querySelector("#score-value").textContent = String(score).padStart(2, "0");
    document.querySelector("#best-value").textContent = String(save.best);
    document.querySelector("#heading-best").textContent = String(save.best);
    document.querySelector("#pause-button").disabled = mode === "ready" || mode === "over";
    document.querySelector("#pause-button").textContent = mode === "paused" ? "▶" : "Ⅱ";
    document.querySelector("#pause-button").setAttribute("aria-label", mode === "paused" ? "Resume game" : "Pause game");
    if (mode === "ready") {
      document.querySelector("#canvas-hint").classList.remove("is-hidden");
      document.querySelector("#start-button span:first-child").textContent = "Take flight";
    }
  }

  function tick(time) {
    frameRequest = requestAnimationFrame(tick);
    if (!lastFrame) lastFrame = time;
    const delta = Math.min((time - lastFrame) / 16.667, 2);
    lastFrame = time;
    if (document.hidden || tab !== "flight") return;
    sceneTime += Math.min(delta, 2) * 16.667;
    if (mode === "playing") {
      const speed = (2.7 + Math.min(score * .045, 1.45)) * delta;
      birdVelocity += .34 * delta;
      birdY += birdVelocity * delta;
      obstacles.forEach((obstacle) => {
        obstacle.x -= speed;
        if (!obstacle.scored && obstacle.x + 48 < 105) {
          obstacle.scored = true;
          score += 1;
          save.gates += 1;
          if (score > save.best) save.best = score;
          persist();
          updateFlightUI();
          playTone(690, .09, "sine", .05);
        }
      });
      if (obstacles.length && obstacles[0].x < -70) obstacles.shift();
      const lastObstacle = obstacles[obstacles.length - 1];
      if (!lastObstacle || lastObstacle.x < 155) {
        const gap = Math.max(142, 170 - Math.floor(score / 6) * 3);
        const margin = gap / 2 + 36;
        obstacles.push({ x: 425, gapY: margin + Math.random() * (560 - margin * 2), gap, scored: false });
      }
      if (birdY - 10 < 0 || birdY + 11 > 580) {
        endFlight();
      } else {
        for (const obstacle of obstacles) {
          const inX = 105 + 15 > obstacle.x && 105 - 15 < obstacle.x + 48;
          const outsideGap = birdY - 11 < obstacle.gapY - obstacle.gap / 2 || birdY + 11 > obstacle.gapY + obstacle.gap / 2;
          if (inX && outsideGap) { endFlight(); break; }
        }
      }
    }
    if (mode !== "playing" && mode !== "paused" && mode !== "over") {
      birdY = 290 + Math.sin(sceneTime * .003) * 6;
    }
    drawScene();
  }

  function playTone(frequency, duration, type, volume) {
    if (!save.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch { /* Sound is an optional extra; gameplay has no audio dependency. */ }
  }

  function setWorld(id) {
    if (!WORLDS.some((item) => item.id === id)) return;
    worldId = id;
    save.world = id;
    persist();
    resetFlight();
    updateWorldUI();
    renderWorldGrid();
    if (tab !== "flight") switchTab("flight");
    else resizeCanvas();
  }

  function updateWorldUI() {
    const world = currentWorld();
    document.querySelector("#current-world-name").textContent = world.name;
    document.querySelector("#world-chip-art").textContent = world.icon;
    const next = WORLDS[(WORLDS.findIndex((item) => item.id === worldId) + 1) % WORLDS.length];
    document.querySelector("#next-world-name").textContent = next.name;
    document.querySelector("#next-world-caption").textContent = next.subtitle;
    document.querySelector("#next-world-art").textContent = next.icon;
  }

  function switchTab(nextTab) {
    if (!["flight", "worlds", "birds", "journal"].includes(nextTab)) return;
    if (mode === "playing") pauseFlight();
    tab = nextTab;
    document.querySelectorAll(".nav-tab").forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.querySelectorAll(".page-section").forEach((section) => {
      const active = section.id === `page-${tab}`;
      section.hidden = !active;
      section.classList.toggle("active", active);
    });
    if (tab === "worlds") renderWorldGrid();
    if (tab === "birds") renderBirdGrid();
    if (tab === "journal") updateJournal();
    if (tab === "flight") requestAnimationFrame(resizeCanvas);
  }

  function paintThumbnail(canvasElement, world) {
    const context = canvasElement.getContext("2d");
    const rect = canvasElement.getBoundingClientRect();
    const width = Math.max(220, Math.round(rect.width * Math.min(devicePixelRatio || 1, 2)));
    const height = Math.max(160, Math.round(rect.height * Math.min(devicePixelRatio || 1, 2)));
    canvasElement.width = width;
    canvasElement.height = height;
    context.setTransform(width / 390, 0, 0, height / 180, 0, 0);
    const drawMiniFlower = (x, y, size, color) => {
      context.save();
      context.translate(x, y);
      context.fillStyle = color;
      context.strokeStyle = "#67533c88";
      context.lineWidth = .7;
      for (let petal = 0; petal < 5; petal++) {
        context.save();
        context.rotate((Math.PI * 2 * petal) / 5);
        context.beginPath();
        context.ellipse(0, -size * .5, size * .25, size * .48, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
      }
      context.fillStyle = "#d5a34f";
      context.beginPath();
      context.arc(0, 0, size * .2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };
    const drawMiniStar = (x, y, size) => {
      context.save();
      context.translate(x, y);
      context.fillStyle = "#f6edce";
      context.beginPath();
      for (let point = 0; point < 8; point++) {
        const angle = (Math.PI * point) / 4 - Math.PI / 2;
        const radius = point % 2 ? size * .2 : size * .5;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.restore();
    };

    const sky = context.createLinearGradient(0, 0, 0, 180);
    sky.addColorStop(0, world.sky[0]);
    sky.addColorStop(1, world.sky[1]);
    context.fillStyle = sky;
    context.fillRect(0, 0, 390, 180);
    if (world.id === "moon") {
      context.fillStyle = "#f3e4bf";
      context.beginPath();
      context.arc(305, 34, 19, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = world.sky[0];
      context.beginPath();
      context.arc(313, 28, 17, 0, Math.PI * 2);
      context.fill();
      for (let i = 0; i < 11; i++) drawMiniStar(18 + seeded(i, 91) * 350, 12 + seeded(i, 92) * 76, 3 + seeded(i, 93) * 3);
    } else {
      context.fillStyle = "#f4dc9d";
      context.beginPath();
      context.arc(308, 35, 18, 0, Math.PI * 2);
      context.fill();
      for (let i = 0; i < 3; i++) {
        const x = 35 + seeded(i, 88) * 330;
        const y = 31 + seeded(i, 89) * 44;
        context.fillStyle = "#fffdf3a8";
        context.beginPath();
        context.ellipse(x, y, 25, 7, 0, 0, Math.PI * 2);
        context.ellipse(x - 9, y - 4, 12, 8, -.2, 0, Math.PI * 2);
        context.ellipse(x + 7, y - 5, 14, 9, .2, 0, Math.PI * 2);
        context.fill();
      }
    }

    const paintHill = (base, amplitude, color, phase) => {
      context.beginPath();
      context.moveTo(0, 180);
      for (let x = 0; x <= 400; x += 8) {
        const y = base + Math.sin((x + phase) * .018) * amplitude + Math.sin((x + phase) * .043) * amplitude * .2;
        context.lineTo(x, y);
      }
      context.lineTo(400, 180);
      context.closePath();
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = `${color}b8`;
      context.lineWidth = 1.3;
      context.stroke();
    };
    paintHill(103, 15, world.far, 8);
    paintHill(127, 12, world.near, 48);
    paintHill(148, 9, world.ground, 105);

    for (let i = 0; i < 15; i++) {
      const x = 8 + seeded(i, 94) * 374;
      const y = 148 + seeded(i, 95) * 23;
      if (world.id === "meadow" || world.id === "orchard" || world.id === "bloom") {
        drawMiniFlower(x, y, 4 + seeded(i, 96) * 2, world.id === "bloom" && i % 2 ? "#e16e5b" : "#efd184");
      } else if (world.id === "moon") {
        drawMiniStar(x, y, 4 + seeded(i, 96) * 3);
      } else if (world.id === "coast") {
        context.strokeStyle = "#fff1d2";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x - 4, y);
        context.quadraticCurveTo(x, y - 3, x + 4, y);
        context.stroke();
      } else {
        context.strokeStyle = "#fff1d2";
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(x, y + 4);
        context.lineTo(x, y - 4);
        context.moveTo(x, y);
        context.lineTo(x - 3, y - 2);
        context.moveTo(x, y - 1);
        context.lineTo(x + 3, y - 3);
        context.stroke();
      }
    }

    const bird = currentBird();
    context.save();
    context.translate(112, 93);
    context.rotate(-.08);
    context.fillStyle = bird.body;
    context.strokeStyle = "#664a3c";
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-17, 2);
    context.bezierCurveTo(-17, -8, -10, -13, -2, -13);
    context.bezierCurveTo(8, -14, 16, -8, 17, 0);
    context.bezierCurveTo(14, 8, 7, 12, -2, 12);
    context.bezierCurveTo(-11, 12, -17, 8, -17, 2);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = bird.wing;
    context.beginPath();
    context.ellipse(-3, -1, 8, 4.5, -.25, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = "#fff7e3";
    context.beginPath();
    context.arc(8, -5, 4, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = "#30403b";
    context.beginPath();
    context.arc(9, -5, 1.6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d78256";
    context.beginPath();
    context.moveTo(16, 1);
    context.lineTo(25, 4);
    context.lineTo(16, 7);
    context.closePath();
    context.fill();
    context.restore();

    context.save();
    context.globalAlpha = .63;
    context.fillStyle = world.pipe;
    context.beginPath(); context.roundRect(257, -4, 36, 55, [0, 0, 3, 3]); context.fill();
    context.beginPath(); context.roundRect(251, 44, 48, 14, 3); context.fill();
    context.beginPath(); context.roundRect(257, 120, 36, 64, [3, 3, 0, 0]); context.fill();
    context.beginPath(); context.roundRect(251, 115, 48, 14, 3); context.fill();
    context.restore();
  }

  function renderWorldGrid() {
    const grid = document.querySelector("#world-grid");
    grid.innerHTML = "";
    WORLDS.forEach((world, index) => {
      const article = document.createElement("article");
      article.className = `world-card${world.id === worldId ? " selected" : ""}`;
      article.innerHTML = `<div class="world-illustration"><canvas aria-hidden="true"></canvas></div><div class="world-card-content"><div class="world-card-topline"><h2 class="world-card-title"></h2><span class="world-card-index">${String(index + 1).padStart(2, "0")} / 06</span></div><p class="world-card-description"></p><div class="world-card-footer"><span class="world-mood"><span></span></span><button class="world-select-button"></button></div></div>`;
      article.querySelector("h2").textContent = world.name;
      article.querySelector(".world-card-description").textContent = world.description;
      article.querySelector(".world-mood").lastChild.textContent = world.mood;
      article.querySelector(".world-mood span").textContent = world.icon;
      const button = article.querySelector(".world-select-button");
      button.textContent = world.id === worldId ? "Flying here ✓" : "Fly here ↗";
      button.setAttribute("aria-label", `${world.id === worldId ? "Currently flying in" : "Fly in"} ${world.name}`);
      button.addEventListener("click", () => setWorld(world.id));
      grid.appendChild(article);
      paintThumbnail(article.querySelector("canvas"), world);
    });
  }

  function renderBirdGrid() {
    const grid = document.querySelector("#bird-grid");
    grid.innerHTML = "";
    BIRDS.forEach((bird) => {
      const selected = save.bird === bird.id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `bird-card${selected ? " selected" : ""}`;
      button.setAttribute("aria-pressed", String(selected));
      button.style.setProperty("--bird-color", bird.color);
      button.style.setProperty("--bird-bg", bird.bg);
      button.innerHTML = `<span class="bird-doodle"></span><strong></strong><small></small><span class="bird-equipped">${selected ? "FLYING WITH YOU" : "CHOOSE THIS BIRD"}</span>`;
      button.querySelector(".bird-doodle").textContent = bird.icon;
      button.querySelector("strong").textContent = bird.name;
      button.querySelector("small").textContent = bird.note;
      button.addEventListener("click", () => {
        save.bird = bird.id;
        persist();
        renderBirdGrid();
        document.querySelector("#bird-preview").textContent = bird.icon;
        document.querySelector("#bird-preview").style.color = bird.color;
        document.querySelector("#bird-preview").style.background = bird.bg;
        drawScene();
      });
      grid.appendChild(button);
    });
    const bird = currentBird();
    document.querySelector("#bird-preview").textContent = bird.icon;
    document.querySelector("#bird-preview").style.color = bird.color;
    document.querySelector("#bird-preview").style.background = bird.bg;
  }

  function updateJournal() {
    document.querySelector("#stat-flights").textContent = String(save.flights);
    document.querySelector("#stat-best").innerHTML = `${save.best} <small>gates</small>`;
    document.querySelector("#stat-gates").textContent = String(save.gates);
    document.querySelector("#journal-world-count").textContent = String(save.visited.length).padStart(2, "0");
    document.querySelector("#visited-count").textContent = `${save.visited.length} / 6`;
    const list = document.querySelector("#visited-list");
    list.innerHTML = "";
    if (!save.visited.length) {
      const empty = document.createElement("p");
      empty.className = "visited-empty";
      empty.textContent = "Your first postcard is waiting. Pick a world and take flight.";
      list.appendChild(empty);
      return;
    }
    WORLDS.filter((world) => save.visited.includes(world.id)).forEach((world) => {
      const row = document.createElement("div");
      row.className = "visited-row";
      row.style.setProperty("--world-pale", world.pale);
      row.innerHTML = `<span class="visited-icon"></span><span class="visited-text"><strong></strong><small>Visited in a little flight</small></span>`;
      row.querySelector(".visited-icon").textContent = world.icon;
      row.querySelector(".visited-text strong").textContent = world.name;
      list.appendChild(row);
    });
  }

  document.querySelectorAll(".nav-tab").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  document.querySelectorAll("[data-tab-link]").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    switchTab(button.dataset.tabLink);
  }));
  document.querySelector("#start-button").addEventListener("click", startFlight);
  document.querySelector("#next-world-button").addEventListener("click", () => {
    const next = WORLDS[(WORLDS.findIndex((item) => item.id === worldId) + 1) % WORLDS.length];
    setWorld(next.id);
  });
  document.querySelector("#pause-button").addEventListener("click", pauseFlight);
  document.querySelector("#sound-toggle").addEventListener("click", (event) => {
    save.sound = !save.sound;
    persist();
    event.currentTarget.setAttribute("aria-checked", String(save.sound));
    event.currentTarget.setAttribute("aria-label", save.sound ? "Turn sound off" : "Turn sound on");
  });
  document.querySelector("#sound-toggle").setAttribute("role", "switch");
  document.querySelector("#sound-toggle").setAttribute("aria-checked", String(save.sound));
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (pointerDown) return;
    pointerDown = true;
    flap();
  });
  window.addEventListener("pointerup", () => { pointerDown = false; });
  window.addEventListener("keydown", (event) => {
    if (tab === "flight" && (event.code === "Space" || event.code === "ArrowUp")) {
      event.preventDefault();
      if (!event.repeat) flap();
    }
    if (tab === "flight" && (event.code === "Escape" || event.code === "KeyP")) pauseFlight();
  });
  window.addEventListener("resize", () => {
    resizeCanvas();
    if (tab === "worlds") renderWorldGrid();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && mode === "playing") pauseFlight();
  });

  updateWorldUI();
  updateFlightUI();
  updateJournal();
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  if (["flight", "worlds", "birds", "journal"].includes(requestedTab) && requestedTab !== "flight") switchTab(requestedTab);
  resizeCanvas();
  requestAnimationFrame(tick);
})();
