// ===== Главная страница: появление телефонов и подсказка «скоро» =====
// Сами телефоны рисует и разворачивает phones3d.js. Нажимается только телефон с названием (.unit-hit),
// плашка под ним — просто подпись. Чтобы открыть страницу модели, кнопку .unit-hit в index.html
// заменяют ссылкой, как у OnePlus 15.

const units = [...document.querySelectorAll(".unit")];
const toast = document.getElementById("toast");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Телефоны появляются по очереди
units.forEach((unit, index) => unit.style.setProperty("--order", index));
requestAnimationFrame(() => document.body.classList.add("is-loaded"));

// Модели без страницы: телефон качает «нет», внизу появляется подсказка
let toastTimer;
units.forEach((unit) => {
  if (!unit.dataset.soon) return;
  unit.querySelector(".unit-hit").addEventListener("click", () => {
    toast.textContent = `Страница ${unit.dataset.soon} скоро появится`;
    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-shown"), 2400);
    if (reducedMotion) return;
    unit.classList.remove("is-shaking");
    void unit.offsetWidth; // чтобы анимация запускалась при каждом нажатии
    unit.classList.add("is-shaking");
  });
});
