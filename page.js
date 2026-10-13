// ===== Страница модели =====
// Все тексты, цифры и картинки берутся из data.js. Здесь — сборка страницы и «сцены»:
// экраны, которые прилипают к окну и меняются, пока страницу листают.
// Файл общий для всех моделей. У страницы может не быть части разделов (поворота по кадрам, разбора камеры),
// а свои особые сцены она добавляет через window.SCENE_KINDS — так делает one.js для OnePlus One.

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (reducedMotion) root.classList.add("no-motion");

// Какую модель показываем: ключ стоит на самой странице (<body data-phone="one">) или в адресе (phone.html?m=15).
// Если ключа нет или он неизвестен — OnePlus 15
const phoneKey = document.body.dataset.phone || new URLSearchParams(location.search).get("m");
const phone = window.PHONES[phoneKey] || window.PHONES["15"];
const asset = (name) => phone.folder + name;

// ----- Первый экран -----
document.title = `${phone.name} — обзор модели`;
$("#brandName").textContent = phone.name;
$(".footer-brand").textContent = phone.name;
$("#heroKicker").textContent = phone.kicker;
$("#heroName").textContent = phone.name;
$("#heroLead").textContent = phone.lead;
$("#heroWord").textContent = phone.word;
$("#specsTitle").textContent = `${phone.name}: главное`;
phone.facts.forEach(([value, label]) => {
  const item = make("li");
  item.append(make("b", "", value), make("span", "", label));
  $("#heroFacts").appendChild(item);
});

// ----- Меню на телефоне -----
// На узком экране ссылки шапки не помещаются: вместо них кнопка, которая открывает те же ссылки списком на весь экран.
// Закрывается той же кнопкой, выбором раздела или клавишей Esc
const menuButton = make("button", "menu-button");
menuButton.type = "button";
menuButton.setAttribute("aria-controls", "menu");
menuButton.append(make("i"), make("i"));
const menu = make("nav", "menu");
menu.id = "menu";
menu.setAttribute("aria-label", "Разделы страницы");
// в нём ссылки шапки на другие страницы («Все модели») и все разделы из боковой навигации
[...$$(".bar-nav a").filter((link) => !link.getAttribute("href").startsWith("#")), ...$$("#rail a")].forEach((link, index) => {
  const item = make("a", "", link.textContent.trim());
  item.href = link.getAttribute("href");
  item.style.setProperty("--i", index);
  menu.appendChild(item);
});
$("#bar").appendChild(menuButton);
$("#bar").after(menu);
function setMenu(open) {
  root.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", open);
  menuButton.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню разделов");
  menu.inert = !open; // закрытое меню не ловит ни нажатия, ни клавишу Tab
  root.style.overflow = open ? "hidden" : ""; // пока меню открыто, страница под ним не листается
}
setMenu(false);
menuButton.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
menu.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !root.classList.contains("menu-open")) return;
  setMenu(false);
  menuButton.focus();
});
// окно стало широким — кнопки больше нет, меню закрывается само
window.matchMedia("(max-width: 900px), (orientation: landscape) and (max-height: 480px)").addEventListener("change", (event) => {
  if (!event.matches) setMenu(false);
});

// ----- Дизайн: подписи к шагам поворота. Раздел есть не у каждой модели; сам телефон в нём рисует файл страницы -----
const spinWord = $("#spinWord");
const spinGlow = $("#spinGlow");
if ($("#spinSteps")) {
  $("#spinTitle").textContent = phone.spinTitle;
  phone.spinSteps.forEach(([value, text]) => {
    const item = make("li");
    item.append(make("b", "", value), make("span", "", text));
    $("#spinSteps").appendChild(item);
  });
}

// ----- Живой телефон на первом экране -----
// Его рисует свой файл страницы: hero-live.js у OnePlus 12 и 15, seven-hero.js у OnePlus 7 Pro. Через window.HERO
// этот файл сообщает ему, сколько первого экрана пролистано, куда наклонён телефон и какой выбран цвет.
// Кнопки цвета есть только у модели с несколькими расцветками. Стоять они могут в нескольких местах страницы
// (у OnePlus 15 — на первом экране и в разделе «Дизайн»): выглядят одинаково и переключают один и тот же цвет
if ($("#heroCanvas")) window.HERO = { p: 0, tiltX: 0, tiltY: 0, color: phone.colors ? phone.colors[0].key : "" };
const colorBoxes = $$(".hero-colors");
colorBoxes.forEach((box) => {
  phone.colors.forEach((color) => {
    const button = make("button", "hero-color");
    button.type = "button";
    button.dataset.key = color.key;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", `${color.name}, ${color.label.toLowerCase()}`);
    const dot = make("i");
    dot.style.background = color.dot;
    button.appendChild(dot);
    button.addEventListener("click", () => setColor(color));
    box.appendChild(button);
  });
  box.appendChild(make("span", "hero-color-name"));
});

function setColor(color) {
  if (spinWord) {
    spinWord.textContent = color.name;
    spinGlow.style.setProperty("--glow", color.glow);
    fitWords(); // у названий цветов разная длина
  }
  $$(".hero-color").forEach((button) => button.setAttribute("aria-checked", button.dataset.key === color.key));
  $$(".hero-color-name").forEach((label) => (label.textContent = color.name));
  if (colorBoxes.length) {
    root.style.setProperty("--tone", color.glow); // свечение первого экрана подстраивается под цвет корпуса
    window.HERO.color = color.key;
    window.dispatchEvent(new Event("phonecolor"));
  }
}if (phone.colors) setColor(phone.colors[0]);

// ----- Экраны с официальными кадрами -----
(phone.shots || []).forEach((shot) => {
  const scene = make("section", "scene scene-shot");
  scene.id = shot.id;
  scene.dataset.scene = "shot";
  const pin = make("div", "pin");
  const image = make("img", "shot-image");
  image.src = asset(shot.image);
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  const copy = make("div", "shot-copy");
  const stats = make("ul", "stats");
  shot.stats.forEach(([value, unit]) => {
    const item = make("li");
    item.append(make("b", "", value), make("span", "", unit));
    stats.appendChild(item);
  });
  copy.append(make("p", "kicker", shot.kicker), make("h2", "", shot.title), make("p", "shot-text", shot.text), stats);
  // огромное слово проезжает поверх кадра, пока экран листают
  pin.append(image, make("div", "shot-word", shot.word), make("div", "shot-shade"), copy);
  scene.appendChild(pin);
  // обычно кадры идут подряд в блоке #shots; slot — другой блок страницы, если кадр должен стоять отдельно
  $(shot.slot ? `#${shot.slot}` : "#shots").appendChild(scene);
  // объёмный разбор камеры идёт сразу после кадра с камерой
  if (shot.id === "camera" && $("#teardown")) $("#shots").appendChild($("#teardown"));
});

// ----- Объёмный разбор камеры: тексты и список слоёв. Саму модель рисует teardown3d.js -----
// Через window.TEARDOWN этот файл сообщает ему, сколько сцены пролистано и видна ли она
if (phone.teardown) {
  window.TEARDOWN = { p: 0, near: false, parts: phone.teardown.parts };
  $("#teardownTitle").textContent = phone.teardown.title;
  $("#teardownText").textContent = phone.teardown.text;
  Object.values(phone.teardown.parts).forEach(([title, note]) => {
    const item = make("li");
    item.append(make("b", "", title), make("span", "", note));
    $("#legend").appendChild(item);
  });
}

// ----- Цифры -----
// size («big» или «wide») делает плитку крупнее остальных, note — строчка-пояснение под подписью
phone.specs.forEach(([value, unit, label, size, note]) => {
  const tile = make("div", `spec reveal${size ? ` is-${size}` : ""}`);
  const number = make("b", "", value);
  if (unit) number.appendChild(make("i", "", unit));
  tile.append(number, make("span", "", label));
  if (note) tile.appendChild(make("em", "", note));
  $("#specGrid").appendChild(tile);
});

// ----- Сравнение: в каждой строке три полоски, длина — относительно самого большого значения в строке -----
const spaced = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const versusTable = $("#versusTable");

// Счёт побед: сколько строк выиграл каждый телефон. Он стоит над таблицей и остаётся на виду, пока её листают
const wins = phone.versus.rivals.map((_, index) => phone.versus.rows.filter((row) => row.best === index).length);
const mostWins = Math.max(...wins);
const scoreBox = $("#score");
scoreBox.appendChild(make("p", "score-note", "Счёт побед"));
phone.versus.rivals.forEach((name, index) => {
  const card = make("div", `score-card${wins[index] === mostWins ? " is-lead" : ""}`);
  card.append(make("span", "", name), make("b", "", String(wins[index])));
  scoreBox.appendChild(card);
});

// Блоки таблицы: «Камера», «Экран» и так далее. В каждой строке победитель — золотая плашка
let versusGroup = null;
let rowIndex = 0;
phone.versus.rows.forEach((row) => {
  if (row.group) {
    versusGroup = make("div", "vgroup reveal");
    const title = make("h3");
    title.append(make("i", "", String($$(".vgroup", versusTable).length + 1).padStart(2, "0")), row.group);
    versusGroup.appendChild(title);
    versusTable.appendChild(versusGroup);
    rowIndex = 0;
    return;
  }
  const line = make("div", `versus-row${row.text ? " is-text" : ""}`);
  line.style.setProperty("--i", rowIndex++);
  line.appendChild(make("span", "versus-label", row.label));
  const top = row.values ? Math.max(...row.values) : 0;
  (row.text || row.values).forEach((value, index) => {
    const cell = make("div", `versus-cell${index === row.best ? " is-best" : ""}`);
    cell.dataset.name = phone.versus.rivals[index]; // на узком экране имя телефона пишется в самой ячейке
    if (row.text) {
      cell.appendChild(make("b", "", value));
    } else {
      const bar = make("i");
      bar.style.setProperty("--fill", (value / top).toFixed(3));
      cell.append(make("b", "", row.unit === "$" ? `$${spaced(value)}` : `${spaced(value)} ${row.unit}`), bar);
    }
    line.appendChild(cell);
  });
  versusGroup.appendChild(line);
});

// объёмная камера рисуется, только пока её экран рядом с окном
if (phone.teardown) new IntersectionObserver((entries) => (window.TEARDOWN.near = entries[0].isIntersecting), { rootMargin: "20% 0px" }).observe($("#teardown"));

// ----- Боковая навигация: подсвечиваем раздел, который сейчас на экране -----
const railLinks = $$("#rail a");
const railObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      railLinks.forEach((link) => link.classList.toggle("is-on", link.getAttribute("href") === `#${entry.target.id}`));
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
railLinks.forEach((link) => railObserver.observe($(link.getAttribute("href"))));
// пока первый экран прилип к окну, навигация спрятана
new IntersectionObserver((entries) => $("#rail").classList.toggle("is-shown", !entries[0].isIntersecting), { threshold: 0.4 }).observe($(".scene-hero .pin"));

// ----- Цифры набегают от нуля, когда плитка появляется на экране -----
function countUp(element) {
  const final = element.firstChild.textContent;
  const match = final.match(/^(\d+)(,\d+)?$/); // «7300» или «6,78»; «3×50» и «IP69K» не трогаем
  if (!match || reducedMotion) return;
  const target = parseFloat(final.replace(",", "."));
  const digits = match[2] ? match[2].length - 1 : 0;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / 1300, 1);
    const value = target * (1 - Math.pow(1 - progress, 3));
    element.firstChild.textContent = progress < 1 ? value.toFixed(digits).replace(".", ",") : final;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ----- Появление блоков при прокрутке -----
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
      if (entry.target.classList.contains("spec")) countUp($("b", entry.target));
    });
  },
  { threshold: 0.2 }
);
$$(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${(index % 4) * 70}ms`;
  revealObserver.observe(element);
});

// ===== Сцены =====
// Для каждой сцены считаем два числа: enter — насколько она въехала на экран снизу (0..1),
// p — сколько её прокрутки пройдено, пока она прилипла (0..1). По ним двигаются слои.
const bar = $("#bar");
const heroPhone = $("#heroPhone");
const heroCopy = $("#heroCopy");
const heroAfter = $("#heroAfter");
const heroWord = $("#heroWord");

const scenes = $$(".scene").map((element) => ({
  element,
  kind: element.dataset.scene,
  image: $(".shot-image", element),
  word: $(".shot-word", element),
  copy: $(".shot-copy", element),
  stats: $$(".stats li", element),
  top: 0,
  height: 0,
}));

// Высота экрана сцены. Берётся не у окна, а у самого «прилипающего» экрана (.pin): на телефоне он считается от видимой
// области и не меняется, когда браузер прячет или показывает свои панели. Высота окна в этот момент меняется,
// и сцены, посчитанные от неё, дёргались бы
const pinSample = $(".pin");
let viewport = window.innerHeight;
let shotShift = 0; // на широком экране кадр сдвинут вправо, чтобы слева осталось место под текст
function measure() {
  // без анимаций сцены не прилипают и могут быть выше экрана — там мерка не годится
  viewport = (!reducedMotion && pinSample && pinSample.offsetHeight) || window.innerHeight;
  shotShift = window.STACKED.matches ? 0 : 12;
  fitWords();
  fitCopies();
  window.dispatchEvent(new Event("scenes:fit")); // сценам со своим расчётом размеров (схема камеры 7 Pro) пора пересчитаться
  for (const scene of scenes) {
    scene.top = scene.element.offsetTop;
    scene.height = scene.element.offsetHeight;
  }
}

// Крупные надписи за картинками (слова и цифры во весь экран). На компьютере они проезжают через экран, на телефоне
// стоят на месте, и каждая должна целиком помещаться в экран. Надписи разной длины, поэтому размер букв подбирается
// измерением: стили задают, сколько места надписи отведено (max-width, а у вертикальной — max-height), и если она
// длиннее, буквы уменьшаются ровно настолько, чтобы она вошла. На компьютере функция ничего не меняет
function fitWords() {
  for (const word of $$(".bigword, .shot-word, .spin-word, .plate-word, .cell-word")) {
    word.style.fontSize = "";
    if (!window.STACKED.matches) continue;
    const style = getComputedStyle(word);
    const upright = style.writingMode.startsWith("vertical");
    const room = parseFloat(upright ? style.maxHeight : style.maxWidth);
    const long = upright ? word.scrollHeight : word.scrollWidth;
    if (room > 0 && long > room) word.style.fontSize = `${((parseFloat(style.fontSize) * room) / long).toFixed(1)}px`;
  }
}

// На телефоне (раскладка «в столбик») текст и картинка сцены делят экран по высоте. Сколько места занимает текст,
// зависит от ширины экрана и числа строк, поэтому его высота измеряется и передаётся стилям числом --copy (в точках).
// По нему картинка получает ровно то место, что осталось от текста, и не налезает на него ни на каком телефоне.
// Если текстов в сцене несколько и они сменяют друг друга на одном месте, берётся самый высокий. Подписи шагов,
// которые на телефоне висят под заголовком по одной, прибавляются к его высоте
const lying = window.matchMedia("(orientation: landscape) and (max-height: 480px)");
function fitCopies() {
  for (const scene of scenes) {
    let tall = 0;
    let hang = 0;
    for (const block of $$(".hero-copy, .hero-after, .shot-copy, .spin-copy, .teardown-copy, .side-copy, .strip-head, .model-notes li", scene.element)) {
      let height = block.offsetHeight;
      const steps = $(".steps", block);
      // подписи шагов висят под текстом: их высота (--hang) нужна стилям, чтобы поставить весь текст по центру
      if (steps && getComputedStyle(steps).position === "absolute") {
        hang = 10 + Math.max(0, ...$$("li", steps).map((item) => item.offsetHeight));
        height += hang;
      }
      tall = Math.max(tall, height);
    }
    if (tall) scene.element.style.setProperty("--copy", `${tall}px`);
    // Телефон боком: текст стоит сбоку от картинки, по центру места под шапкой. Если он выше этого места,
    // он слегка уменьшается (число --fit), чтобы не уходить под шапку и за нижний край
    const space = viewport - 72;
    scene.element.style.setProperty("--fit", lying.matches && tall > space ? Math.max(space / tall, 0.66).toFixed(3) : "1");
    scene.element.style.setProperty("--hang", `${hang}px`);
  }
}

// Курсор слегка наклоняет телефон на первом экране
let pointerX = 0;
let pointerY = 0;
let tiltX = 0;
let tiltY = 0;

const paint = {
  hero(p) {
    // живой объёмный телефон поворачивает и наклоняет свой файл страницы: ему передаём числа, а рамку только сдвигаем.
    // Он остаётся на экране почти до конца сцены, пока разворачивается экраном
    const live = heroPhone.classList.contains("is-live");
    if (live) Object.assign(window.HERO, { p, tiltX, tiltY });
    const away = live ? ease((p - 0.8) / 0.2) : ease((p - 0.35) / 0.6);
    heroPhone.style.transform = live
      ? `translate3d(0, 0, 0) scale(${(1 + p * 0.03).toFixed(3)})`
      : `translate3d(${(tiltX * -14).toFixed(1)}px, calc(var(--vh) * ${(p * -16).toFixed(2)}), 0) ` +
        `rotateY(${(tiltX * 7).toFixed(2)}deg) rotateX(${(tiltY * -5).toFixed(2)}deg) scale(${(1 + p * 0.16).toFixed(3)})`;
    heroPhone.style.opacity = (1 - away).toFixed(3);
    heroCopy.style.opacity = (1 - ease(p / (live ? 0.24 : 0.4))).toFixed(3);
    // когда живой телефон развернулся экраном, на месте первого текста появляется второй — про экран
    if (heroAfter) {
      const shown = ease((p - 0.46) / 0.16) * (1 - away);
      heroAfter.style.opacity = shown.toFixed(3);
      heroAfter.style.transform = `translate3d(0, ${((1 - ease((p - 0.46) / 0.16)) * 40).toFixed(1)}px, 0)`;
    }
    heroCopy.style.transform = `translate3d(0, ${(p * -90).toFixed(1)}px, 0)`;
    heroWord.style.transform = `translate3d(${(p * -16 + tiltX * 1.2).toFixed(2)}vw, 0, 0) scale(${(1 + p * 0.3).toFixed(3)})`;
    heroWord.style.opacity = (1 - away).toFixed(3);
  },

  // объёмную камеру двигает teardown3d.js: ему достаточно знать, сколько пролистано
  teardown(p) {
    window.TEARDOWN.p = p;
  },

  shot(p, enter, scene) {
    const settle = ease(enter * 0.6 + p * 0.4);
    scene.image.style.transform = `translate3d(${shotShift}vw, 0, 0) scale(${(1.34 - settle * 0.2).toFixed(3)})`;
    scene.word.style.transform = `translate3d(${(52 - (enter * 0.4 + p * 0.6) * 120).toFixed(2)}vw, 0, 0)`;
    const show = ease((p - 0.06) / 0.22) * (1 - ease((p - 0.88) / 0.12));
    scene.copy.style.opacity = show.toFixed(3);
    scene.copy.style.transform = `translate3d(0, ${((1 - ease((p - 0.06) / 0.22)) * 46).toFixed(1)}px, 0)`;
    scene.stats.forEach((item, index) => {
      const on = ease((p - 0.2 - index * 0.06) / 0.16);
      item.style.opacity = on.toFixed(3);
      item.style.transform = `translate3d(0, ${((1 - on) * 24).toFixed(1)}px, 0)`;
    });
  },
};
// особые сцены конкретной модели: её файл кладёт их в window.SCENE_KINDS до загрузки этого файла.
// Каждая получает те же числа p и enter и саму сцену; tools — общие помощники
Object.assign(paint, window.SCENE_KINDS || {});
window.SCENE_TOOLS = { clamp, ease, $, $$ };

let smoothY = window.scrollY;
let acted = false; // страницу уже листали или трогали сами
["wheel", "touchstart", "keydown", "pointerdown"].forEach((type) => window.addEventListener(type, () => (acted = true), { passive: true, capture: true, once: true }));
let running = false;
let lastTime = 0;

function frame(now) {
  const step = Math.min(now - lastTime, 60);
  lastTime = now;
  // страница не прыгает за колёсиком, а плавно догоняет его: так всё движется без рывков
  const gap = window.scrollY - smoothY;
  // Пока страницу не трогали, сглаживания нет: если прокрутку вернул на место сам браузер (страницу обновили или
  // вернулись на неё), сцены сразу встают как были. Иначе всё проигрывалось бы с начала в те самые доли секунды,
  // когда страница ещё грузится, — рывками
  smoothY = !acted || Math.abs(gap) < 0.4 ? window.scrollY : smoothY + gap * (1 - Math.exp(-step / 140));
  tiltX += (pointerX - tiltX) * 0.08;
  tiltY += (pointerY - tiltY) * 0.08;

  for (const scene of scenes) {
    const enter = clamp((smoothY + viewport - scene.top) / viewport, 0, 1);
    const left = scene.top + scene.height - smoothY;
    if (enter <= 0 || left < -viewport * 0.2) continue; // сцена далеко за экраном — не трогаем
    const p = clamp((smoothY - scene.top) / Math.max(scene.height - viewport, 1), 0, 1);
    paint[scene.kind](p, enter, scene);
  }

  const settled = smoothY === window.scrollY && Math.abs(pointerX - tiltX) < 0.002 && Math.abs(pointerY - tiltY) < 0.002;
  if (settled) {
    running = false;
    return;
  }
  requestAnimationFrame(frame);
}

function wake() {
  bar.classList.toggle("is-scrolled", window.scrollY > 20);
  if (running || reducedMotion) return;
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("scroll", wake, { passive: true });
window.addEventListener("resize", () => {
  measure();
  wake();
});
if (canHover && !reducedMotion) {
  window.addEventListener(
    "pointermove",
    (event) => {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
      wake();
    },
    { passive: true }
  );
}

measure();
// высота страницы меняется, когда догружаются шрифты и картинки: пересчитываем места сцен
window.addEventListener("load", () => {
  measure();
  wake();
});
if (document.fonts) document.fonts.ready.then(measure);
wake();
