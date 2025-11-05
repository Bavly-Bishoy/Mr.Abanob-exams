// student.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

/* ---------- Firebase config (موجود عندك) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAVFxlp7aXIuIKiq9ySeyE4d6R-a4WLVGc",
  authDomain: "mr-abanob-exams.firebaseapp.com",
  databaseURL: "https://mr-abanob-exams-default-rtdb.firebaseio.com",
  projectId: "mr-abanob-exams",
  storageBucket: "mr-abanob-exams.firebasestorage.app",
  messagingSenderId: "295662640771",
  appId: "1:295662640771:web:115931a29a8a1032c545b6",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------- عناصر DOM ---------- */
const examTitle = document.getElementById("examTitle");
const examForm = document.getElementById("examForm");
const submitBtn = document.getElementById("submitBtn");
const studentNameInput = document.getElementById("studentName");

/* ---------- examId من URL (مثلاً: student.html?examId=ABC) ---------- */
const params = new URLSearchParams(window.location.search);
const examId = params.get("examId");

if (!examId) {
  examTitle.textContent =
    "❌ لا يوجد examId في الرابط. افتح الصفحة برابط الامتحان.";
}

// تحميل الامتحان من Firebase
async function loadExam() {
  if (!examId) return;
  const examRef = ref(db, `exams/${examId}`);
  const snap = await get(examRef);

  if (!snap.exists()) {
    examTitle.textContent = "❌ الامتحان غير موجود.";
    return;
  }

  const exam = snap.val();
  examTitle.textContent = exam.name || "امتحان";

  // render questions
  exam.questions.forEach((q, idx) => {
    const box = document.createElement("div");
    box.className = "question-box";
    box.dataset.qindex = idx;

    let inner = `<p><strong>${idx + 1}.</strong> ${q.text}</p>`;

    if (q.type === "multiple") {
      // q.options is array of {text, correct}
      q.options.forEach((opt, oi) => {
        inner += `
          <label>
            <input type="radio" name="q${idx}" value="${escapeHtml(opt.text)}">
            ${escapeHtml(opt.text)}
          </label>
        `;
      });
    } else if (q.type === "truefalse") {
      inner += `
        <label><input type="radio" name="q${idx}" value="true"> صح ✅</label>
        <label><input type="radio" name="q${idx}" value="false"> خطأ ❌</label>
      `;
    } else {
      // essay
      inner += `<textarea name="q${idx}" placeholder="اكتب إجابتك هنا..."></textarea>`;
    }

    box.innerHTML = inner;
    examForm.appendChild(box);
  });
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// جمع الإجابات وحفظها ثم تحويل لصفحة النتيجة
submitBtn.addEventListener("click", () => {
  const studentName = studentNameInput.value.trim();
  if (!studentName) return alert("من فضلك اكتب اسمك");

  // اجمع الإجابات
  const answers = {};
  const boxes = document.querySelectorAll(".question-box");
  boxes.forEach((box, idx) => {
    const qname = `q${idx}`;
    const radio = box.querySelector(`input[name="${qname}"]:checked`);
    const textarea = box.querySelector(`textarea[name="${qname}"]`);
    if (radio) answers[qname] = radio.value;
    else if (textarea) answers[qname] = textarea.value.trim();
    else answers[qname] = "";
  });

  // خزن في localStorage (بنقله للصفحة التانية)
  localStorage.setItem("studentAnswers", JSON.stringify(answers));
  localStorage.setItem("studentName", studentName);
  localStorage.setItem("examId", examId);

  // روح لصفحة النتيجة — ملاحظة: المسار النسبي يفترض result/ في نفس المستوى
  window.location.href =
    "../result/result.html?examId=" + encodeURIComponent(examId);
});

loadExam();
