// ===== Объёмный телефон из официальных снимков: общая часть для главной и для страниц моделей =====
// Спинка и экран телефона — настоящие официальные снимки OnePlus. Они наложены на объёмный корпус
// с настоящими размерами, поэтому телефон можно поворачивать. Часы на экране идут по московскому времени.
// Здесь лежит всё общее: список моделей со снимками, студийный свет и сборка самого телефона.
// Кто и когда его поворачивает, решает страница: phones3d.js на главной, one-turn.js на странице OnePlus One.
import * as THREE from "./vendor/three-0.160.0/three.module.min.js";

// Настоящие размеры (мм), цвет рамки и снимки.
// back — где на снимке лежит крышка: rect [x, y, ширина, высота] для снимка анфас или quad — четыре угла
//        (левый верхний, правый верхний, правый нижний, левый нижний) для снимка под углом, всё в пикселях снимка;
//        hiddenFrom — последний чистый столбец перед тем местом, где крышку на снимке закрывает второй телефон:
//        дальше программа достраивает крышку сама; bridge — строки над и под блоком камер, между которыми цвет
//        достроенной части берётся плавным переходом, чтобы в неё не попадал край блока камер.
// front — прямоугольник телефона экраном к зрителю; clock — на какой высоте экрана стоят часы (доля высоты);
//         r — скругление углов спереди, если оно не такое, как у корпуса. r корпуса снято с самих снимков (см).
// curve — загиб крышки к рамке: ширина, глубина и толщина крышки (см).
const FOLDER = "assets/home/";

// Детали на гранях у каждой модели свои — как у настоящего телефона. Откуда взято расположение, написано у каждой модели.
// buttons — кнопки на боках: [сторона, высота (см от середины корпуса, вверх — плюс), длина (см), вид, сдвиг по толщине].
//   Сторона — как её видит человек, держащий телефон экраном к себе: "left" или "right".
//   Вид: "key" — обычная кнопка, "slider" — ребристый переключатель звука, "flat" — плоская кнопка со сканером отпечатка.
// bottom, top, left, right — что есть на грани: [вид, место, …]. Место — сантиметры от середины грани;
//   на нижней и верхней грани плюс — в сторону ЛЕВОГО края телефона (если смотреть на экран), на боковых — вверх.
//   "usb" — USB-C, "micro" — microUSB, "jack" — гнездо наушников, "hole" — отверстие микрофона (сдвиг, диаметр),
//   "window" — тёмное окошко ИК-порта (сдвиг, диаметр), "holes" — ряд отверстий динамика (сколько, шаг),
//   "slots" — щели динамика (сколько, длина, сдвиг, высота, промежуток), "grid" — сетка мелких отверстий
//   (столбцов, строк), "tray" — лоток SIM (длина, у какого конца отверстие для скрепки), "band" — полоска антенны.
// Расположение у 12, 15, Open и на верхних гранях One и 7 Pro снято с фотографий самих телефонов в обзорах GSMArena
// (точность — около миллиметра, у 7 Pro сверху — около двух).
const EDGES_15 = {
  // бока — по официальным кадрам поворота телефона; низ и верх — по фотографиям телефона (ИК-порт у 15 стоит
  // в блоке камер, на верхней грани его нет). Крайняя щель динамика и конец лотка заходят на скругление угла
  buttons: [["right", 4.16, 1.99], ["right", 1.95, 1.0], ["left", 4.78, 0.87]],
  bottom: [["usb", 0], ["slots", -2.33, 2, 0.6, 0, 0.06, 0.2], ["hole", -1.15, 0, 0.07], ["hole", 1.13, 0, 0.07], ["band", -0.81], ["band", 0.81], ["tray", 2.17, 1.5, 1]],
  top: [["slots", 1.13, 2, 0.37, 0, 0.11, 0.1], ["hole", -1.03, 0, 0.12], ["band", 1.87], ["band", -1.87]],
};
export const PHONES = {
  one: {
    w: 75.9, h: 152.9, d: 8.9, r: 1.1, inset: 0.16, frame: 0xe6e7e8, metal: 0.1, curve: [0.4, 0.2, 0.42],
    back: { src: "one-white-back.webp", size: [1483, 1165], quad: [[1034.4, -30.1], [1459.9, 296.4], [476.7, 1057.8], [35.5, 631.5]] },
    front: { src: "one-front.jpg", rect: [31, 8, 274, 552], clock: 0.6, inside: true },
    // низ и левый бок — по официальным снимкам (две решётки динамиков по сторонам от microUSB, точка микрофона;
    // слева лоток SIM, отверстие и качелька громкости), питание справа — по обзорам;
    // верх — по фотографии телефона: гнездо наушников и точка микрофона
    buttons: [["right", 3.06, 1.1], ["left", 3.06, 2.0]],
    bottom: [["micro", 0], ["grid", -1.85, 11, 2], ["grid", 1.85, 11, 2], ["hole", -1.05, 0, 0.08]],
    top: [["jack", -2.45], ["hole", 1.79, 0, 0.07]],
    left: [["tray", 5.55, 1.5, 0], ["hole", 4.55, 0, 0.07]],
  },
  "7pro": {
    w: 75.9, h: 162.6, d: 8.8, r: 0.93, frame: 0xd8bd95, curve: [0.26, 0.14, 0.28],
    back: { src: "7pro-almond-back.webp", size: [1200, 1404], quad: [[700, 59.7], [1190, -9], [1187, 1413], [700, 1326.5]] },
    front: { src: "7pro-almond.jpg", rect: [2, 1, 303, 648], clock: 0.2 },
    popup: { src: "7pro-popup.webp", rect: [28, 8, 394, 264] },
    // низ — по официальному снимку (лоток SIM с отверстием, полоска антенны, микрофон, USB-C, микрофон, пять отверстий
    // динамика); бока — по официальному контуру телефона (слева громкость, справа переключатель звука над питанием);
    // на верхней грани, кроме выдвижной камеры, — точка микрофона (по фотографии телефона)
    buttons: [["left", 3.43, 1.98], ["right", 3.5, 0.95, "slider"], ["right", 1.59, 1.19]],
    bottom: [["usb", 0], ["hole", -0.95], ["holes", -1.82, 5, 0.2], ["hole", 1.0], ["band", 1.2], ["tray", 2.1, 1.5, -1]],
    top: [["hole", -1.0, 0, 0.07]],
  },
  12: {
    w: 75.8, h: 164.3, d: 9.2, r: 0.74, frame: 0xd9dce0, curve: [0.24, 0.13, 0.28],
    back: { src: "12-white.webp", size: [1080, 1080], rect: [200, 120, 387, 839], hiddenFrom: 489, bridge: [150, 465] },
    front: { src: "12-white.webp", rect: [493, 120, 387, 839], clock: 0.16 },
    // кнопки справа — по официальному снимку; переключатель звука слева — по обзорам; низ и верх — по фотографиям
    // телефона (низ: две щели динамика, USB-C между полосками антенн, микрофон, лоток SIM; верх: щель динамика,
    // окошко ИК-порта, микрофон, полоски антенн). Правая нижняя полоска на фото закрыта вынутым лотком —
    // поставлена зеркально левой, как у OnePlus 13 и 15
    buttons: [["right", 4.03, 2.02], ["right", 1.83, 0.97], ["left", 5.0, 1.3, "slider"]],
    bottom: [["usb", 0], ["slots", -2.255, 2, 0.62, 0, 0.09, 0.12], ["hole", 1.18], ["band", -0.8], ["band", 0.8], ["tray", 2.27, 1.58, 1]],
    top: [["slots", 1.15, 1, 0.39, 0, 0.1], ["window", -1.64, 0, 0.23], ["hole", -2.35], ["band", 2.57], ["band", -2.57]],
  },
  open: {
    w: 73.3, h: 153.4, d: 11.7, r: 0.88, frame: 0x7f968b, fold: true,
    back: { src: "open-green.webp", size: [1080, 1080], rect: [149, 119, 400, 840], hiddenFrom: 523 },
    front: { src: "open-green.webp", rect: [532, 119, 400, 840], clock: 0.16 },
    // сложенный телефон: две половинки, поэтому у деталей есть сдвиг по толщине (плюс — половинка с камерами,
    // минус — половинка с наружным экраном). Кнопки — по кадрам официальных роликов: на половинке с камерами громкость
    // и плоская кнопка питания, на другой — ребристый переключатель звука. Низ и верх — по фотографиям сложенного
    // телефона: сверху на каждой половинке три щели динамика (ближе к петле) и микрофон; снизу на половинке
    // с камерами лоток SIM (у петли), USB-C посередине и три щели динамика, на другой — микрофон и три щели;
    // полоски антенн идут через обе половинки
    buttons: [["right", 4.69, 2.3, "key", 0.25], ["right", 2.1, 1.4, "flat", 0.25], ["right", 5.26, 1.1, "slider", -0.25]],
    bottom: [["tray", 1.56, 1.63, 1, 0.25], ["usb", 0, 0.25], ["slots", -1.92, 3, 0.26, 0.25, 0.11, 0.105], ["slots", -1.92, 3, 0.26, -0.25, 0.11, 0.105], ["hole", 0.98, -0.25, 0.08], ["band", 0.65], ["band", -0.67]],
    top: [["slots", 1.1, 3, 0.25, 0.25, 0.11], ["hole", -1.4, 0.25], ["slots", 1.1, 3, 0.25, -0.25, 0.11], ["hole", -1.4, -0.25], ["band", 1.75], ["band", -1.65]],
  },
  13: {
    w: 76.5, h: 162.9, d: 8.5, r: 0.89, frame: 0xdde1e6,
    back: { src: "13-white-angled.avif", size: [451, 1100], quad: [[85, 37.3], [384, 142.6], [384, 1044.1], [85, 1044]] },
    front: { src: "13-white.webp", rect: [490.5, 120, 394.5, 840], clock: 0.16 },
    // всё снято с официальной объёмной модели OnePlus 13 (она стоит на странице модели): места кнопок, разъёма,
    // двух щелей динамика, микрофонов, лотка SIM, полосок антенн и трёх отверстий со щелью на верхней грани
    buttons: [["right", 4.23, 1.98], ["right", 2.13, 0.99], ["left", 4.95, 1.3, "slider"]],
    bottom: [["usb", 0], ["slots", -2.26, 2, 0.56], ["hole", -1.17], ["hole", 1.17], ["band", -0.83], ["band", 0.83], ["tray", 2.19, 1.49, 1]],
    top: [["slots", 1.3, 1, 0.4], ["hole", -0.86], ["hole", -1.57], ["hole", -2.28]],
  },
  15: {
    w: 76.7, h: 161.4, d: 8.1, r: 1.42, frame: 0xc9bca6,
    back: { src: "15-sand.webp", size: [2160, 2160], rect: [401, 237, 800, 1684], hiddenFrom: 941 },
    front: { src: "15-sand.webp", rect: [958, 237, 800, 1684], clock: 0.16 },
    ...EDGES_15,
  },
  // остальные расцветки OnePlus 15: они нужны только на его странице, где цвет переключается
  "15-black": {
    w: 76.7, h: 161.4, d: 8.1, r: 1.42, frame: 0x1e2024,
    back: { src: "15-black.webp", size: [2160, 2160], rect: [401, 237, 800, 1684], hiddenFrom: 941 },
    front: { src: "15-black.webp", rect: [958, 237, 800, 1684], clock: 0.16 },
    ...EDGES_15,
  },
  "15-violet": {
    w: 76.7, h: 161.4, d: 8.1, r: 1.42, frame: 0xb8b2ca,
    back: { src: "15-violet.webp", size: [2160, 2160], rect: [401, 237, 800, 1684], hiddenFrom: 941 },
    front: { src: "15-violet.webp", rect: [958, 237, 800, 1684], clock: 0.16 },
    ...EDGES_15,
  },
};

// ----- Заготовки -----
function texture(width, height, draw) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  draw(element.getContext("2d"), width, height);
  const result = new THREE.CanvasTexture(element);
  result.colorSpace = THREE.SRGBColorSpace;
  return result;
}
function fit(map, w, h) {
  map.repeat.set(1 / w, 1 / h);
  map.offset.set(0.5, 0.5);
  return map;
}
function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  return item;
}
// На телефоне снимок перед загрузкой в видеокарту уменьшается: экран там маленький, а крупный снимок занимает
// в её памяти в несколько раз больше. Места на снимке заданы долями, поэтому раскладка от этого не меняется
const SMALL_SCREEN = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
function fitted(image, limit) {
  const scale = limit / Math.max(image.naturalWidth, image.naturalHeight);
  if (!SMALL_SCREEN || scale >= 1) return image;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
const loadImage = (name) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Не загрузился снимок ${name}`));
    image.src = FOLDER + name;
  });

// Студия: тёмная комната с яркими панелями. Их отражения ложатся на рамку и на стекло экрана
function studio(renderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x05060a);
  const panel = (width, height, color, power, x, y, z, map = null, roll = 0) => {
    const item = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), map, side: THREE.DoubleSide, toneMapped: false }));
    item.position.set(x, y, z);
    item.lookAt(0, 0, 0);
    item.rotateZ(roll);
    room.add(item);
  };
  panel(20, 10, 0xffffff, 8, 2, 16, 8);
  panel(6, 24, 0xdfe8ff, 7, -18, 2, 6);
  panel(6, 24, 0xfff0dc, 6, 18, -1, 6);
  panel(14, 5, 0xffffff, 3, 0, -15, 9);
  panel(12, 12, 0xffffff, 4, 0, 2, 22);
  panel(40, 40, 0x2a3040, 1, 0, 0, -24);
  // узкая косая полоса слева: она ложится бликом на стекло экрана, когда телефон развёрнут лицом
  const streak = texture(128, 32, (ctx, w, h) => {
    const fade = ctx.createLinearGradient(0, 0, w, 0);
    fade.addColorStop(0, "#000000");
    fade.addColorStop(0.5, "#ffffff");
    fade.addColorStop(1, "#000000");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
  });
  panel(3, 34, 0xeaf1ff, 2.6, -15.8, -2, 15.3, streak, 0.5);
  return new THREE.PMREMGenerator(renderer).fromScene(room, 0.02).texture;
}

// Сцена для телефонов: холст заданного размера, студийный свет и камера.
// canvas — готовый холст со страницы; если его не передать, сцена рисует в свой невидимый холст.
// view — сколько сантиметров по высоте помещается в кадр
export function createStage(width, height, { canvas, view = 18.5 } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    document.documentElement.classList.add("no-3d");
    throw new Error("WebGL недоступен: объёмные телефоны не нарисованы");
  }
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  const camera = new THREE.PerspectiveCamera(22, width / height, 10, 120);
  camera.position.set(0, 0.25, view / (2 * Math.tan((22 * Math.PI) / 360)));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
  keyLight.position.set(8, 14, 24);
  const rimLight = new THREE.DirectionalLight(0xe6ecff, 1.1);
  rimLight.position.set(-16, 4, -10);
  scene.add(keyLight, rimLight);
  return { renderer, scene, camera };
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
// Пластина со скруглёнными углами и фаской. smooth — насколько гладко скруглены углы: у рамки оно полное,
// у мелких деталей (кнопок) хватает в несколько раз меньшего — на глаз разницы нет, а треугольников вдесятеро меньше
function plate(w, h, r, depth, bevel = 0.05, smooth = 24) {
  const shape = roundedRect(new THREE.Shape(), w - bevel * 2, h - bevel * 2, Math.max(r - bevel, 0.02));
  const inner = Math.max(depth - bevel * 2, 0.01);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: inner, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: smooth > 8 ? 4 : 2, curveSegments: smooth });
  geometry.translate(0, 0, -inner / 2);
  return geometry;
}
// Крышка телефона: края плавно загибаются к рамке. Верх крышки лежит на нуле, снимок ложится на неё плоско
function cover(w, h, r, [size, drop, thick]) {
  const shape = roundedRect(new THREE.Shape(), w - size * 2, h - size * 2, Math.max(r - size, 0.05));
  const wall = Math.max(thick - drop, 0.01);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: wall, bevelEnabled: true, bevelThickness: drop, bevelSize: size, bevelSegments: 12, curveSegments: 28 });
  geometry.translate(0, 0, -wall - drop); // нижний загиб уходит внутрь рамки и не виден
  const { position, uv } = geometry.attributes;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i), position.getY(i));
  return geometry;
}

// Матрица, которая переводит четыре угла крышки в четыре точки снимка. С ней снимок, сделанный под углом,
// ложится на крышку ровно, как будто телефон снимали анфас
function homography(from, to) {
  const rows = [];
  from.forEach(([x, y], index) => {
    const [u, v] = to[index];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const factor = rows[row][column] / rows[column][column];
      for (let k = column; k < 9; k++) rows[row][k] -= factor * rows[column][k];
    }
  }
  const h = rows.map((row, index) => row[8] / row[index]);
  return new THREE.Matrix3().set(h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1);
}

// Материал крышки: показывает снимок без дополнительного света, чтобы цвета были как на официальном фото.
// Там, где на снимке вокруг телефона пусто, и на боковой стенке крышки стоит цвет рамки. Часть крышки,
// закрытую на снимке вторым телефоном, достраивает сам: цвет продолжает последним видимым столбцом,
// а форму края и ободок берёт зеркально с левой стороны
function backMaterial(map, matrix, fill, bridge, base) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, homo: { value: matrix }, fill: { value: fill }, bridge: { value: bridge }, base: { value: new THREE.Color(base) } },
    vertexShader: `
      varying vec2 vFace;
      varying float vFlat;
      void main() {
        vFace = uv;
        vFlat = normal.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D map;
      uniform mat3 homo;
      uniform vec3 fill;
      uniform vec2 bridge;
      uniform vec3 base;
      varying vec2 vFace;
      varying float vFlat;
      void main() {
        vec3 point = homo * vec3(vFace, 1.0);
        vec2 st = point.xy / point.z;
        vec2 dx = dFdx(st);
        vec2 dy = dFdy(st);
        vec4 shot = textureGrad(map, st, dx, dy);
        if (st.x > fill.x) {
          vec4 mirrored = textureGrad(map, vec2(fill.z - st.x, st.y), dx, dy);
          vec4 stretched = textureGrad(map, vec2(fill.x, st.y), dx, dy);
          if (st.y < bridge.x && st.y > bridge.y) {
            vec4 above = textureGrad(map, vec2(fill.x, bridge.x), dx, dy);
            vec4 below = textureGrad(map, vec2(fill.x, bridge.y), dx, dy);
            stretched = mix(above, below, (bridge.x - st.y) / (bridge.x - bridge.y));
          }
          shot = st.x > fill.y ? mirrored : vec4(stretched.rgb / max(stretched.a, 0.001) * mirrored.a, mirrored.a);
        }
        vec3 color = mix(base, shot.rgb / max(shot.a, 0.001), shot.a);
        gl_FragColor = vec4(vFlat < 0.3 ? base * 0.86 : color, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

const steel = new THREE.MeshStandardMaterial({ color: 0x15171d, metalness: 0.9, roughness: 0.3 });
// стекло поверх экрана: само прозрачное, но отражает студию и даёт живой блик при повороте
const glass = new THREE.MeshPhysicalMaterial({ color: 0x020305, specularColor: 0xdfeaff, roughness: 0.03, transparent: true, blending: THREE.AdditiveBlending, clearcoat: 0.4, envMapIntensity: 0.9, depthWrite: false });

// ----- Часы на экранах: московское время -----
const clockTime = new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" });
const clockDate = new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", weekday: "long", day: "numeric", month: "long" });

// Экран: официальный снимок телефона спереди и поверх него часы с датой
function paintScreen(screen, image, front) {
  const { width, height } = screen.canvas;
  const [x, y, w, h] = front.rect;
  screen.clearRect(0, 0, width, height);
  screen.drawImage(image, x, y, w, h, 0, 0, width, height);
  const now = new Date();
  screen.textAlign = "center";
  screen.fillStyle = "#ffffff";
  screen.shadowColor = "rgba(0, 0, 0, 0.45)";
  screen.shadowBlur = width * 0.03;
  screen.font = `500 ${height * 0.08}px Onest, sans-serif`;
  screen.fillText(clockTime.format(now), width / 2, height * front.clock);
  screen.font = `500 ${height * 0.021}px Onest, sans-serif`;
  screen.fillText(clockDate.format(now), width / 2, height * (front.clock + 0.034));
  screen.shadowBlur = 0;
}

// ----- Детали на гранях: разъём, решётки динамиков, микрофоны, лоток SIM -----
// Каждая грань получает одну тонкую накладку. Сначала на холсте рисуется «рельеф»: белое — поверхность рамки,
// чёрное — дно углубления, мягкий край — фаска. Из рельефа получаются две картинки: цвет с прозрачностью (там, где
// деталей нет, накладка прозрачна и видна сама рамка) и карта наклонов — по ней свет студии ложится на стенки
// углублений, как на настоящие. Поэтому отверстия выглядят вдавленными, а лишней геометрии всего два треугольника.
// along — длина накладки, across — её ширина по толщине телефона (всё в сантиметрах), far — расстояние грани
// от середины телефона, straight — половина прямой части грани, radius — скругление угла рамки: если детали
// заходят на скругление (как крайняя щель динамика у OnePlus 15), накладка огибает угол вместе с рамкой
const EDGE_SCALE = 150; // точек рисунка на сантиметр
// докуда от середины грани дотягивается деталь (см) — по этому выбирается длина накладки
function edgeReach([kind, u, a, b, , , gap]) {
  const half =
    kind === "tray" || kind === "recess" ? a / 2
    : kind === "slots" ? ((a - 1) / 2) * (b + (gap ?? 0.07)) + b / 2
    : kind === "holes" ? ((a - 1) / 2) * b + 0.07
    : kind === "grid" ? ((a - 1) / 2) * 0.115 + 0.04
    : { usb: 0.45, micro: 0.38, jack: 0.18, window: 0.13 }[kind] || 0.08;
  return Math.abs(u) + half;
}
function edgePlate(side, items, along, across, far, railZ, spec, straight, radius) {
  const S = EDGE_SCALE;
  const width = Math.round(along * S);
  const height = Math.round(across * S);
  const sheet = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };
  const relief = sheet();
  const colour = sheet();
  const ink = relief.getContext("2d", { willReadFrequently: true }); // рельеф
  const tint = colour.getContext("2d", { willReadFrequently: true }); // то, что просто покрашено: язычок разъёма, полоски антенн
  ink.fillStyle = "#fff";
  ink.fillRect(0, 0, width, height);
  // место вдоль грани (см от её середины) и поперёк (см от середины рамки, плюс — к спинке) → точки рисунка
  const px = (u) => (u + along / 2) * S;
  const py = (w) => (across / 2 - w) * S;
  // «таблетка»: прямоугольник со скруглёнными торцами (round — радиус скругления в долях высоты, 0.5 — полукруг)
  const pill = (ctx, u, w, long, tall, round = 0.5) => {
    ctx.beginPath();
    ctx.roundRect(px(u - long / 2), py(w + tall / 2), long * S, tall * S, tall * S * round);
  };
  // углубление: depth 0 — глубокое (чёрное), 1 — вровень с рамкой; soft — ширина фаски в точках рисунка
  const dent = (u, w, long, tall, depth = 0, soft = 1.5, round = 0.5) => {
    ink.save();
    ink.filter = `blur(${soft}px)`;
    const tone = Math.round(depth * 255);
    ink.fillStyle = `rgb(${tone} ${tone} ${tone})`;
    pill(ink, u, w, long, tall, round);
    ink.fill();
    ink.restore();
  };
  for (const [kind, u, a, b, c, d, e] of items) {
    if (kind === "usb") {
      // разъём USB-C: глубокая «таблетка» и язычок контактов внутри
      const w = a || 0;
      dent(u, w, 0.9, 0.31);
      dent(u, w, 0.58, 0.075, 0.3, 0.7);
      tint.fillStyle = "#4b4f58";
      pill(tint, u, w, 0.58, 0.075);
      tint.fill();
    } else if (kind === "micro") {
      // microUSB: прямоугольное гнездо со скошенными углами и язычком
      const w = a || 0;
      dent(u, w, 0.76, 0.25, 0, 1.5, 0.22);
      dent(u, w - 0.03, 0.52, 0.06, 0.3, 0.7);
      tint.fillStyle = "#4b4f58";
      pill(tint, u, w - 0.03, 0.52, 0.06);
      tint.fill();
    } else if (kind === "jack") {
      // гнездо наушников 3,5 мм: широкая фаска и глубокое круглое отверстие (a — сдвиг по толщине)
      dent(u, a || 0, 0.34, 0.34, 0.55, 1.5);
      dent(u, a || 0, 0.27, 0.27, 0, 1.4);
    } else if (kind === "hole") {
      // круглое отверстие микрофона (a — сдвиг по толщине, b — диаметр)
      dent(u, a || 0, b || 0.1, b || 0.1, 0, 1.2);
    } else if (kind === "window") {
      // окошко ИК-порта: тёмное стекло почти вровень с рамкой (a — сдвиг по толщине, b — диаметр)
      const size = b || 0.2;
      dent(u, a || 0, size, size, 0.8, 1);
      tint.fillStyle = "#0d0e12";
      pill(tint, u, a || 0, size - 0.02, size - 0.02);
      tint.fill();
    } else if (kind === "holes") {
      // ряд круглых отверстий динамика: a — сколько, b — шаг, c — сдвиг по толщине
      for (let index = 0; index < a; index++) dent(u + (index - (a - 1) / 2) * b, c || 0, 0.125, 0.125, 0, 1.2);
    } else if (kind === "slots") {
      // щели динамика: a — сколько, b — длина одной, c — сдвиг по толщине, d — высота щели, e — промежуток между щелями
      const step = b + (e ?? 0.07);
      for (let index = 0; index < a; index++) dent(u + (index - (a - 1) / 2) * step, c || 0, b, d || 0.085, 0, 1.2);
    } else if (kind === "grid") {
      // решётка из мелких отверстий: a — столбцов, b — строк, c — сдвиг по толщине
      for (let column = 0; column < a; column++) for (let row = 0; row < b; row++) dent(u + (column - (a - 1) / 2) * 0.115, (c || 0) + (row - (b - 1) / 2) * 0.115, 0.062, 0.062, 0, 0.9);
    } else if (kind === "tray") {
      // лоток SIM: тонкая щель по контуру и отверстие для скрепки у одного конца
      // (a — длина, b — у какого конца отверстие: 1 или −1, 0 — отверстия на лотке нет, c — сдвиг по толщине)
      ink.save();
      ink.filter = "blur(0.7px)";
      ink.strokeStyle = "rgb(70 70 70)";
      ink.lineWidth = 0.024 * S;
      pill(ink, u, c || 0, a, 0.27);
      ink.stroke();
      ink.restore();
      if (b !== 0) dent(u + (b || 1) * (a / 2 - 0.15), c || 0, 0.07, 0.07, 0, 1);
    } else if (kind === "band") {
      // полоска антенны: пластиковая вставка поперёк всей грани, чуть светлее металла, с тонкими стыками по краям
      const plastic = new THREE.Color(spec.frame).lerp(new THREE.Color(0xf2f3f5), 0.42);
      tint.fillStyle = `#${plastic.getHexString()}`;
      tint.fillRect(px(u - 0.035), 0, 0.07 * S, height);
      ink.fillStyle = "rgb(205 205 205)";
      ink.fillRect(px(u - 0.04), 0, 0.012 * S, height);
      ink.fillRect(px(u + 0.028), 0, 0.012 * S, height);
    } else if (kind === "recess") {
      // неглубокая продолговатая выемка под движок переключателя звука (a — длина, b — сдвиг по толщине)
      dent(u, b || 0, a, 0.2, 0.3, 2);
    }
  }

  // из рельефа — цвет с прозрачностью и карта наклонов
  const high = ink.getImageData(0, 0, width, height).data;
  const paint = tint.getImageData(0, 0, width, height).data;
  const shade = new ImageData(width, height);
  const slope = new ImageData(width, height);
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(new THREE.Color(spec.frame).getHexString().slice(start - 1, start + 1), 16));
  const row = width * 4;
  for (let y = 0; y < height; y++) {
    const up = y > 0 ? -row : 0;
    const down = y < height - 1 ? row : 0;
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      const before = high[at - (x > 0 ? 4 : 0)];
      const after = high[at + (x < width - 1 ? 4 : 0)];
      const above = high[at + up];
      const below = high[at + down];
      // пустое место (большая часть накладки): ровная поверхность, полностью прозрачная — считать нечего
      if (high[at] === 255 && before === 255 && after === 255 && above === 255 && below === 255 && paint[at + 3] === 0) {
        slope.data[at] = slope.data[at + 1] = 127;
        slope.data[at + 2] = slope.data[at + 3] = 255;
        continue;
      }
      const h = high[at] / 255;
      const dx = ((before - after) / 255) * 2.6;
      const dy = ((below - above) / 255) * 2.6;
      const size = Math.hypot(dx, dy, 1);
      slope.data[at] = (dx / size) * 127.5 + 127.5;
      slope.data[at + 1] = (dy / size) * 127.5 + 127.5;
      slope.data[at + 2] = (1 / size) * 127.5 + 127.5;
      slope.data[at + 3] = 255;
      // рамка темнеет ко дну углубления; там, где рельефа нет, накладка прозрачна
      const lit = 0.05 + 0.95 * h ** 1.7;
      const solid = Math.min(Math.max((1 - h) * 10, Math.hypot(dx, dy) * 6), 1);
      const coat = paint[at + 3] / 255;
      shade.data[at] = red * lit * (1 - coat) + paint[at] * coat;
      shade.data[at + 1] = green * lit * (1 - coat) + paint[at + 1] * coat;
      shade.data[at + 2] = blue * lit * (1 - coat) + paint[at + 2] * coat;
      shade.data[at + 3] = Math.max(solid, coat) * 255;
    }
  }
  tint.putImageData(shade, 0, 0);
  ink.putImageData(slope, 0, 0);
  const map = new THREE.CanvasTexture(colour);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const normalMap = new THREE.CanvasTexture(relief);
  normalMap.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(1.5, 1.5), metalness: spec.metal ?? 1, roughness: 0.42, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });

  // Лента накладки стоит вплотную к грани: посередине прямая, а на концах огибает скругление угла — несколькими
  // короткими отрезками. Рисунок ложится на неё «как на фотографии грани»: место детали отсчитывается вдоль грани.
  // run — место вдоль грани, away — наружу от середины телефона
  const lift = 0.004;
  const low = railZ - across / 2;
  const top = railZ + across / 2;
  const half = along / 2;
  const arc = radius + lift;
  const sweep = Math.asin(Math.min(Math.max(half - straight, 0) / arc, 0.95)); // на какой угол лента заходит на скругление
  const steps = sweep > 0.01 ? Math.ceil(sweep / 0.09) : 0;
  const points = [];
  for (let step = -steps; step <= steps; step++) {
    if (step === 0) points.push([-1, 0]); // у прямой части два конца
    points.push([step < 0 ? -1 : 1, steps ? (Math.abs(step) / steps) * sweep : 0]);
  }
  const place = { bottom: (a, b) => [a, -b], top: (a, b) => [a, b], left: (a, b) => [b, a], right: (a, b) => [-b, a] }[side];
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  points.forEach(([end, angle], index) => {
    const run = end * (straight + arc * Math.sin(angle));
    const away = far - radius + arc * Math.cos(angle);
    const [x, y] = place(run, away);
    const [nx, ny] = place(end * Math.sin(angle), Math.cos(angle));
    const u = Math.min(Math.max(run / (half * 2) + 0.5, 0), 1);
    positions.push(x, y, low, x, y, top);
    normals.push(nx, ny, 0, nx, ny, 0);
    uvs.push(u, 0, u, 1);
    if (index) {
      const [a, b, c, d] = [index * 2 - 2, index * 2, index * 2 + 1, index * 2 - 1];
      // порядок обхода вершин такой, чтобы накладка смотрела наружу
      indices.push(...(side === "bottom" || side === "left" ? [a, b, c, a, c, d] : [a, c, b, a, d, c]));
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return new THREE.Mesh(geometry, material);
}

function buildPhone(spec, shots) {
  const group = new THREE.Group();
  const W = spec.w / 10;
  const H = spec.h / 10;
  const D = spec.d / 10;
  const curve = spec.curve || [0.1, 0.06, 0.16];
  const railDepth = D - curve[2] - 0.005; // рамка занимает всё, что не закрыто крышкой
  const railZ = (0.005 - curve[2]) / 2;
  const frameMaterial = new THREE.MeshStandardMaterial({ color: spec.frame, metalness: spec.metal ?? 1, roughness: 0.32 });

  const inset = spec.inset || 0.05; // рамка чуть меньше снимка, чтобы край телефона задавал сам снимок
  group.add(mesh(plate(W - inset, H - inset, spec.r, railDepth, 0.07), frameMaterial, 0, 0, railZ)); // рамка
  group.add(mesh(cover(W, H, spec.r, curve), shots.back, 0, 0, D / 2)); // крышка со снимком

  // лицевая сторона со снимком экрана и стекло с бликом поверх
  // Обычно стекло закрывает рамку целиком. У OnePlus One (front.inside) оно лежит внутри рамки: вокруг экрана видна
  // её скруглённая кромка, углы стекла повторяют углы корпуса — ничего не торчит за корпус, если смотреть сбоку
  const sunk = spec.front.inside ? inset + 0.12 : 0;
  const faceR = spec.front.inside ? spec.r - 0.06 : spec.front.r || spec.r;
  const face = mesh(new THREE.ShapeGeometry(roundedRect(new THREE.Shape(), W - sunk, H - sunk, faceR), 16), shots.front, 0, 0, -D / 2);
  face.rotation.y = Math.PI;
  const shine = mesh(new THREE.ShapeGeometry(roundedRect(new THREE.Shape(), W - sunk - 0.06, H - sunk - 0.06, faceR - 0.03), 16), glass, 0, 0, -D / 2 - 0.004);
  shine.rotation.y = Math.PI;
  group.add(face, shine);

  // Кнопки на боковых гранях — у каждой модели свои и на своих местах (список buttons в описании модели).
  // Сторона названа так, как её видит человек, держащий телефон экраном к себе; в модели это зеркально:
  // его правая сторона — слева, если смотреть на спинку
  const sideX = (side) => (side === "left" ? 1 : -1) * (W / 2 - inset / 2);
  const thick = Math.min(0.26, railDepth * 0.7);
  (spec.buttons || []).forEach(([side, y, length, kind = "key", shift = 0]) => {
    const x = sideX(side);
    const z = railZ + shift;
    const depth = spec.fold ? Math.min(thick, 0.3) : thick;
    if (kind === "slider") {
      // переключатель звука: ребристый движок в продолговатом углублении (само углубление нарисовано на грани, см. ниже)
      const knob = length * 0.46;
      group.add(mesh(plate(0.07, knob, 0.03, depth * 0.8, 0.02, 4), frameMaterial, x + Math.sign(x) * 0.005, y + length * 0.12, z));
      for (let ridge = 0; ridge < 5; ridge++) group.add(mesh(new THREE.BoxGeometry(0.035, 0.035, depth * 0.78), frameMaterial, x + Math.sign(x) * 0.04, y + length * 0.12 + (ridge - 2) * knob * 0.19, z));
    } else {
      // обычная кнопка выступает из рамки; плоская (со сканером отпечатка) — почти вровень с ней
      const out = kind === "flat" ? 0.012 : 0.04;
      group.add(mesh(plate(0.1, length, 0.05, depth, 0.03, 5), frameMaterial, x + Math.sign(x) * (out - 0.045), y, z));
    }
  });

  // Детали на гранях: разъём, динамики, микрофоны, лоток SIM. Каждая грань — одна тонкая накладка с рисунком
  // углублений (см. edgePlate): лишней геометрии почти нет, а тени и блики в углублениях настоящие
  const flat = railDepth - 0.16; // плоская часть грани между фасками
  const sliders = (side) => (spec.buttons || []).filter(([where, , , kind]) => where === side && kind === "slider").map(([, y, length, , shift = 0]) => ["recess", y, length, shift]);
  [
    ["bottom", spec.bottom, W, H],
    ["top", spec.top, W, H],
    ["left", [...(spec.left || []), ...sliders("left")], H, W],
    ["right", [...(spec.right || []), ...sliders("right")], H, W],
  ].forEach(([side, items, size, other]) => {
    if (!items || !items.length) return;
    const straight = (size - inset) / 2 - spec.r; // половина прямой части грани
    // накладка закрывает прямую часть с небольшим запасом, а если детали стоят дальше — заходит за ними на скругление
    const half = Math.min(Math.max(straight + 0.15, ...items.map((item) => edgeReach(item) + 0.12)), straight + spec.r * 0.85);
    // гнездо наушников шире плоской части грани, поэтому под него накладка берётся почти во всю толщину рамки
    const across = items.some(([kind]) => kind === "jack") ? railDepth - 0.04 : flat;
    group.add(edgePlate(side, items, half * 2, across, (other - inset) / 2, railZ, spec, straight, spec.r));
  });

  // складной OnePlus Open: щель между двумя половинками и корешок петли
  if (spec.fold) {
    group.add(mesh(plate(W - 0.04, H - 0.04, spec.r, 0.04, 0.01), steel, 0, 0, railZ - 0.1));
    group.add(mesh(plate(0.34, H - 1.1, 0.17, railDepth * 0.86, 0.08), frameMaterial, W / 2 - 0.13, 0, railZ));
  }

  // выдвижная фронтальная камера OnePlus 7 Pro: блок выезжает из верхнего торца, на его лицевой стороне
  // официальный снимок самой камеры
  if (shots.popup) {
    const popup = new THREE.Group();
    const depth = D * 0.6;
    popup.add(mesh(plate(1.08, 1.5, 0.1, depth, 0.04), frameMaterial));
    const lens = mesh(new THREE.PlaneGeometry(1.0, 0.67), shots.popup, 0, 0.75 - 0.335 - 0.02, -depth / 2 - 0.002);
    lens.rotation.y = Math.PI;
    popup.add(lens);
    popup.position.set(W * 0.287, H / 2 - 0.78, railZ);
    popup.userData = { hidden: H / 2 - 0.78, shown: H / 2 - 0.06 };
    group.add(popup);
    group.userData.popup = popup;
  }
  return group;
}

// Часы рисуются шрифтом страницы: ждём его, но не дольше двух секунд
const fontReady = document.fonts
  ? Promise.race([document.fonts.load("500 60px Onest"), new Promise((resolve) => setTimeout(resolve, 2000))])
  : Promise.resolve();

// Собирает телефон по ключу модели: загружает его снимки и готовит материалы.
// Возвращает модель для сцены и функцию repaint, которая перерисовывает экран с текущим временем
export async function createPhone(key) {
  const spec = PHONES[key];
  const W = spec.w / 10;
  const H = spec.h / 10;
  const [backImage, frontImage, popupImage] = await Promise.all([
    loadImage(spec.back.src),
    loadImage(spec.front.src),
    spec.popup ? loadImage(spec.popup.src) : null,
    fontReady,
  ]);

  // крышка: углы крышки (см от центра) → точки снимка
  const map = new THREE.Texture(fitted(backImage, 1280));
  map.colorSpace = THREE.SRGBColorSpace;
  map.premultiplyAlpha = true;
  map.anisotropy = 8;
  map.needsUpdate = true;
  const [imageW, imageH] = spec.back.size;
  const [x, y, w, h] = spec.back.rect || [];
  const corners = spec.back.quad || [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const matrix = homography(
    [[-W / 2, H / 2], [W / 2, H / 2], [W / 2, -H / 2], [-W / 2, -H / 2]],
    corners.map(([px, py]) => [px / imageW, 1 - py / imageH])
  );
  const fill = spec.back.hiddenFrom
    ? new THREE.Vector3(spec.back.hiddenFrom / imageW, (x + w * 0.982) / imageW, (x + x + w) / imageW)
    : new THREE.Vector3(9, 9, 0);
  const bridge = spec.back.bridge ? new THREE.Vector2(1 - spec.back.bridge[0] / imageH, 1 - spec.back.bridge[1] / imageH) : new THREE.Vector2(-1, -2);

  // экран: снимок телефона спереди на своём холсте, чтобы поверх можно было рисовать часы
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = Math.round((640 * H) / W);
  const screen = canvas.getContext("2d");
  const frontMap = new THREE.CanvasTexture(canvas);
  frontMap.colorSpace = THREE.SRGBColorSpace;
  frontMap.anisotropy = 8;

  let popup = null;
  if (popupImage) {
    const [px, py, pw, ph] = spec.popup.rect;
    const popupMap = texture(pw, ph, (ctx) => ctx.drawImage(popupImage, px, py, pw, ph, 0, 0, pw, ph));
    popup = new THREE.MeshBasicMaterial({ map: popupMap, toneMapped: false });
  }

  const model = buildPhone(spec, {
    back: backMaterial(map, matrix, fill, bridge, spec.frame),
    front: new THREE.MeshBasicMaterial({ map: fit(frontMap, W, H), toneMapped: false }),
    popup,
  });
  const repaint = () => {
    paintScreen(screen, frontImage, spec.front);
    frontMap.needsUpdate = true;
  };
  repaint();
  return { spec, model, repaint };
}

// Передышка между тяжёлыми шагами сборки: браузер успевает нарисовать кадры, и страница не замирает надолго
export const breathe = () => new Promise((resolve) => (window.requestIdleCallback ? requestIdleCallback(() => resolve(), { timeout: 300 }) : setTimeout(resolve, 30)));

// Раз в минуту, ровно на смене минуты, вызывает переданную функцию: по ней перерисовывают часы
export function everyMinute(callback) {
  const wait = () => 60000 - (Date.now() % 60000) + 40;
  const tick = () => {
    callback();
    setTimeout(tick, wait());
  };
  setTimeout(tick, wait());
}
