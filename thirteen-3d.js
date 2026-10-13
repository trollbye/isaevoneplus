// ===== OnePlus 13: настоящая объёмная модель телефона =====
// Модель, её материалы и текстуры взяты с официального сайта OnePlus (там она стоит в разделе «360°») и лежат
// в assets/13/model: scene-v1.gltf с геометрией, materials-white.json с материалами белой расцветки, texture/ с картинками.
// Здесь модель загружается, красится и ставится в позы: какая поза нужна, решает прокрутка первого экрана
// (число p приходит из thirteen.js через window.MODEL13). Ещё её можно крутить мышкой или пальцем.
// Кадр рисуется, только когда что-то изменилось: в покое картинка неподвижна и видеокарта отдыхает.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { attachSpin } from "./spin.js?v=2";

const FOLDER = "assets/13/model/";
const DECODER = "vendor/three-0.162.0/addons/libs/draco/gltf/"; // распаковщик сжатой геометрии
const stage = document.getElementById("modelStage");
const canvas = document.getElementById("modelCanvas");
const state = window.MODEL13;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

// Позы модели по ходу первого экрана. at — доля прокрутки, к которой модель должна встать в позу;
// yaw — поворот вокруг вертикали (0 — спинкой к зрителю, π — экраном), pitch — наклон на зрителя,
// size — крупность (1 — телефон занимает 4/5 высоты кадра), x и y — сдвиг в долях высоты кадра.
// Между соседними позами модель плавно переходит; одинаковые позы подряд — это остановка
const TURN = Math.PI;
const POSES = [
  { at: 0, yaw: 0.52, pitch: 0.06, size: 1, x: 0, y: 0 }, // первый экран: спинка вполоборота
  { at: 0.1, yaw: 0.52, pitch: 0.06, size: 1, x: 0, y: 0 },
  { at: 0.24, yaw: 0.3, pitch: 0.1, size: 1.9, x: 0.04, y: -0.4 }, // камера крупным планом
  { at: 0.4, yaw: 0.2, pitch: 0.1, size: 1.9, x: 0.04, y: -0.4 },
  { at: 0.54, yaw: -TURN / 2 - 0.06, pitch: 0, size: 1.04, x: 0, y: 0 }, // ребром: рамка и слайдер звука
  { at: 0.66, yaw: -TURN / 2 - 0.22, pitch: 0, size: 1.04, x: 0, y: 0 },
  { at: 0.8, yaw: -TURN + 0.42, pitch: 0.05, size: 1, x: 0, y: 0 }, // экран вполоборота
  { at: 1, yaw: -TURN + 0.3, pitch: 0.05, size: 1, x: 0, y: 0 },
];

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.toneMapping = THREE.NoToneMapping; // как на официальном сайте: цвета материалов идут на экран без обработки
const scene = new THREE.Scene();
// узкий угол обзора, как у длинного объектива: телефон не искажается по краям
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
const DISTANCE = 4.3;
camera.position.set(0, 0, DISTANCE);
const VIEW = 2 * DISTANCE * Math.tan((14 * Math.PI) / 180); // сколько единиц сцены помещается в кадр по высоте

// ----- Загрузка: геометрия, текстуры и свет окружения грузятся одновременно -----
const textureLoader = new THREE.TextureLoader().setPath(`${FOLDER}texture/`);
const hdrLoader = new RGBELoader().setPath(`${FOLDER}texture/`);
const modelLoader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(DECODER));
const loadImage = (url) => (url.endsWith(".hdr") ? hdrLoader : textureLoader).loadAsync(url);

const set = await (await fetch(`${FOLDER}materials-white.json`)).json();
const urls = [...new Set(set.textures.map((entry) => entry.url))];
const [gltf, environment, ...images] = await Promise.all([modelLoader.loadAsync(`${FOLDER}scene-v1.gltf`), loadImage("env.hdr"), ...urls.map(loadImage)]);
const byUrl = Object.fromEntries(urls.map((url, index) => [url, images[index]]));

// Настройки текстур записаны в том же файле, что и материалы: повтор, цветовое пространство, способ наложения.
// Одна картинка может быть нужна нескольким материалам — тогда они делят одну текстуру, как на официальном сайте
const textures = {};
for (const entry of set.textures) {
  const texture = byUrl[entry.url];
  for (const key of ["mapping", "channel", "rotation", "format", "type", "colorSpace", "minFilter", "magFilter", "anisotropy", "flipY", "generateMipmaps", "premultiplyAlpha", "unpackAlignment"]) {
    if (entry[key] !== undefined && entry[key] !== null) texture[key] = entry[key];
  }
  texture.repeat.fromArray(entry.repeat);
  texture.offset.fromArray(entry.offset);
  texture.center.fromArray(entry.center);
  [texture.wrapS, texture.wrapT] = entry.wrap;
  texture.needsUpdate = true;
  textures[entry.uuid] = texture;
}
environment.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = environment;

// материалы белой расцветки: у детали модели и у её материала в файле одно и то же имя
const materialLoader = new THREE.MaterialLoader();
materialLoader.setTextures(textures);
const materials = {};
for (const json of set.materials) materials[json.name] = materialLoader.parse(json);
gltf.scene.traverse((node) => {
  if (node.isMesh && materials[node.material.name]) node.material = materials[node.material.name];
});

// Модель ставится серединой в начало координат и приводится к высоте 1. Сама она не двигается:
// вокруг неё летает камера. Так блики на металле и стекле ложатся так же, как на официальном сайте,
// где свет окружения привязан к телефону, а не к зрителю
const box = new THREE.Box3().setFromObject(gltf.scene);
const center = box.getCenter(new THREE.Vector3());
const height = box.getSize(new THREE.Vector3()).y;
gltf.scene.position.sub(center);
const holder = new THREE.Group();
holder.add(gltf.scene);
holder.scale.setScalar(1 / height);
scene.add(holder);

// ----- Кручение мышкой или пальцем (spin.js) -----
// Сдвиг добавляется к позе. Когда страницу листают дальше, он плавно сходит на нет и модель возвращается в позу
// кнопка «Покрутить в 3D» стоит не в самой рамке модели (её низ на телефоне плавно гаснет), а рядом, в сцене
const spin = attachSpin(stage, { wake: () => wake(), tilt: 0.7, viewer: { host: stage.parentElement } });
spin.span = 16.29 / 0.8; // в кадр по высоте помещается телефон (16,29 см) и ещё четверть его высоты
let spunAt = 0; // доля прокрутки, на которой модель крутили рукой
stage.addEventListener("pointerdown", () => stage.classList.add("is-touched"), { once: true }); // подсказка «зажми и крути» больше не нужна
// холст подгоняется под свой размер на странице; на плотных экранах рисуем не больше чем в полтора раза крупнее,
// а большой холст — точка в точку, чтобы встроенной видеокарте было легко
function resize() {
  const frame = stage.getBoundingClientRect();
  if (!frame.width) return;
  const scale = Math.min(window.devicePixelRatio || 1, frame.width * frame.height > 900000 ? 1 : 1.5) * quality;
  renderer.setSize(Math.round(frame.width * scale), Math.round(frame.height * scale), false);
  camera.aspect = frame.width / frame.height;
  camera.updateProjectionMatrix();
  dirty = true;
}

// поза для текущей доли прокрутки: между двумя соседними из списка
function poseAt(p) {
  let next = POSES.findIndex((pose) => pose.at >= p);
  if (next <= 0) return POSES[next === 0 ? 0 : POSES.length - 1];
  const from = POSES[next - 1];
  const to = POSES[next];
  const t = ease((p - from.at) / (to.at - from.at));
  const mix = (key) => from[key] + (to[key] - from[key]) * t;
  return { yaw: mix("yaw"), pitch: mix("pitch"), size: mix("size"), x: mix("x"), y: mix("y") };
}

let dirty = true;
let near = true;
let running = false;
let lastP = -1;

// Слежение за плавностью. Если кадры идут медленно (слабый телефон), модель рисуется мельче — так видеокарте легче.
// Если не помогает и это, модель убирается и на её месте остаётся снимок: неподвижная картинка лучше дёрганой
let quality = 1; // во сколько раз уменьшена плотность точек
let paced = 0;
let pacedTime = 0;
let lastDraw = 0;
function pace(now) {
  const gap = now - lastDraw;
  lastDraw = now;
  if (gap > 250) return; // между кадрами был перерыв: модель стояла, это не медленный кадр
  paced += 1;
  pacedTime += gap;
  if (paced < 40) return;
  const average = pacedTime / paced;
  paced = pacedTime = 0;
  if (average > 28 && quality > 0.5) {
    quality = Math.max(quality * 0.8, 0.5);
    resize();
  } else if (average > 60 && !spin.view) {
    near = false;
    stage.classList.remove("is-live"); // снова виден снимок
    stage.classList.add("is-still");
  }
}

const turn = new THREE.Euler(0, 0, 0, "XYZ");
const look = new THREE.Quaternion();
function draw() {
  // в режиме просмотра (spin.js) позу задаёт он сам; приближает там угол обзора камеры, а не её расстояние —
  // иначе грань, повёрнутая к зрителю, оказалась бы у самого объектива
  const view = spin.view;
  const pose = view ? { yaw: view.yaw, pitch: view.pitch, size: 1, x: view.x, y: view.y } : state.pose || poseAt(state.p);
  const zoom = view ? view.zoom : 1;
  if (camera.zoom !== zoom) {
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }
  // Поза описана так, будто крутят сам телефон (в файле он стоит экраном к зрителю, отсюда добавка в пол-оборота).
  // Камера делает обратное: облетает неподвижную модель, подходит ближе вместо увеличения и смещается вместо сдвига
  turn.set(pose.pitch + (view ? 0 : spin.pitch), pose.yaw + (view ? 0 : spin.yaw) + Math.PI, 0);
  look.setFromEuler(turn).invert();
  camera.position
    .set(-pose.x * VIEW, -pose.y * VIEW, DISTANCE)
    .divideScalar(pose.size * (view ? 1 : spin.zoom) * 0.8 * VIEW)
    .applyQuaternion(look);
  camera.quaternion.copy(look);
  renderer.render(scene, camera);
}

function frame(now) {
  if (!near) {
    running = false;
    return;
  }
  // страницу листают дальше — то, что накрутили рукой, плавно возвращается
  if (spin.held) spunAt = state.p;
  else if (Math.abs(state.p - spunAt) > 0.004) spin.home();
  const spinning = spin.update(now);
  if (dirty || spinning || Math.abs(state.p - lastP) > 0.0003) {
    dirty = false;
    lastP = state.p;
    draw();
    pace(now);
  }
  requestAnimationFrame(frame);
}
function wake() {
  if (running || !near) return;
  running = true;
  requestAnimationFrame(frame);
}
state.redraw = () => {
  dirty = true;
  wake();
};

new IntersectionObserver(
  (entries) => {
    near = entries[0].isIntersecting;
    wake();
  },
  { rootMargin: "10% 0px" }
).observe(document.getElementById("model"));
window.addEventListener("resize", () => {
  resize();
  wake();
});

stage.classList.add("is-live"); // снимок-заглушка прячется, на его месте холст с моделью
resize();
wake();
