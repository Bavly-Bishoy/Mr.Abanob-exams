import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

/* ---------- Firebase config ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAVFxlp7aXIuIKiq9ySeyE4d6R-a4WLVGc",
  authDomain: "mr-abanob-exams.firebaseapp.com",
  databaseURL: "https://mr-abanob-exams-default-rtdb.firebaseio.com",
  projectId: "mr-abanob-exams",
  storageBucket: "mr-abanob-exams.firebasestorage.app",
  messagingSenderId: "295662640771",
  appId: "1:295662640771:web:115931a29a8a1032c545b6",
  measurementId: "G-9KEQ1YL5NX"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------- عناصر ---------- */
let questions = [];
let editingIndex = null;

/* ------ escape HTML ------ */
function escapeHtml(t) {
  return t.replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

const questionType = () => document.getElementById("questionType");
const extraFields = () => document.getElementById("extraFields");
const questionText = () => document.getElementById("questionText");
const addQuestionBtn = () => document.getElementById("addQuestion");
const saveExamBtn = () => document.getElementById("saveExam");
const questionsContainer = () => document.getElementById("questionsContainer");

/* ------ ترجمة نوع السؤال ------ */
function translateType(type) {
  if (type === "essay") return "مقالي";
  if (type === "truefalse") return "صح أو خطأ";
  return "اختيارات";
}

/* ------ إظهار الحقول ------ */
function renderExtraFields() {
  const type = questionType().value;
  const container = extraFields();
  container.innerHTML = "";

  if (type === "multiple") {
    container.innerHTML = `
      <div id="optionsWrapper">
        <div class="option-input">
          <input type="text" class="opt-text" placeholder="نص الاختيار" />
          <label><input type="checkbox" class="opt-correct"/> إجابة صحيحة</label>
        </div>
        <div class="option-input">
          <input type="text" class="opt-text" placeholder="نص الاختيار" />
          <label><input type="checkbox" class="opt-correct"/> إجابة صحيحة</label>
        </div>
      </div>
      <button id="addOptionBtn" class="add-btn" style="background:#17a2b8">➕ إضافة اختيار</button>
    `;
    document.getElementById("addOptionBtn").onclick = () => {
      document.getElementById("optionsWrapper").insertAdjacentHTML("beforeend", `
        <div class="option-input">
          <input type="text" class="opt-text" placeholder="نص الاختيار" />
          <label><input type="checkbox" class="opt-correct"/> إجابة صحيحة</label>
        </div>
      `);
    };
  }

  else if (type === "truefalse") {
    container.innerHTML = `
      <label><input type="radio" name="tf" value="true"> صح ✅</label>
      <label><input type="radio" name="tf" value="false"> خطأ ❌</label>
    `;
  }

  else {
    container.innerHTML = `
      <label>الإجابة النموذجية:</label>
      <textarea id="essayAnswer" placeholder="اكتب الإجابة النموذجية"></textarea>
    `;
  }
}

/* -------- إضافة / تعديل -------- */
function addQuestionHandler() {
  const text = questionText().value.trim();
  const type = questionType().value;
  if (!text) return alert("اكتب نص السؤال");

  let question = { text, type };

  if (type === "multiple") {
    let opts = [...document.querySelectorAll(".option-input")].map(div => ({
      text: div.querySelector(".opt-text").value,
      correct: div.querySelector(".opt-correct").checked
    })).filter(o => o.text.trim() !== "");

    if (opts.length < 2) return alert("أضف اختيارين على الأقل");
    question.options = opts;
  }

  if (type === "truefalse") {
    let s = document.querySelector("input[name='tf']:checked");
    if (!s) return alert("اختر الإجابة الصحيحة");
    question.correct = s.value === "true";
  }

  if (type === "essay") {
    let a = document.getElementById("essayAnswer").value.trim();
    if (!a) return alert("اكتب الإجابة النموذجية");
    question.correctAnswer = a;
  }

  if (editingIndex !== null) {
    questions[editingIndex] = question;
    editingIndex = null;
    addQuestionBtn().textContent = "➕ إضافة السؤال";
  } else {
    questions.push(question);
  }

  renderQuestions();
  questionText().value = "";
  extraFields().innerHTML = "";
}

/* -------- عرض الأسئلة -------- */
function renderQuestions() {
  const container = questionsContainer();
  container.innerHTML = "";

  questions.forEach((q, i) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <div>
        <strong>${i + 1}.</strong> ${escapeHtml(q.text)} 
        <small>(${translateType(q.type)})</small>
      </div>

      <div class="action-buttons">
        <button class="edit-btn" data-index="${i}" style="background:#28a745">✏️ تعديل</button>
        <button class="delete-btn" data-index="${i}" style="background:#dc3545">🗑️ حذف</button>
      </div>
    `;

    container.appendChild(li);
  });

  document.querySelectorAll(".edit-btn").forEach(btn =>
    btn.onclick = () => editQuestion(btn.dataset.index)
  );

  document.querySelectorAll(".delete-btn").forEach(btn =>
    btn.onclick = () => deleteQuestion(btn.dataset.index)
  );
}

/* -------- تعديل -------- */
function editQuestion(i) {
  editingIndex = i;
  const q = questions[i];

  questionText().value = q.text;
  questionType().value = q.type;
  renderExtraFields();

  if (q.type === "multiple") {
    const wrapper = document.getElementById("optionsWrapper");
    wrapper.innerHTML = "";
    q.options.forEach(o => {
      wrapper.insertAdjacentHTML("beforeend", `
        <div class="option-input">
          <input type="text" class="opt-text" value="${o.text}" />
          <label><input type="checkbox" class="opt-correct" ${o.correct?"checked":""}/> إجابة صحيحة</label>
        </div>
      `);
    });
  }

  if (q.type === "truefalse") {
    document.querySelector(`input[name="tf"][value="${q.correct ? "true" : "false"}"]`).checked = true;
  }

  if (q.type === "essay") {
    document.getElementById("essayAnswer").value = q.correctAnswer;
  }

  addQuestionBtn().textContent = "💾 حفظ التعديل";
}

/* -------- حذف -------- */
function deleteQuestion(i) {
  questions.splice(i, 1);
  renderQuestions();
}

/* -------- حفظ -------- */
async function saveExamHandler() {
  const examName = document.getElementById("examName").value.trim();
  const lang = document.querySelector("input[name='lang']:checked").value;
  if (!examName) return alert("اكتب اسم الامتحان");
  if (questions.length === 0) return alert("أضف سؤال واحد على الأقل");

  const exam = {
    name: examName,
    lang,
    questions,
    createdAt: Date.now()
  };

  const newExamRef = push(ref(db, "exams"));
  exam.id = newExamRef.key;
  await set(newExamRef, exam);

  alert("✅ تم حفظ الامتحان بنجاح");
  window.location.href = "../index.html";
}

/* -------- تشغيل -------- */
document.addEventListener("DOMContentLoaded", () => {
  renderExtraFields();
  questionType().onchange = renderExtraFields;
  addQuestionBtn().onclick = addQuestionHandler;
  saveExamBtn().onclick = saveExamHandler;
});
