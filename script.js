const scenes = [...document.querySelectorAll(".scene")];

let currentScene = 0;
let currentQuestion = 0;
let score = 0;
let answered = false;
let isTransitioning = false;

const $ = id => document.getElementById(id);

// ======================================
// СИСТЕМА ЗВУКА
// ======================================

const soundFiles = {
  intro: "assets/sounds/intro.mp3",
  transition: "assets/sounds/transition.mp3",
  correct: "assets/sounds/correct.mp3",
  wrong: "assets/sounds/wrong.mp3",
  birthday: "assets/sounds/background.mp3",
  end: "assets/sounds/end.mp3"
};

let soundEnabled = true;
let masterVolume = 0.45;

const effects = {};
const activeEffects = new Set();

let birthdayMusic = null;

// Создаём аудио для каждого эффекта
Object.entries(soundFiles).forEach(([name, path]) => {
  const audio = new Audio(path);

  audio.preload = "none";
  audio.volume = masterVolume;

  audio.addEventListener("error", () => {
    // Отсутствующие MP3 не мешают работе сайта
    console.info(`Звуковой файл пока не добавлен: ${path}`);
  });

  effects[name] = audio;
});

// Отдельный объект для фоновой музыки
birthdayMusic = effects.birthday;
birthdayMusic.loop = true;

// Воспроизведение короткого эффекта
function playEffect(name) {
  if (!soundEnabled || !effects[name]) return;

  const audio = effects[name];

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = masterVolume;

    activeEffects.add(audio);

    audio.onended = () => {
      activeEffects.delete(audio);
    };

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        activeEffects.delete(audio);
      });
    }
  } catch (error) {
    console.info("Не удалось воспроизвести звук:", name);
  }
}

// Запуск праздничной музыки
function startBirthdayMusic() {
  if (!soundEnabled || !birthdayMusic) return;

  birthdayMusic.volume = masterVolume;

  if (!birthdayMusic.paused) return;

  birthdayMusic.play().catch(error => {
    console.info("Не удалось запустить музыку:", error);
  });
}

// Остановка фоновой музыки
function stopBirthdayMusic() {
  if (!birthdayMusic) return;

  birthdayMusic.pause();
  birthdayMusic.currentTime = 0;
}

// Переключатель звука
function updateSoundButton() {
  $("soundIcon").textContent = soundEnabled ? "♪" : "×";
  $("soundLabel").textContent = soundEnabled ? "SOUND ON" : "SOUND OFF";

  $("soundToggle").classList.toggle("sound-disabled", !soundEnabled);

  $("soundToggle").setAttribute(
    "aria-label",
    soundEnabled ? "Выключить звук" : "Включить звук"
  );
}

$("soundToggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  if (!soundEnabled) {
    // Останавливаем всю музыку и эффекты
    Object.values(effects).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    activeEffects.clear();
  } else {
    // Если пользователь находится на поздравлении,
    // включаем фоновую музыку снова
    if (currentScene === 5 && !$("finaleScreen").classList.contains("show")) {
      startBirthdayMusic();
    }
  }

  updateSoundButton();
});

// Регулятор громкости
$("volumeControl").addEventListener("input", event => {
  masterVolume = Number(event.target.value) / 100;

  Object.values(effects).forEach(audio => {
    audio.volume = masterVolume;
  });
});

// Начальное состояние панели
updateSoundButton();

// ======================================
// ВОПРОСЫ ВИКТОРИНЫ
// ======================================

const questions = [
  {
    q: "Когда родился Даулет?",
    a: ["17 ноября 1977", "17 октября 1977", "7 ноября 1978", "27 ноября 1977"],
    correct: 0,
    info: "17 ноября 1977 года!"
  },
  {
    q: "Когда родилась Алтынай?",
    a: ["14 июня 1980", "14 июля 1980", "4 июля 1981", "24 июля 1980"],
    correct: 1,
    info: "14 июля 1980 года!"
  },
  {
    q: "Когда состоялась свадьба?",
    a: ["13 апреля 2013", "13 мая 2013", "3 апреля 2012", "23 апреля 2013"],
    correct: 0,
    info: "13 апреля 2013 года!"
  },
  {
    q: "Когда родился сын?",
    a: ["28 августа 2009", "18 сентября 2009", "28 сентября 2009", "28 сентября 2010"],
    correct: 2,
    info: "28 сентября 2009 года!"
  },
  {
    q: "Где впервые познакомились Даулет и Алтынай?",
    a: ["В парке", "В университете", "В кафе", "На празднике"],
    correct: 0,
    info: "В парке началась ваша история!"
  },
  {
    q: "Где прошло первое свидание?",
    a: ["В ресторане", "В машине", "В кино", "На прогулке"],
    correct: 1,
    info: "Первое свидание было в машине!"
  },
  {
    q: "Где папа сделал маме предложение?",
    a: ["На набережной", "На крыше в Астане", "В ресторане", "В парке"],
    correct: 1,
    info: "На крыше в Астане! Настоящий киношный момент."
  },
  {
    q: "Сколько лет исполняется папе сегодня?",
    a: ["47", "48", "49", "50"],
    correct: 2,
    info: "49 лет! С днём рождения!"
  },
  {
    q: "Какой самый важный подарок для папы?",
    a: ["Новый телевизор", "Машина", "Любовь своей семьи", "Победа в игре"],
    correct: 2,
    info: "Конечно, любовь семьи! ❤️"
  }
];

// ======================================
// ФОТОГРАФИИ
// ======================================

function checkPhotos() {
  document.querySelectorAll(".photo-wrap img").forEach(img => {
    const wrapper = img.closest(".photo-wrap");
    const missing = wrapper.querySelector(".photo-missing");

    img.addEventListener("error", () => {
      wrapper.classList.add("image-missing");
      missing.classList.remove("hidden");
    });

    img.addEventListener("load", () => {
      wrapper.classList.remove("image-missing");
      missing.classList.add("hidden");
    });

    if (img.complete && img.naturalWidth === 0) {
      wrapper.classList.add("image-missing");
      missing.classList.remove("hidden");
    }
  });
}

checkPhotos();

// ======================================
// ПЕРЕХОДЫ МЕЖДУ СЦЕНАМИ
// ======================================

function showScene(index) {
  if (index < 0 || index >= scenes.length || isTransitioning) return;
  if (index === currentScene) return;

  isTransitioning = true;

  const oldScene = scenes[currentScene];
  const newScene = scenes[index];

  oldScene.classList.add("leaving");

  // Звук перехода VHS
  playEffect("transition");

  $("flash").classList.remove("flash");
  void $("flash").offsetWidth;
  $("flash").classList.add("flash");

  setTimeout(() => {
    oldScene.classList.remove("active", "leaving");
    newScene.classList.add("active");

    currentScene = index;
    isTransitioning = false;

    updateNavigation();

    // При переходе к поздравлению включаем музыку
    if (currentScene === 5) {
      startBirthdayMusic();
    }

    if (currentScene === 4 && currentQuestion === 0 && !answered) {
      renderQuestion();
    }
  }, 180);
}

// ======================================
// НАВИГАЦИЯ
// ======================================

function updateNavigation() {
  $("sceneCounter").textContent =
    `${String(currentScene + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;

  $("progressTop").style.width =
    `${((currentScene + 1) / scenes.length) * 100}%`;

  const continueBtn = $("continueBtn");

  const quizFinished =
    currentScene === 4 &&
    !$("quizResult").classList.contains("hidden");

  const hideContinue =
    currentScene === 0 ||
    currentScene === 4 ||
    currentScene === 5;

  continueBtn.classList.toggle("hidden", hideContinue);

  if (quizFinished) {
    continueBtn.classList.remove("hidden");
    continueBtn.textContent = "К ПОЗДРАВЛЕНИЮ →";
  } else {
    continueBtn.textContent = "ПРОДОЛЖИТЬ →";
  }

  $("controls").classList.toggle(
    "hidden",
    currentScene === 0 || currentScene === 5
  );
}

// ======================================
// КНОПКИ
// ======================================

$("start").addEventListener("click", () => {
  playEffect("intro");
  startBirthdayMusic();
  showScene(1);
});

$("continueBtn").addEventListener("click", () => {
  if (currentScene === 4) {
    if (!$("quizResult").classList.contains("hidden")) {
      showScene(5);
    }
    return;
  }

  if (currentScene < 5) {
    showScene(currentScene + 1);
  }
});

// ======================================
// ЧАСЫ
// ======================================

function updateClock() {
  const now = new Date();

  $("clock").textContent =
    [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(value => String(value).padStart(2, "0"))
      .join(":");
}

setInterval(updateClock, 1000);
updateClock();

// ======================================
// ВИКТОРИНА
// ======================================

function renderQuestion() {
  const q = questions[currentQuestion];

  answered = false;

  $("questionCount").textContent =
    `QUESTION ${String(currentQuestion + 1).padStart(2, "0")} / ${questions.length}`;

  $("quizProgress").style.width =
    `${(currentQuestion / questions.length) * 100}%`;

  $("question").textContent = q.q;
  $("feedback").textContent = "";
  $("nextQuestion").classList.add("hidden");

  const answers = $("answers");
  answers.innerHTML = "";

  q.a.forEach((answer, index) => {
    const button = document.createElement("button");

    button.className = "answer";
    button.textContent = `${String.fromCharCode(65 + index)}. ${answer}`;

    button.addEventListener("click", () => selectAnswer(index, button));

    answers.appendChild(button);
  });
}

function selectAnswer(index, selectedButton) {
  if (answered) return;

  answered = true;

  const q = questions[currentQuestion];
  const buttons = [...$("answers").children];

  buttons.forEach((button, i) => {
    button.disabled = true;

    if (i === q.correct) {
      button.classList.add("correct");
    }
  });

  if (index === q.correct) {
    score++;
    $("feedback").textContent = `✓ ПРАВИЛЬНО! ${q.info}`;

    // Звук правильного ответа
    playEffect("correct");
  } else {
    selectedButton.classList.add("wrong");
    $("feedback").textContent = `НЕ СОВСЕМ! ${q.info}`;

    // Звук неправильного ответа
    playEffect("wrong");
  }

  $("quizProgress").style.width =
    `${((currentQuestion + 1) / questions.length) * 100}%`;

  $("nextQuestion").textContent =
    currentQuestion === questions.length - 1
      ? "УЗНАТЬ РЕЗУЛЬТАТ →"
      : "СЛЕДУЮЩИЙ ВОПРОС →";

  $("nextQuestion").classList.remove("hidden");
}

function nextQuizQuestion() {
  if (!answered) return;

  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    renderQuestion();
  } else {
    showQuizResult();
  }
}

function showQuizResult() {
  $("quizCard").classList.add("hidden");
  $("quizResult").classList.remove("hidden");

  $("resultNumber").textContent = `${score}/${questions.length}`;

  if (score === 9) {
    $("resultTitle").textContent = "СЕМЕЙНЫЙ ЧЕМПИОН!";
    $("resultText").textContent =
      "Идеальный результат! Ты отлично помнишь нашу историю. Но самое главное — впереди ещё много прекрасных воспоминаний.";
  } else if (score >= 6) {
    $("resultTitle").textContent = "ОТЛИЧНЫЙ РЕЗУЛЬТАТ!";
    $("resultText").textContent =
      "Ты прекрасно справился! Главное, что все эти воспоминания объединяют нашу семью.";
  } else {
    $("resultTitle").textContent = "ГЛАВНОЕ — НЕ БАЛЛЫ!";
    $("resultText").textContent =
      "Сегодня не экзамен, папа. Эта игра просто повод улыбнуться и вспомнить нашу историю. Мы тебя любим!";
  }

  updateNavigation();
}

$("nextQuestion").addEventListener("click", nextQuizQuestion);

// ======================================
// ПОВТОРНАЯ ИГРА
// ======================================

$("restartQuiz").addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;
  answered = false;

  $("quizCard").classList.remove("hidden");
  $("quizResult").classList.add("hidden");

  renderQuestion();
  updateNavigation();
});

// ======================================
// ПОСЛЕДНИЙ ЭКРАН
// ======================================

function finishMovie() {
  // Останавливаем праздничную музыку
  stopBirthdayMusic();

  // Звук остановки кассеты
  playEffect("end");

  $("finaleScreen").classList.add("show");
  $("controls").classList.add("hidden");
  $("progressTop").style.width = "100%";
}

$("finishBtn").addEventListener("click", finishMovie);

// ======================================
// ПОВТОРНЫЙ ПРОСМОТР
// ======================================

$("replayBtn").addEventListener("click", () => {
  // Останавливаем все звуки
  Object.values(effects).forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });

  activeEffects.clear();

  $("finaleScreen").classList.remove("show");

  currentScene = 0;
  currentQuestion = 0;
  score = 0;
  answered = false;
  isTransitioning = false;

  $("quizCard").classList.remove("hidden");
  $("quizResult").classList.add("hidden");

  scenes.forEach((scene, index) => {
    scene.classList.remove("active", "leaving");

    if (index === 0) {
      scene.classList.add("active");
    }
  });

  updateNavigation();
});

// ======================================
// НАЧАЛЬНОЕ СОСТОЯНИЕ
// ======================================

updateNavigation();