// ===== Объёмный разбор камеры по слоям =====
// Модуль камеры собран здесь из деталей: защитное стекло, линзы в оправе с резьбой, привод автофокуса
// с катушкой и магнитами, светофильтр и сенсор на плате со шлейфом. Пока страницу листают, он
// поворачивается боком и разъезжается на слои. Положение прокрутки (0..1) приходит из page.js
// через window.TEARDOWN. Кадр рисуется только когда что-то изменилось: в покое картинка неподвижна.
import * as THREE from "./vendor/three-0.160.0/three.module.min.js";
import { attachSpin } from "./spin.js?v=1";

const state = window.TEARDOWN;
const root = document.documentElement;
const canvas = document.getElementById("teardownCanvas");
const stage = canvas.parentElement;
const labelsBox = document.getElementById("partLabels");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
} catch {
  root.classList.add("no-3d");
  throw new Error("WebGL недоступен: объёмный разбор скрыт");
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060c); // тот же цвет, что у страницы

// ----- Студия: тёмная комната с несколькими яркими панелями. Их отражения и делают металл металлом -----
function studio() {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x010204);
  const panel = (width, height, color, power, x, y, z) => {
    const item = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide, toneMapped: false })
    );
    item.position.set(x, y, z);
    item.lookAt(0, 0, 0);
    room.add(item);
  };
  panel(18, 9, 0xffffff, 10, 2, 16, 8); // большой софтбокс сверху
  panel(5, 20, 0x8fb0ff, 9, -18, 2, 4); // холодная полоса слева
  panel(5, 20, 0xffdcb0, 6, 18, -1, 3); // тёплая полоса справа
  panel(12, 4, 0xffffff, 3, 0, -14, 9); // слабая подсветка снизу
  panel(8, 8, 0xffffff, 5, 0, 4, 22); // заполняющий свет спереди
  panel(40, 40, 0x10182e, 1, 0, 0, -24); // тёмно-синяя стена за спиной
  return new THREE.PMREMGenerator(renderer).fromScene(room, 0.02).texture;
}
scene.environment = studio();

const camera = new THREE.PerspectiveCamera(26, 1, 1, 600);
const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -26;
keyLight.shadow.camera.right = keyLight.shadow.camera.top = 26;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 140;
keyLight.shadow.bias = -0.002;
keyLight.shadow.normalBias = 0.05;
keyLight.shadow.radius = 5;
const blueLight = new THREE.DirectionalLight(0x4c7dff, 2.4); // синий отсвет сбоку
const warmLight = new THREE.DirectionalLight(0xffd9a8, 1); // тёплый — с другой стороны
scene.add(keyLight, keyLight.target, blueLight, blueLight.target, warmLight, warmLight.target);

// ----- Рисунки на холсте: из них получаются плата, шлейф, шлифовка металла и гравировка -----
function texture(width, height, draw, isColor = true) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  draw(element.getContext("2d"), width, height);
  const result = new THREE.CanvasTexture(element);
  if (isColor) result.colorSpace = THREE.SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}
// картинка, растянутая на пластину шириной w и высотой h с центром в нуле
function fit(map, w, h) {
  map.repeat.set(1 / w, 1 / h);
  map.offset.set(0.5, 0.5);
  return map;
}
const random = (() => {
  let seed = 7; // свой генератор: рисунок платы одинаковый при каждой загрузке
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
})();

// шлифовка стали: тонкие горизонтальные штрихи
const brushed = texture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = "#7c7c7c";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    ctx.strokeStyle = random() > 0.5 ? `rgba(255,255,255,${0.05 + random() * 0.16})` : `rgba(0,0,0,${0.05 + random() * 0.16})`;
    ctx.lineWidth = 0.6 + random();
    const y = random() * h;
    const x = random() * w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 30 + random() * 120, y);
    ctx.stroke();
  }
}, false);
brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
brushed.repeat.set(0.16, 0.16);

// плата: зелёная маска, дорожки, золотые площадки и белая маркировка
const boardMap = texture(768, 704, (ctx, w, h) => {
  ctx.fillStyle = "#0c3527";
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = i % 3 ? "#13533b" : "#0f4532";
    ctx.lineWidth = 3 + (i % 3);
    let x = random() * w;
    let y = random() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let step = 0; step < 4; step++) {
      const length = 30 + random() * 120;
      const turn = Math.floor(random() * 8) * (Math.PI / 4);
      x += Math.cos(turn) * length;
      y += Math.sin(turn) * length;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 90; i++) {
    const x = random() * w;
    const y = random() * h;
    ctx.fillStyle = "#c9a44e";
    ctx.beginPath();
    ctx.arc(x, y, 3 + random() * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0a2a1f";
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(236,240,234,0.85)";
  ctx.font = "600 17px monospace";
  [["IMX906", 40, 44], ["50MP 1/1.56", 560, 44], ["C12", 60, 676], ["R4", 150, 676], ["U1", 660, 676], ["OP15-CAM-M", 300, 676], ["J1", 700, 360], ["TP3", 20, 360]].forEach(([word, x, y]) => ctx.fillText(word, x, y));
  ctx.strokeStyle = "rgba(236,240,234,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(96, 86, w - 192, h - 172);
});

// шлейф: янтарная плёнка с медными дорожками
const flexMap = texture(256, 512, (ctx, w, h) => {
  ctx.fillStyle = "#7a4a14";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = i % 2 ? "#b87a2c" : "#a26a22";
    ctx.fillRect(14 + i * 11.6, 0, 6, h);
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 0, 8, h);
  ctx.fillRect(w - 8, 0, 8, h);
});

// кристалл сенсора: светочувствительное поле с мелкой сеткой и обвязкой по краям
const dieMap = texture(640, 480, (ctx, w, h) => {
  ctx.fillStyle = "#0a0c14";
  ctx.fillRect(0, 0, w, h);
  const field = ctx.createLinearGradient(0, 0, w, h);
  field.addColorStop(0, "#1a2a5c");
  field.addColorStop(0.5, "#3a1f5e");
  field.addColorStop(1, "#12404a");
  ctx.fillStyle = field;
  ctx.fillRect(46, 40, w - 92, h - 80);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  for (let x = 46; x < w - 46; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, h - 40);
    ctx.stroke();
  }
  for (let y = 40; y < h - 40; y += 6) {
    ctx.beginPath();
    ctx.moveTo(46, y);
    ctx.lineTo(w - 46, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#23283a";
  for (let i = 0; i < 46; i++) {
    ctx.fillRect(50 + i * 11.8, 12, 7, 16);
    ctx.fillRect(50 + i * 11.8, h - 28, 7, 16);
  }
});

// гравировка по кругу на оправе объектива, как на настоящих объективах
const ringText = texture(1024, 1024, (ctx, w) => {
  const words = "ONEPLUS 15  •  50MP  •  1:1.8 / 24  •  OIS  •  IMX906  •  ";
  ctx.fillStyle = "#e8ecf2";
  ctx.font = "600 44px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const radius = w * 0.4;
  [...words].forEach((letter, index) => {
    const angle = (index / words.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(w / 2 + Math.cos(angle) * radius, w / 2 + Math.sin(angle) * radius);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(letter, 0, 0);
    ctx.restore();
  });
});

// гравировка на кожухе привода
const canText = texture(512, 128, (ctx, w, h) => {
  ctx.fillStyle = "#2a2d34";
  ctx.font = "600 44px monospace";
  ctx.textBaseline = "middle";
  ctx.fillText("AF · OIS  A15-906", 12, h / 2);
});

// ----- Материалы -----
const steel = new THREE.MeshStandardMaterial({ color: 0xc4c9d2, metalness: 1, roughness: 0.42, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.35 });
const steelPolished = new THREE.MeshStandardMaterial({ color: 0xd9dde5, metalness: 1, roughness: 0.14 });
const black = new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, metalness: 0.85, roughness: 0.46, clearcoat: 0.25, clearcoatRoughness: 0.4 });
const blackGloss = new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: 0.3, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
const blackMatte = new THREE.MeshStandardMaterial({ color: 0x08090c, metalness: 0.3, roughness: 0.8 });
const copper = new THREE.MeshStandardMaterial({ color: 0xcf7c3c, metalness: 1, roughness: 0.36 });
const gold = new THREE.MeshStandardMaterial({ color: 0xe2bd66, metalness: 1, roughness: 0.26 });
const magnet = new THREE.MeshStandardMaterial({ color: 0x2f323a, metalness: 1, roughness: 0.55 });
const ceramic = new THREE.MeshStandardMaterial({ color: 0xb49d76, metalness: 0.1, roughness: 0.65 });
const boardMaterial = new THREE.MeshStandardMaterial({ map: fit(boardMap, 12, 11), metalness: 0.25, roughness: 0.5 });
const flexMaterial = new THREE.MeshStandardMaterial({ map: flexMap, metalness: 0.55, roughness: 0.4 });
const dieMaterial = new THREE.MeshPhysicalMaterial({ map: dieMap, metalness: 0.9, roughness: 0.14, iridescence: 1, iridescenceIOR: 2.1, iridescenceThicknessRange: [260, 760], envMapIntensity: 1.6 });
const filterGlass = new THREE.MeshPhysicalMaterial({ color: 0x4fc8ff, roughness: 0.05, transparent: true, opacity: 0.42, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [420, 900], envMapIntensity: 1.8, depthWrite: false });

// Само стекло прозрачное: на экран добавляются только его блики, поэтому стопка линз не выглядит молочной
function glass(tint, coating, shine = 1) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x030407,
    specularColor: tint,
    metalness: 0,
    roughness: 0.03,
    transparent: true,
    blending: THREE.AdditiveBlending,
    clearcoat: 0.3,
    clearcoatRoughness: 0.02,
    iridescence: 0.35,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: coating,
    envMapIntensity: 0.8 * shine,
    depthWrite: false,
  });
}

// ----- Заготовки фигур -----
function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  // прозрачное стекло тени не отбрасывает, всё остальное — отбрасывает и принимает
  item.castShadow = item.receiveShadow = !material.transparent;
  return item;
}

// Тело вращения по профилю [радиус, высота]; ось смотрит вдоль объектива
function turned(points, segments = 96) {
  const geometry = new THREE.LatheGeometry(points.map(([radius, height]) => new THREE.Vector2(radius, height)), segments);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

// Линза: front и back — насколько выпуклы стороны (отрицательное число — вогнутая)
function lens(radius, edge, front, back) {
  const points = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const r = (radius * i) / steps;
    points.push([r, edge / 2 + front * (1 - (r / radius) ** 2)]);
  }
  for (let i = steps; i >= 0; i--) {
    const r = (radius * i) / steps;
    points.push([r, -edge / 2 - back * (1 - (r / radius) ** 2)]);
  }
  return turned(points);
}

// Кольцо со снятыми фасками
function ring(inner, outer, depth, chamfer = 0.06) {
  const half = depth / 2;
  return turned([
    [inner, -half + chamfer], [inner + chamfer, -half], [outer - chamfer, -half], [outer, -half + chamfer],
    [outer, half - chamfer], [outer - chamfer, half], [inner + chamfer, half], [inner, half - chamfer], [inner, -half + chamfer],
  ]);
}

function roundedRect(path, w, h, r) {
  const x = w / 2;
  const y = h / 2;
  path.moveTo(-x + r, -y);
  path.lineTo(x - r, -y);
  path.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x, y - r);
  path.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  path.lineTo(-x + r, y);
  path.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(-x, -y + r);
  path.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

// Пластина со скруглёнными углами и фаской. hole — вырез: круг { r } или прямоугольник { w, h }
function plate(w, h, r, depth, hole = null, bevel = 0.1) {
  const shape = roundedRect(new THREE.Shape(), w - bevel * 2, h - bevel * 2, Math.max(r - bevel, 0.02));
  if (hole) {
    const cut = new THREE.Path();
    if (hole.r) cut.absarc(0, 0, hole.r, 0, Math.PI * 2, true);
    else roundedRect(cut, hole.w, hole.h, 0.3);
    shape.holes.push(cut);
  }
  const inner = Math.max(depth - bevel * 2, 0.01);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: inner, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 28 });
  geometry.translate(0, 0, -inner / 2);
  return geometry;
}
const block = (w, h, depth, bevel = 0.06) => plate(w, h, bevel * 2, depth, null, bevel);

// Много одинаковых мелких деталей одним куском: зубцы, контакты, перемычки
function many(geometry, material, places) {
  const group = new THREE.InstancedMesh(geometry, material, places.length);
  const helper = new THREE.Object3D();
  places.forEach(([x, y, z, turn = 0], index) => {
    helper.position.set(x, y, z);
    helper.rotation.set(0, 0, turn);
    helper.updateMatrix();
    group.setMatrixAt(index, helper.matrix);
  });
  group.castShadow = group.receiveShadow = true;
  return group;
}

// ----- Сборка -----
// tilt разворачивает разбор вертикально на узком экране, module крутится и двигается целиком,
// stack сдвигается, чтобы разобранная стопка оставалась по центру. Объектив смотрит на зрителя (+z).
const tilt = new THREE.Group();
const module = new THREE.Group();
const stack = new THREE.Group();
module.add(stack);
tilt.add(module);
scene.add(tilt);

// мягкое свечение за камерой: большой круг с растушёвкой далеко позади
const glow = new THREE.Mesh(
  new THREE.PlaneGeometry(150, 150),
  new THREE.MeshBasicMaterial({
    map: texture(256, 256, (ctx, w) => {
      const spot = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      spot.addColorStop(0, "rgba(76,125,255,0.34)");
      spot.addColorStop(0.45, "rgba(60,90,200,0.1)");
      spot.addColorStop(1, "rgba(4,6,12,0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, w, w);
    }),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
);
glow.position.z = -34;
scene.add(glow);

const parts = {};
// z0 — место детали в собранной камере, spread — на сколько она отъезжает при разборе
function part(name, z0, spread) {
  const group = new THREE.Group();
  group.userData = { z0, spread };
  group.position.z = z0;
  stack.add(group);
  parts[name] = group;
  return group;
}

// Защитное стекло: само стекло, чёрная кайма с обратной стороны и полированный стальной ободок
const cover = part("glass", 5.05, 12);
cover.add(mesh(turned([[0, -0.2], [5.28, -0.2], [5.28, 0.2], [0, 0.2]]), glass(0xdfeaff, [120, 420], 0.8)));
cover.add(mesh(ring(4.2, 5.28, 0.1, 0.02), blackGloss, 0, 0, -0.27));
cover.add(mesh(turned([[5.28, -0.36], [5.78, -0.36], [5.86, -0.26], [5.86, 0.18], [5.66, 0.38], [5.28, 0.38], [5.28, -0.36]]), steelPolished));

// Линзы: пять стёкол разной формы, каждое в своей блестящей чёрной прокладке
const lenses = part("lenses", 0.7, 6.4);
[
  [3.3, 0.5, 0.75, 0.2, 0xe8f0ff, [200, 520]],
  [3.6, 0.45, 0.25, -0.3, 0xf2e8ff, [320, 700]],
  [3.1, 0.4, -0.25, 0.55, 0xe6fff4, [180, 460]],
  [3.5, 0.45, 0.6, 0.6, 0xfff1dc, [380, 760]],
  [3.9, 0.5, 0.2, -0.35, 0xe8f0ff, [240, 560]],
].forEach(([radius, edge, front, back, tint, coating], index) => {
  const home = (2 - index) * 1.5;
  const gap = (2 - index) * 1.25; // при разборе линзы расходятся и между собой
  const item = mesh(lens(radius, edge, front, back), glass(tint, coating), 0, 0, home);
  const spacer = mesh(ring(radius - 0.12, 4.06, edge + 0.14, 0.08), blackGloss, 0, 0, home);
  item.userData = spacer.userData = { home, gap };
  lenses.add(item, spacer);
});

// Оправа объектива: чёрная трубка с резьбой, рифлёный поясок и гравировка по кругу
const barrel = part("barrel", 0.7, 1.4);
const thread = [[4.12, -3.6], [4.74, -3.6]];
for (let i = 0; i <= 64; i++) thread.push([4.67 + Math.sin(i * 1.57) * 0.075, -3.55 + i * 0.075]);
thread.push([5.02, 1.3], [5.02, 3.1], [4.84, 3.4], [4.12, 3.4], [4.12, -3.6]);
barrel.add(mesh(turned(thread, 128), black));
const teeth = [];
for (let i = 0; i < 60; i++) {
  const angle = (i / 60) * Math.PI * 2;
  teeth.push([Math.cos(angle) * 5.04, Math.sin(angle) * 5.04, 2.2, angle]);
}
barrel.add(many(block(0.16, 0.2, 1.5, 0.03), black, teeth));
barrel.add(mesh(ring(2.55, 4.84, 0.5, 0.1), black, 0, 0, 3.6));
const engraving = mesh(new THREE.RingGeometry(2.7, 4.75, 96), new THREE.MeshStandardMaterial({ map: ringText, transparent: true, metalness: 0.6, roughness: 0.4, depthWrite: false }), 0, 0, 3.86);
barrel.add(engraving);
// диафрагма в глубине оправы: из-за неё объектив спереди выглядит тёмным «зрачком»
barrel.add(mesh(ring(1.3, 4.14, 0.14, 0.03), blackMatte, 0, 0, -3.2));

// Привод автофокуса и стабилизации: шлифованный стальной кожух с окнами и гравировкой
const drive = part("drive", -0.4, -3.4);
drive.add(mesh(plate(12.4, 12.4, 1.4, 3.4, { r: 5.08 }, 0.16), steel));
[[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
  drive.add(mesh(block(1.5, 0.34, 0.2, 0.04), blackMatte, sx * 4.6, sy * 5.5, 1.66));
  drive.add(mesh(block(0.34, 1.5, 0.2, 0.04), blackMatte, sx * 5.5, sy * 4.6, 1.66));
});
drive.add(mesh(block(2.6, 0.5, 2.2, 0.08), steel, 0, 6.3, 0));
drive.add(mesh(block(2.6, 0.5, 2.2, 0.08), steel, 0, -6.3, 0));
drive.add(mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshStandardMaterial({ map: canText, transparent: true, metalness: 0.4, roughness: 0.6, depthWrite: false }), -3.4, -5.35, 1.72));

// Под кожухом: чёрная рамка, медная катушка с витками, четыре магнита, пружины и шарики подвеса
const coil = part("coil", -0.6, -6.6);
coil.add(mesh(plate(11.4, 11.4, 1.2, 1, { r: 5.02 }, 0.1), blackMatte, 0, 0, 0.9));
const winding = [[4.3, -0.85], [4.92, -0.85]];
for (let i = 0; i <= 28; i++) winding.push([4.9 + Math.sin(i * 1.6) * 0.045, -0.8 + i * 0.057]);
winding.push([4.92, 0.85], [4.3, 0.85], [4.3, -0.85]);
coil.add(mesh(turned(winding, 128), copper, 0, 0, -0.3));
[[5.55, 0, 0], [-5.55, 0, 0], [0, 5.55, 1], [0, -5.55, 1]].forEach(([x, y, sideways]) => {
  coil.add(mesh(sideways ? block(6.2, 0.95, 1.7, 0.12) : block(0.95, 6.2, 1.7, 0.12), magnet, x, y, -0.3));
});
coil.add(mesh(ring(4.34, 5, 0.07, 0.02), gold, 0, 0, 1.46));
coil.add(many(block(0.22, 2.4, 0.07, 0.02), gold, [[4.05, 4.05, 1.46, Math.PI / 4], [-4.05, 4.05, 1.46, -Math.PI / 4], [4.05, -4.05, 1.46, -Math.PI / 4], [-4.05, -4.05, 1.46, Math.PI / 4]]));
const corners = [[5.2, 5.2], [-5.2, 5.2], [5.2, -5.2], [-5.2, -5.2]];
coil.add(many(new THREE.SphereGeometry(0.34, 20, 14), steelPolished, corners.map(([x, y]) => [x * 0.86, y * 0.86, 1.5])));
const wire = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8);
wire.rotateX(Math.PI / 2);
coil.add(many(wire, gold, corners.map(([x, y]) => [x, y, -0.4])));

// Светофильтр: голубоватое стекло в ступенчатой чёрной рамке
const filter = part("filter", -2.5, -10.2);
filter.add(mesh(plate(10.8, 9.2, 0.8, 0.7, { w: 7.7, h: 6 }, 0.1), blackMatte));
filter.add(mesh(plate(9.2, 7.6, 0.5, 0.3, { w: 7.2, h: 5.5 }, 0.06), black, 0, 0, 0.42));
filter.add(mesh(new THREE.BoxGeometry(8.1, 6.4, 0.2), filterGlass));

// Сенсор на плате: кристалл, золотые перемычки к контактам, мелкие детали, стальная подложка, шлейф с разъёмом
const sensor = part("sensor", -3.5, -14.6);
sensor.add(mesh(plate(12, 11, 0.6, 0.5, null, 0.06), boardMaterial));
sensor.add(mesh(plate(12, 11, 0.6, 0.24, null, 0.06), steel, 0, 0, -0.38));
sensor.add(mesh(block(8.5, 6.5, 0.14, 0.04), gold, 0, 0, 0.3));
sensor.add(mesh(new THREE.BoxGeometry(7.9, 5.9, 0.3), dieMaterial, 0, 0, 0.44));
const pads = [];
const bonds = [];
for (let i = 0; i < 24; i++) {
  const x = -4.03 + i * 0.35;
  pads.push([x, 3.78, 0.28], [x, -3.78, 0.28]);
  bonds.push([x, 3.38, 0.42], [x, -3.38, 0.42]);
}
sensor.add(many(new THREE.BoxGeometry(0.2, 0.42, 0.08), gold, pads));
const bond = new THREE.TorusGeometry(0.42, 0.028, 5, 12, Math.PI);
bond.rotateX(Math.PI / 2);
bond.rotateZ(Math.PI / 2);
sensor.add(many(bond, gold, bonds));
const caps = [[-5.1, 4.6], [-4.2, 4.6], [-3.3, 4.6], [5.1, 4.6], [4.2, 4.6], [5.1, -4.6], [4.2, -4.6], [-5.1, -4.6]];
sensor.add(many(block(0.62, 0.36, 0.3, 0.04), ceramic, caps.map(([x, y]) => [x, y, 0.4])));
sensor.add(many(new THREE.BoxGeometry(0.14, 0.38, 0.32), steelPolished, caps.flatMap(([x, y]) => [[x - 0.26, y, 0.4], [x + 0.26, y, 0.4]])));
sensor.add(mesh(block(1.5, 1.5, 0.34, 0.06), black, 4.3, 0.4, 0.42));
sensor.add(mesh(new THREE.BoxGeometry(5.2, 7.4, 0.12), flexMaterial, 0, -9, -0.1));
sensor.add(mesh(block(5.6, 2.6, 0.2, 0.06), steel, 0, -12.2, -0.2));
sensor.add(mesh(block(4.9, 1.5, 0.5, 0.08), black, 0, -12.2, 0.14));
const pins = [];
for (let i = 0; i < 14; i++) pins.push([-2.08 + i * 0.32, -11.7, 0.36], [-2.08 + i * 0.32, -12.7, 0.36]);
sensor.add(many(new THREE.BoxGeometry(0.16, 0.34, 0.12), gold, pins));

const SPREAD_CENTER = (13 - 14.6) / 2;

// ----- Подписи к слоям -----
// [деталь, точка на детали (x, y), ряд: up — над стопкой, down — под ней]
const LABELS = [
  ["glass", 0, 5.86, "up"],
  ["lenses", 0, -4.06, "down"],
  ["drive", 0, 6.5, "up"],
  ["filter", 0, -4.6, "down"],
  ["sensor", 0, 5.5, "up"],
].map(([name, x, y, row], index) => {
  const [title, note] = state.parts[name];
  const element = document.createElement("div");
  element.className = `part-label${row === "down" ? " is-below" : ""}`;
  const text = document.createElement("div");
  text.className = "part-text";
  const head = document.createElement("b");
  head.textContent = title;
  const small = document.createElement("span");
  small.textContent = note;
  text.append(head, small);
  const line = document.createElement("i");
  const badge = document.createElement("em");
  badge.textContent = index + 1;
  element.append(text, line, badge);
  labelsBox.appendChild(element);
  return { part: parts[name], x, y, up: row === "up", element, line };
});

// ----- Ключевые положения: [доля прокрутки, поворот, наклон, размер, разбор] -----
const KEYS = [
  [0, 0.5, 0.2, 1.7, 0],
  [0.16, 0.26, 0.16, 1.7, 0],
  [0.4, -1.02, 0.14, 1.08, 0],
  [0.62, -1.06, 0.14, 1, 1],
  [1, -0.9, 0.12, 1, 1],
];
const pose = { ry: 0, rx: 0, s: 1, e: 0 };
function samplePose(p) {
  let index = 0;
  while (index < KEYS.length - 2 && p > KEYS[index + 1][0]) index += 1;
  const a = KEYS[index];
  const b = KEYS[index + 1];
  const t = ease((p - a[0]) / (b[0] - a[0]));
  pose.ry = a[1] + (b[1] - a[1]) * t;
  pose.rx = a[2] + (b[2] - a[2]) * t;
  pose.s = a[3] + (b[3] - a[3]) * t;
  pose.e = a[4] + (b[4] - a[4]) * t;
}

// ----- Размер, курсор и кадры -----
let width = 0;
let height = 0;
let dense = false; // узкий экран: разбор идёт сверху вниз, вместо выносок — номера
let sideShift = 0;
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
let dirty = true; // пора перерисовать кадр

function resize() {
  width = stage.clientWidth;
  height = stage.clientHeight;
  if (!width || !height) return;
  const aspect = width / height;
  dense = window.STACKED.matches; // раскладка «столбиком»: то же условие, что в стилях
  // На широком экране разбор лежит горизонтально, на узком — стоит вертикально. Слева стоит текст: разбор целиком
  // (в разобранном виде он длиной около 36 единиц сцены) помещается в свободную часть справа от него и стоит в её середине,
  // какой бы ширины ни было окно. Иначе на очень широком окне крайняя деталь наезжала на заголовок
  const copy = stage.querySelector(".teardown-copy").getBoundingClientRect();
  const free = Math.min(copy.right + 40, width * 0.6); // с этой точки по ширине начинается место под разбор
  const visibleHeight = dense ? 62 : Math.max(34, 60 / aspect, 39 / ((width - free - 110) / width) / aspect);
  sideShift = dense ? 0 : ((free + width - 110) / 2 / width - 0.5) * visibleHeight * aspect; // справа 110 точек оставлено боковой навигации
  tilt.rotation.z = dense ? -Math.PI / 2 : 0;
  tilt.position.set(sideShift, dense ? -6 : 0, 0); // на узком экране сверху стоит заголовок со списком слоёв
  glow.position.set(sideShift, dense ? -6 : 0, -34);

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  const distance = visibleHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
  camera.aspect = aspect;
  camera.position.set(0, 0, distance);
  // ближняя и дальняя границы вплотную к модели: так глубина считается точно и детали не «рябят»
  camera.near = Math.max(1, distance - 46);
  camera.far = distance + 60;
  camera.updateProjectionMatrix();

  // свет стоит относительно модели, где бы она ни была
  [[keyLight, 12, 20, 34], [blueLight, -26, 6, 4], [warmLight, 24, -10, 10]].forEach(([light, x, y, z]) => {
    light.target.position.copy(tilt.position);
    light.position.set(tilt.position.x + x, tilt.position.y + y, z);
  });
  labelsBox.classList.toggle("is-dense", dense);
  dirty = true;
}
new ResizeObserver(resize).observe(stage);
resize();

// разбор можно крутить мышью и пальцем: это добавка к позе, которую задаёт прокрутка (spin.js)
const spin = attachSpin(canvas, { wake: () => (dirty = true), tilt: 0.4, closest: 1.4 });
let spunAt = 0; // доля прокрутки, на которой разбор крутили рукой

let pointerX = 0;
let pointerY = 0;
let lookX = 0;
let lookY = 0;
if (canHover && !reducedMotion) {
  window.addEventListener(
    "pointermove",
    (event) => {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );
}

const anchor = new THREE.Vector3();
const edge = new THREE.Vector3();
const toScreen = (vector) => {
  vector.project(camera);
  vector.x = (vector.x * 0.5 + 0.5) * width;
  vector.y = (-vector.y * 0.5 + 0.5) * height;
  return vector;
};

function placeLabels(amount) {
  if (amount < 0.01) {
    if (labelsBox.dataset.on) {
      LABELS.forEach((label) => (label.element.style.opacity = 0));
      delete labelsBox.dataset.on;
    }
    return;
  }
  labelsBox.dataset.on = "1";
  const top = toScreen(parts.drive.localToWorld(edge.set(0, 6.5, 0))).y;
  const bottom = toScreen(parts.drive.localToWorld(edge.set(0, -6.5, 0))).y;
  for (const label of LABELS) {
    label.element.style.opacity = amount.toFixed(3);
    if (dense) {
      // на узком экране у каждого слоя стоит номер, а названия перечислены в тексте под заголовком
      toScreen(label.part.localToWorld(anchor.set(0, 0, 0)));
      label.element.style.transform = `translate(${(anchor.x + width * 0.3).toFixed(1)}px, ${anchor.y.toFixed(1)}px) translate(-50%, -50%)`;
      continue;
    }
    toScreen(label.part.localToWorld(anchor.set(label.x, label.y, 0)));
    const rowY = label.up ? Math.min(top, anchor.y) - 30 : Math.max(bottom, anchor.y) + 30;
    label.line.style.height = `${Math.max(Math.abs(anchor.y - rowY), 12).toFixed(0)}px`;
    // блок подписи начинается в точке на детали: выноска идёт от неё до своего ряда, дальше текст
    label.element.style.transform = `translate(${anchor.x.toFixed(1)}px, ${anchor.y.toFixed(1)}px) translate(-50%, ${label.up ? "-100%" : "0"})`;
  }
}

function update() {
  samplePose(state.p);
  // на узком экране разбор стоит вертикально (повёрнут на четверть оборота), поэтому «вбок» для него — другая ось
  if (dense) module.rotation.set(pose.rx + lookY * 0.1 - spin.yaw, pose.ry + lookX * 0.18, 0);
  else module.rotation.set(pose.rx + lookY * 0.1 + spin.pitch, pose.ry + lookX * 0.18 + spin.yaw, 0);
  module.scale.setScalar(pose.s * spin.zoom);

  const explode = ease(pose.e);
  for (const name in parts) {
    const group = parts[name];
    group.position.z = group.userData.z0 + group.userData.spread * explode;
  }
  for (const item of lenses.children) item.position.z = item.userData.home + item.userData.gap * explode;
  stack.position.z = -SPREAD_CENTER * explode;

  return ease((explode - 0.6) / 0.4);
}

let lastFrame = 0;
let lastP = -1;
let frameCount = 0;
let frameTime = 0;

function frame(now) {
  requestAnimationFrame(frame);
  // вне экрана и в фоновой вкладке ничего не делаем; на быстрых мониторах — не чаще ~60 кадров в секунду
  if (!state.near || document.hidden || now - lastFrame < 15) return;

  // камера чуть поворачивается за курсором и замирает, как только курсор остановился
  const turning = Math.abs(pointerX - lookX) > 0.002 || Math.abs(pointerY - lookY) > 0.002;
  if (turning) {
    lookX += (pointerX - lookX) * 0.08;
    lookY += (pointerY - lookY) * 0.08;
  }
  // страницу листают дальше — то, что накрутили рукой, плавно возвращается
  if (spin.held) spunAt = state.p;
  else if (Math.abs(state.p - spunAt) > 0.004) spin.home();
  const spinning = spin.update(now);
  // ничего не изменилось — кадр не трогаем: картинка стоит неподвижно и не мерцает
  if (!dirty && !turning && !spinning && state.p === lastP) return;

  const delta = now - lastFrame;
  lastFrame = now;
  lastP = state.p;
  dirty = false;

  const labelAmount = update();
  tilt.updateMatrixWorld(true);
  renderer.render(scene, camera);
  placeLabels(labelAmount);

  // Следим за плавностью: если кадры идут медленно, рисуем картинку помельче
  if (delta < 100) {
    frameCount += 1;
    frameTime += delta;
    if (frameCount === 60) {
      if (frameTime / frameCount > 26 && pixelRatio > 0.7) {
        pixelRatio = Math.max(pixelRatio * 0.85, 0.7);
        resize();
      }
      frameCount = 0;
      frameTime = 0;
    }
  }
}

// надписи рисуются шрифтом, который может догрузиться позже: тогда перерисовываем кадр
if (document.fonts) document.fonts.ready.then(() => (dirty = true));
requestAnimationFrame(frame);
