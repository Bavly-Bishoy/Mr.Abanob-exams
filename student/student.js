// student.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
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
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------- DOM ---------- */
const examTitle = document.getElementById("examTitle");
const examForm = document.getElementById("examForm");
const submitBtn = document.getElementById("submitBtn");
const studentNameInput = document.getElementById("studentName");

/* ---------- examId من URL ---------- */
const params = new URLSearchParams(window.location.search);
const examId = params.get("examId");

if (!examId) {
  examTitle.textContent =
    "❌ لا يوجد examId في الرابط. افتح الصفحة برابط الامتحان.";
}

/* ---------- تحميل الامتحان ---------- */
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

  // لغة الامتحان (ar / en)
  const examLanguage = exam.lang === "en" ? "en" : "ar";

  // ضبط اتجاه الصفحة
  document.documentElement.setAttribute(
    "dir",
    examLanguage === "ar" ? "rtl" : "ltr"
  );
  document.documentElement.setAttribute("lang", examLanguage);

  // عرض الأسئلة
  exam.questions.forEach((q, idx) => {
    const box = document.createElement("div");
    box.classList.add("question-box");

    // اتجاه السؤال
    box.classList.add(examLanguage === "ar" ? "rtl" : "ltr");
    box.dataset.qindex = idx;

    let inner = `<p><strong>${idx + 1}.</strong> ${escapeHtml(
      q.text
    )}</p>`;

    if (q.type === "multiple") {
      q.options.forEach((opt) => {
        inner += `
          <label>
            <input type="radio" name="q${idx}" value="${escapeHtml(opt.text)}">
            ${escapeHtml(opt.text)}
          </label>
        `;
      });
    } else if (q.type === "truefalse") {
      inner += `
        <label><input type="radio" name="q${idx}" value="true"> ${
        examLanguage === "ar" ? "صح ✅" : "True ✅"
      }</label>
        <label><input type="radio" name="q${idx}" value="false"> ${
        examLanguage === "ar" ? "خطأ ❌" : "False ❌"
      }</label>
      `;
    } else {
      inner += `
        <textarea 
          name="q${idx}" 
          placeholder="${
            examLanguage === "ar"
              ? "اكتب إجابتك هنا..."
              : "Write your answer here..."
          }"
        ></textarea>
      `;
    }

    box.innerHTML = inner;

    // ضبط اتجاه الكتابة داخل textarea
    const textarea = box.querySelector("textarea");
    if (textarea) {
      textarea.style.direction = examLanguage === "ar" ? "rtl" : "ltr";
      textarea.style.textAlign = examLanguage === "ar" ? "right" : "left";
    }

    examForm.appendChild(box);
  });
}

/* ---------- حماية HTML ---------- */
function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ---------- إرسال الإجابات ---------- */
submitBtn.addEventListener("click", () => {
  const studentName = studentNameInput.value.trim();
  if (!studentName) {
    alert("من فضلك اكتب اسمك");
    return;
  }

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

  localStorage.setItem("studentAnswers", JSON.stringify(answers));
  localStorage.setItem("studentName", studentName);
  localStorage.setItem("examId", examId);

  window.location.href =
    "../result/result.html?examId=" + encodeURIComponent(examId);
});

loadExam();

