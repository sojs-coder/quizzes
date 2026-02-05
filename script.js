// --- STATE MANAGEMENT ---
let currentQuiz = [];
let currentAnswers = [];
let currentQuestionIndex = 0;
let score = 0;
let quizBanks = [];
let selectedBankKey = null;
let questionBank = [];
let allScores = localStorage.getItem("allScores")
  ? JSON.parse(localStorage.getItem("allScores"))
  : {};
let chartInstance = null;
let isAnswering = false;

// --- INITIALIZATION ---

async function init() {
  try {
    const response = await fetch("./banks.json");
    quizBanks = await response.json();
    showBankSelectionModal();
  } catch (error) {
    console.error("Failed to load banks.json:", error);
    alert("Failed to load quiz configuration. Please refresh the page.");
  }
}

function showBankSelectionModal() {
  const modal = document.getElementById("bank-selection-modal");
  const optionsContainer = document.getElementById("bank-options");
  optionsContainer.innerHTML = "";

  quizBanks.forEach((bank, index) => {
    const bankKey = bank.name;
    const scores = allScores[bankKey] || [];
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    const option = document.createElement("div");
    option.className = "bank-option";
    option.onclick = () => selectBank(index);

    const nameEl = document.createElement("div");
    nameEl.className = "bank-name";
    nameEl.textContent = bank.name;

    const statsEl = document.createElement("div");
    statsEl.className = "bank-stats";
    if (scores.length > 0) {
      statsEl.textContent = `${scores.length} attempts | Avg: ${avgScore}%`;
    } else {
      statsEl.textContent = "No attempts yet";
    }

    option.appendChild(nameEl);
    option.appendChild(statsEl);
    optionsContainer.appendChild(option);
  });

  modal.classList.remove("hidden");
}

async function selectBank(index) {
  const bank = quizBanks[index];
  selectedBankKey = bank.name;

  // Load all source files and combine questions
  const questions = [];
  for (const source of bank.sources) {
    try {
      const response = await fetch(`./${source}`);
      const data = await response.json();
      questions.push(...data);
    } catch (error) {
      console.error(`Failed to load ${source}:`, error);
    }
  }

  questionBank = questions;

  // Close modal and update UI
  document.getElementById("bank-selection-modal").classList.add("hidden");
  document.getElementById("quiz-title").textContent = bank.name;
  document.getElementById("start-screen").classList.remove("hidden");

  // Show chart if there's history for this bank
  const scores = allScores[selectedBankKey] || [];
  if (scores.length > 0) {
    document
      .getElementById("history-chart-container")
      .classList.remove("hidden");
    renderChart();
  } else {
    document.getElementById("history-chart-container").classList.add("hidden");
  }
}

function changeCourse() {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("history-chart-container").classList.add("hidden");
  showBankSelectionModal();
}

// --- QUIZ FUNCTIONS ---

function startQuiz() {
  if (questionBank.length === 0) {
    alert("No questions loaded. Please select a quiz first.");
    return;
  }

  // Randomly select 10 questions (or fewer if not enough)
  const numQuestions = Math.min(10, questionBank.length);
  const shuffled = [...questionBank].sort(() => 0.5 - Math.random());
  currentQuiz = shuffled.slice(0, numQuestions);

  currentQuestionIndex = 0;
  score = 0;

  // UI Updates
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("end-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.remove("hidden");
  document.getElementById("history-chart-container").classList.add("hidden");

  showQuestion();
}

Array.prototype.shuffle = function () {
  let currentIndex = this.length,
    randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    const newArray = Array.from(this);
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex],
      newArray[currentIndex],
    ];
  }

  return this;
};

function showQuestion() {
  isAnswering = true;
  const qData = currentQuiz[currentQuestionIndex];
  const totalQuestions = currentQuiz.length;

  // Update Progress
  const percent = (currentQuestionIndex / totalQuestions) * 100;
  document.getElementById("progress-bar").style.width = `${percent}%`;
  document.getElementById("question-count").textContent =
    `Question ${currentQuestionIndex + 1}/${totalQuestions}`;

  // Render Text
  document.getElementById("question-text").textContent = qData.q;

  // Render Options
  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";

  qData.options.shuffle().forEach((opt, index) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.onclick = () => selectAnswer(qData.options.indexOf(opt), btn);
    optionsContainer.appendChild(btn);
  });

  // Reset Feedback
  const feedback = document.getElementById("feedback-display");
  feedback.style.display = "none";
  feedback.className = "feedback";

  // Hide Next Button
  document.getElementById("next-btn").classList.add("hidden");
}

function selectAnswer(selectedIndex, btnElement) {
  if (!isAnswering) return;
  isAnswering = false;

  const qData = currentQuiz[currentQuestionIndex];
  const isCorrect = selectedIndex === qData.answer;
  const feedbackEl = document.getElementById("feedback-display");
  const options = document.querySelectorAll(".option-btn");

  // Visual Feedback on Buttons
  if (isCorrect) {
    btnElement.classList.add("correct");
    score++;
    feedbackEl.innerHTML = `<strong>Correct!</strong><br>${qData.reason}`;
    feedbackEl.classList.add("success");
  } else {
    btnElement.classList.add("incorrect");
    options[qData.answer].classList.add("correct");
    feedbackEl.innerHTML = `<strong>Incorrect.</strong><br>The correct answer is: ${qData.options[qData.answer]}.<br><em>${qData.reason}</em>`;
    feedbackEl.classList.add("error");
  }

  // Disable all buttons
  options.forEach((b) => (b.style.cursor = "default"));

  // Show Feedback Box
  feedbackEl.style.display = "block";

  // Show Next Button (or finish)
  const nextBtn = document.getElementById("next-btn");
  const isLastQuestion = currentQuestionIndex === currentQuiz.length - 1;
  nextBtn.textContent = isLastQuestion ? "Finish Quiz" : "Next Question";
  nextBtn.classList.remove("hidden");
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < currentQuiz.length) {
    showQuestion();
  } else {
    endQuiz();
  }
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    const nextBtn = document.getElementById("next-btn");
    if (!nextBtn.classList.contains("hidden")) {
      nextQuestion();
    }
  }
});

function endQuiz() {
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("end-screen").classList.remove("hidden");

  const totalQuestions = currentQuiz.length;
  const finalScoreEl = document.getElementById("final-score");
  const finalPercentEl = document.getElementById("final-percent");

  finalScoreEl.textContent = `${score}/${totalQuestions}`;
  const percent = Math.round((score / totalQuestions) * 100);
  finalPercentEl.textContent = `${percent}%`;

  // Save to History for this specific bank
  if (!allScores[selectedBankKey]) {
    allScores[selectedBankKey] = [];
  }
  allScores[selectedBankKey].push(percent);
  localStorage.setItem("allScores", JSON.stringify(allScores));
}

function returnToStart() {
  document.getElementById("end-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");

  // Show and Update Chart
  const scores = allScores[selectedBankKey] || [];
  if (scores.length > 0) {
    document
      .getElementById("history-chart-container")
      .classList.remove("hidden");
    renderChart();
  }
}

function renderChart() {
  const ctx = document.getElementById("scoreChart").getContext("2d");
  const scores = allScores[selectedBankKey] || [];

  // Generate labels (Quiz 1, Quiz 2...)
  const labels = scores.map((_, i) => `Quiz ${i + 1}`);

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Score (%)",
          data: scores,
          borderColor: "#4a90e2",
          backgroundColor: "rgba(74, 144, 226, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#4a90e2",
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: "Percentage Correct" },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", init);
