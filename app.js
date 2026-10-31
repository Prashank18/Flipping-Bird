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
    { id: "poppy", name: "Poppy", note: "The little daydreamer", icon: "✿", color: "#d27c50", bg: "#f2e4d1", body: "#f0c94d", wing: "#df9f35", accent: "#fff0a1" },
    { id: "blue", name: "Bluebell", note: "The happy wanderer", icon: "✦", color: "#5f91ac", bg: "#dce9e8", body: "#52c5dc", wing: "#2587b8", accent: "#b8f0ed" },
    { id: "clover", name: "Clover", note: "The sunny-side-up", icon: "✿", color: "#768d53", bg: "#e5e9d8", body: "#91d147", wing: "#589d3e", accent: "#d9f381" },
    { id: "plum", name: "Plum", note: "The little night owl", icon: "✦", color: "#8b719d", bg: "#e9e1ed", body: "#cc83c1", wing: "#955ba0", accent: "#f3c3e4" },
  ];
  const DIFFICULTIES = [
    { id: "easy", label: "EASY", gravity: .29, lift: -5.8, speed: 2.2, gap: 190, minimumGap: 160 },
    { id: "normal", label: "NORMAL", gravity: .34, lift: -6.25, speed: 2.7, gap: 170, minimumGap: 142 },
    { id: "hard", label: "HARD", gravity: .38, lift: -6.55, speed: 3.15, gap: 151, minimumGap: 126 },
  ];
  const STORAGE_KEY = "littlewing-save-v1";
  const freshSave = () => ({ world: "meadow", bird: "poppy", difficulty: "easy", best: 0, flights: 0, gates: 0, visited: [], sound: true });
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
        difficulty: DIFFICULTIES.some((item) => item.id === raw.difficulty) ? raw.difficulty : defaults.difficulty,
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
  function currentDifficulty() { return DIFFICULTIES.find((item) => item.id === save.difficulty) || DIFFICULTIES[0]; }
  function pixelBirdSvg(bird) {
    const pixels = [
      ".....HH......",
      "....BBBB.....",
      "...BBBBBB....",
      "..BBBBBBBB...",
      ".BBBBBBBBBB..",
      "BBBBBBBBBBE..",
      "BBBBWBBBEEPOO",
      ".BBBWWBBBEEPO",
      "..BBWWBBBB...",
      "...BBBB......",
      "...TT..TT.....",
    ];
    const colors = {
      B: bird.body,
      W: bird.wing,
      H: bird.accent,
      E: "#fff9dc",
      P: "#171b20",
      O: "#f0783e",
      T: "#554632",
    };
    const cells = [];
    pixels.forEach((row, y) => {
      [...row].forEach((pixel, x) => {
        if (colors[pixel]) cells.push(`<rect x="${x * 4}" y="${y * 4}" width="4" height="4" fill="${colors[pixel]}"/>`);
      });
    });
    return `<svg viewBox="0 0 56 48" role="img" aria-label="${bird.name}, pixel bird" shape-rendering="crispEdges">${cells.join("")}</svg>`;
  }

  function selectBird(id) {
    if (!BIRDS.some((bird) => bird.id === id)) return;
    save.bird = id;
    persist();
    updateBirdPicker();
    if (tab === "birds") renderBirdGrid();
    drawScene();
  }

  function updateBirdPicker() {
    const bird = currentBird();
    document.querySelector("#home-bird-preview").innerHTML = pixelBirdSvg(bird);
    document.querySelector("#home-bird-name").textContent = bird.name;
    document.querySelector("#home-bird-note").textContent = bird.note.toUpperCase();
    document.querySelector("#bird-dots").innerHTML = BIRDS.map((item) =>
      `<button class="bird-dot${item.id === bird.id ? " active" : ""}" type="button" data-bird-id="${item.id}" aria-label="Choose ${item.name}" aria-pressed="${item.id === bird.id}"></button>`
    ).join("");
    const preview = document.querySelector("#bird-preview");
    preview.innerHTML = pixelBirdSvg(bird);
    preview.style.background = bird.bg;
  }

  function setDifficulty(id) {
    if (!DIFFICULTIES.some((item) => item.id === id)) return;
    save.difficulty = id;
    persist();
    document.querySelector("#difficulty-label").textContent = currentDifficulty().label;
    resetFlight();
  }

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
    ctx.imageSmoothingEnabled = false;
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
    const band = Math.ceil(height / 12);
    for (let row = 0; row < 12; row++) {
      ctx.fillStyle = row < 6 ? world.sky[0] : world.sky[1];
      ctx.fillRect(0, row * band, width, band);
    }

    if (world.id === "moon") {
      ctx.fillStyle = "#f4e6bf";
      ctx.fillRect(294, 66, 32, 32);
      ctx.fillStyle = world.sky[0];
      ctx.fillRect(306, 58, 28, 28);
      for (let i = 0; i < 34; i++) {
        const x = Math.floor(seeded(i, 41) * width / 6) * 6;
        const y = Math.floor(seeded(i, 17) * height * .52 / 6) * 6;
        const size = i % 4 === 0 ? 6 : 3;
        ctx.fillStyle = Math.sin(time * .002 + i) > .2 ? "#fff2c0" : "#c8d5e1";
        ctx.fillRect(x, y, size, size);
      }
    } else {
      ctx.fillStyle = "#ffe66c";
      ctx.fillRect(304, 72, 30, 30);
      ctx.fillRect(298, 78, 42, 18);
      for (let i = 0; i < 4; i++) {
        const span = width + 120;
        const x = Math.floor((((seeded(i, 9) * span + time * .012 * (i % 2 ? .7 : .4)) % span) - 60) / 6) * 6;
        const y = Math.floor((108 + seeded(i, 6) * 116) / 6) * 6;
        ctx.fillStyle = "#ffffffa8";
        ctx.fillRect(x + 12, y - 6, 36, 12);
        ctx.fillRect(x + 6, y, 48, 12);
        ctx.fillRect(x, y + 6, 60, 6);
      }
    }

    const horizon = Math.floor(height * .66);
    for (let x = 0, index = 0; x < width; x += 30, index++) {
      const buildingHeight = 30 + Math.floor(seeded(index, 26) * 9) * 6;
      const y = horizon - buildingHeight;
      ctx.fillStyle = world.far;
      ctx.fillRect(x, y, 24, buildingHeight);
      ctx.fillStyle = world.near;
      ctx.fillRect(x + 18, y + 10, 6, buildingHeight - 10);
      ctx.fillStyle = world.pale;
      for (let wy = y + 9; wy < horizon - 7; wy += 18) {
        ctx.fillRect(x + 6, wy, 5, 6);
        ctx.fillRect(x + 16, wy, 5, 6);
      }
    }

    for (let x = 0; x < width; x += 10) {
      const ridge = horizon - 14 - Math.floor((Math.sin((x + time * .025) / 29) + 1) * 2) * 6;
      ctx.fillStyle = world.near;
      ctx.fillRect(x, ridge, 10, height - ridge);
    }
    if (world.id === "canyon") {
      for (let x = 8; x < width; x += 73) {
        const y = horizon - 64 - Math.floor(seeded(x, 33) * 5) * 8;
        ctx.fillStyle = world.far;
        ctx.fillRect(x, y, 42, 64);
        ctx.fillRect(x + 8, y - 18, 26, 18);
        ctx.fillStyle = world.sky[1];
        ctx.fillRect(x + 20, y + 18, 6, 26);
      }
    } else if (world.id === "coast") {
      for (let row = 0; row < 5; row++) {
        ctx.fillStyle = row % 2 ? "#e7f4dc" : "#a6dcd3";
        ctx.fillRect(0, horizon + row * 13, width, 7);
      }
    }

    const groundY = height - 20;
    ctx.fillStyle = world.ground;
    ctx.fillRect(0, groundY, width, 20);
    ctx.fillStyle = world.pale;
    ctx.fillRect(0, groundY, width, 5);
    ctx.fillStyle = world.near;
    for (let x = 0; x < width; x += 18) {
      const tuft = 4 + Math.floor(seeded(x, 6) * 3) * 2;
      ctx.fillRect(x, groundY - tuft, 4, tuft);
      ctx.fillRect(x + 5, groundY - tuft - 3, 3, tuft + 3);
    }
    ctx.fillStyle = "#d3a56f";
    ctx.fillRect(0, height - 8, width, 8);
    ctx.fillStyle = "#f5d099";
    for (let x = 0; x < width; x += 16) ctx.fillRect(x, height - 5, 8, 3);

    for (let i = 0; i < 13; i++) {
      const x = Math.floor(seeded(i, 72) * width / 6) * 6;
      const y = groundY - 12 - Math.floor(seeded(i, 73) * 3) * 6;
      if (world.id === "moon") {
        ctx.fillStyle = "#fff0bb";
        ctx.fillRect(x, y, 4, 4);
      } else if (world.id === "coast") {
        ctx.fillStyle = "#fff5d9";
        ctx.fillRect(x, y, 12, 3);
        ctx.fillRect(x + 6, y - 3, 3, 3);
      } else {
        ctx.fillStyle = i % 2 ? "#f07372" : "#ffe36d";
        ctx.fillRect(x, y, 4, 4);
        ctx.fillRect(x - 3, y + 4, 4, 4);
        ctx.fillRect(x + 3, y + 4, 4, 4);
      }
    }
  }

  function drawGateColumn(x, y, width, height, world) {
    if (height <= 0) return;
    const left = Math.floor(x / 6) * 6;
    const top = Math.max(-4, Math.floor(y / 6) * 6);
    const right = Math.ceil((x + width) / 6) * 6;
    const bottom = Math.min(580, Math.ceil((y + height) / 6) * 6);
    ctx.fillStyle = "#17242b";
    ctx.fillRect(left - 4, top, right - left + 8, bottom - top);
    ctx.fillStyle = world.pipe;
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.fillStyle = world.pale;
    ctx.fillRect(left + 6, top, 6, bottom - top);
    ctx.fillStyle = world.near;
    for (let stripe = top + 12; stripe < bottom; stripe += 30) ctx.fillRect(left + 18, stripe, 12, 6);
  }

  function drawGateCap(x, y, width, height, world) {
    const left = Math.floor(x / 6) * 6;
    const top = Math.floor(y / 6) * 6;
    const capWidth = Math.ceil(width / 6) * 6;
    const capHeight = Math.ceil(height / 6) * 6;
    ctx.fillStyle = "#17242b";
    ctx.fillRect(left, top, capWidth, capHeight);
    ctx.fillStyle = world.pipe;
    ctx.fillRect(left + 4, top + 4, capWidth - 8, capHeight - 8);
    ctx.fillStyle = world.pale;
    ctx.fillRect(left + 8, top + 4, 8, capHeight - 8);
    ctx.fillStyle = world.near;
    ctx.fillRect(left + capWidth - 15, top + 4, 7, capHeight - 8);
  }

  function drawObstacle(obstacle, world) {
    const bottom = 580;
    const topHeight = Math.max(0, obstacle.gapY - obstacle.gap / 2);
    const bottomY = obstacle.gapY + obstacle.gap / 2;
    drawGateColumn(obstacle.x, -8, 48, topHeight + 8, world);
    drawGateCap(obstacle.x - 6, topHeight - 12, 60, 20, world);
    drawGateColumn(obstacle.x, bottomY, 48, bottom - bottomY, world);
    drawGateCap(obstacle.x - 6, bottomY - 8, 60, 20, world);
  }

  function drawBird(x, y, time, tilt = 0) {
    const bird = currentBird();
    const wingLift = Math.floor(time / 145) % 2 ? 1 : 0;
    const pixels = [
      ".....HH......",
      "....BBBB.....",
      "...BBBBBB....",
      "..BBBBBBBB...",
      ".BBBBBBBBBB..",
      "BBBBBBBBBBE..",
      "BBBBWBBBEEPOO",
      ".BBBWWBBBEEPO",
      "..BBWWBBBB...",
      "...BBBB......",
      "...TT..TT.....",
    ];
    const colors = {
      B: bird.body,
      W: bird.wing,
      H: bird.accent,
      E: "#fff9dc",
      P: "#171b20",
      O: "#f0783e",
      T: "#554632",
    };
    const cell = 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    pixels.forEach((row, rowIndex) => {
      [...row].forEach((pixel, columnIndex) => {
        if (!colors[pixel]) return;
        const offsetY = pixel === "W" ? wingLift * cell : 0;
        ctx.fillStyle = colors[pixel];
        ctx.fillRect((columnIndex - 6) * cell, (rowIndex - 5) * cell + offsetY, cell, cell);
      });
    });
    ctx.restore();
  }

  function drawScoreOnCanvas() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "18px 'Press Start 2P', monospace";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#173b47";
    ctx.strokeText(String(score).padStart(2, "0"), 195, 66);
    ctx.fillStyle = "#fff3c3";
    ctx.fillText(String(score).padStart(2, "0"), 195, 66);
    ctx.restore();
  }

  function drawReadySign() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#173b47";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText("READY?", 195, 148);
    ctx.fillStyle = "#21424a";
    ctx.font = "16px 'Silkscreen', monospace";
    ctx.fillText("tap to flap!", 195, 172);
    ctx.restore();
  }

  function drawScene() {
    if (!ctx || !canvas.width || !canvas.height) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
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
      ctx.fillStyle = "#fff1c9";
      ctx.fillRect(45, 207, 300, 144);
      ctx.fillStyle = "#171b20";
      ctx.fillRect(45, 207, 300, 6);
      ctx.fillRect(45, 345, 300, 6);
      ctx.fillRect(45, 207, 6, 144);
      ctx.fillRect(339, 207, 6, 144);
      ctx.textAlign = "center";
      ctx.fillStyle = "#171b20";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillText("NICE TRY!", 195, 248);
      ctx.fillStyle = "#334d4e";
      ctx.font = "15px 'Silkscreen', monospace";
      ctx.fillText(`${score} GATE${score === 1 ? "" : "S"} CLEARED`, 195, 279);
      ctx.fillStyle = "#ca5c50";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillText("TAP TO FLY AGAIN", 195, 319);
    }
    ctx.restore();
  }

  function resetFlight(nextMode = "ready") {
    score = 0;
    birdY = 290;
    birdVelocity = 0;
    obstacles = [];
    if (nextMode === "playing") {
      obstacles = [{ x: 315, gapY: 287, gap: currentDifficulty().gap, scored: false }];
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
      updateFlightUI();
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
    birdVelocity = currentDifficulty().lift;
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
    updateFlightUI();
    drawScene();
  }

  function endFlight() {
    if (mode !== "playing") return;
    mode = "over";
    document.querySelector("#run-label").textContent = "A LOVELY LITTLE TRY";
    document.querySelector("#run-indicator").classList.remove("running", "paused");
    document.querySelector("#pause-chip").hidden = true;
    document.querySelector("#canvas-hint").classList.remove("is-hidden");
    document.querySelector("#start-button span:first-child").textContent = "TRY AGAIN";
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
    const startButton = document.querySelector("#start-button");
    startButton.disabled = mode === "playing";
    if (mode === "ready") {
      document.querySelector("#canvas-hint").classList.remove("is-hidden");
      startButton.querySelector("span:first-child").textContent = "START GAME";
    } else if (mode === "playing") startButton.querySelector("span:first-child").textContent = "IN FLIGHT";
    else if (mode === "paused") startButton.querySelector("span:first-child").textContent = "CONTINUE";
    else if (mode === "over") startButton.querySelector("span:first-child").textContent = "TRY AGAIN";
  }

  function tick(time) {
    frameRequest = requestAnimationFrame(tick);
    if (!lastFrame) lastFrame = time;
    const delta = Math.min((time - lastFrame) / 16.667, 2);
    lastFrame = time;
    if (document.hidden || tab !== "flight") return;
    sceneTime += Math.min(delta, 2) * 16.667;
    if (mode === "playing") {
      const difficulty = currentDifficulty();
      const speed = (difficulty.speed + Math.min(score * .045, 1.45)) * delta;
      birdVelocity += difficulty.gravity * delta;
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
        const gap = Math.max(difficulty.minimumGap, difficulty.gap - Math.floor(score / 6) * 3);
        const margin = gap / 2 + 36;
        obstacles.push({ x: 425, gapY: margin + Math.random() * (560 - margin * 2), gap, scored: false });
      }
      if (birdY - 10 < 0 || birdY + 11 > 580) {
        endFlight();
      } else {
        for (const obstacle of obstacles) {
          const inX = 105 + 18 > obstacle.x && 105 - 18 < obstacle.x + 48;
          const outsideGap = birdY - 12 < obstacle.gapY - obstacle.gap / 2 || birdY + 12 > obstacle.gapY + obstacle.gap / 2;
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
    const index = WORLDS.findIndex((item) => item.id === worldId);
    document.querySelector("#next-world-name").textContent = world.name;
    document.querySelector("#next-world-caption").textContent = `${world.mood} SKY · TAP TO CYCLE`;
    document.querySelector("#next-world-art").textContent = world.icon;
    document.querySelector(".world-spotlight .world-card-index").textContent = `${String(index + 1).padStart(2, "0")} / 06`;
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
    context.imageSmoothingEnabled = false;
    context.setTransform(width / 390, 0, 0, height / 180, 0, 0);
    for (let row = 0; row < 9; row++) {
      context.fillStyle = row < 5 ? world.sky[0] : world.sky[1];
      context.fillRect(0, row * 20, 390, 20);
    }
    context.fillStyle = world.id === "moon" ? "#f1e4bd" : "#ffe66c";
    context.fillRect(304, 20, 24, 24);
    if (world.id === "moon") {
      context.fillStyle = world.sky[0];
      context.fillRect(313, 15, 22, 22);
    }
    for (let x = 0, index = 0; x < 390; x += 28, index++) {
      const buildingHeight = 18 + Math.floor(seeded(index, 91) * 5) * 7;
      const y = 116 - buildingHeight;
      context.fillStyle = world.far;
      context.fillRect(x, y, 23, buildingHeight);
      context.fillStyle = world.pale;
      for (let wy = y + 5; wy < 110; wy += 12) context.fillRect(x + 5, wy, 4, 4);
    }
    context.fillStyle = world.near;
    context.fillRect(0, 112, 390, 32);
    for (let x = 0; x < 390; x += 12) {
      const hillY = 94 + Math.floor((Math.sin(x / 30) + 1) * 5) * 3;
      context.fillRect(x, hillY, 12, 144 - hillY);
    }
    context.fillStyle = world.ground;
    context.fillRect(0, 148, 390, 32);
    context.fillStyle = world.pale;
    context.fillRect(0, 148, 390, 4);

    const bird = currentBird();
    const birdPixels = [
      ".....HH......", "....BBBB.....", "...BBBBBB....", "..BBBBBBBB...",
      ".BBBBBBBBBB..", "BBBBBBBBBBE..", "BBBBWBBBEEPOO",
      ".BBBWWBBBEEPO", "..BBWWBBBB...", "...BBBB......", "...TT..TT.....",
    ];
    const birdColors = { B: bird.body, W: bird.wing, H: bird.accent, E: "#fff9dc", P: "#171b20", O: "#f0783e", T: "#554632" };
    birdPixels.forEach((row, y) => [...row].forEach((pixel, x) => {
      if (birdColors[pixel]) {
        context.fillStyle = birdColors[pixel];
        context.fillRect(85 + x * 2, 71 + y * 2, 2, 2);
      }
    }));
    context.fillStyle = "#17242b";
    context.fillRect(266, 0, 6, 46);
    context.fillRect(260, 39, 18, 8);
    context.fillRect(266, 128, 6, 52);
    context.fillRect(260, 124, 18, 8);
    context.fillStyle = world.pipe;
    context.fillRect(270, 0, 30, 42);
    context.fillRect(264, 42, 42, 8);
    context.fillRect(270, 132, 30, 48);
    context.fillRect(264, 128, 42, 8);
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
      button.querySelector(".bird-doodle").innerHTML = pixelBirdSvg(bird);
      button.querySelector("strong").textContent = bird.name;
      button.querySelector("small").textContent = bird.note;
      button.setAttribute("aria-label", `Choose ${bird.name}. ${bird.note}.`);
      button.addEventListener("click", () => selectBird(bird.id));
      grid.appendChild(button);
    });
    updateBirdPicker();
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
  document.querySelector("#bird-prev").addEventListener("click", () => {
    const index = BIRDS.findIndex((bird) => bird.id === save.bird);
    selectBird(BIRDS[(index - 1 + BIRDS.length) % BIRDS.length].id);
  });
  document.querySelector("#bird-next").addEventListener("click", () => {
    const index = BIRDS.findIndex((bird) => bird.id === save.bird);
    selectBird(BIRDS[(index + 1) % BIRDS.length].id);
  });
  document.querySelector("#bird-dots").addEventListener("click", (event) => {
    const button = event.target.closest("[data-bird-id]");
    if (button) selectBird(button.dataset.birdId);
  });
  document.querySelector("#difficulty-button").addEventListener("click", () => {
    const index = DIFFICULTIES.findIndex((item) => item.id === save.difficulty);
    setDifficulty(DIFFICULTIES[(index + 1) % DIFFICULTIES.length].id);
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
  updateBirdPicker();
  document.querySelector("#difficulty-label").textContent = currentDifficulty().label;
  updateFlightUI();
  updateJournal();
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  if (["flight", "worlds", "birds", "journal"].includes(requestedTab) && requestedTab !== "flight") switchTab(requestedTab);
  resizeCanvas();
  requestAnimationFrame(tick);
})();
