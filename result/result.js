// result.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, get, push } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

/* ---------- Firebase config (نفس الإعدادات) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAVFxlp7aXIuIKiq9ySeyE4d6R-a4WLVGc",
  authDomain: "mr-abanob-exams.firebaseapp.com",
  databaseURL: "https://mr-abanob-exams-default-rtdb.firebaseio.com",
  projectId: "mr-abanob-exams",
  storageBucket: "mr-abanob-exams.firebasestorage.app",
  messagingSenderId: "295662640771",
  appId: "1:295662640771:web:115931a29a8a1032c545b6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------- DOM ---------- */
const examNameEl = document.getElementById("examName");
const studentNameDisplay = document.getElementById("studentNameDisplay");
const resultsContainer = document.getElementById("resultsContainer");
const summaryEl = document.getElementById("summary");
const doneBtn = document.getElementById("doneBtn");

/* ---------- data from localStorage & URL ---------- */
const answers = JSON.parse(localStorage.getItem("studentAnswers") || "{}");
const studentName = localStorage.getItem("studentName") || "غير معروف";
const examIdFromStorage = localStorage.getItem("examId");

const params = new URLSearchParams(window.location.search);
const examId = params.get("examId") || examIdFromStorage;

studentNameDisplay.textContent = studentName;

/* ---------- Apps Script URL (ضع الرابط الذي أعطيته أنت هنا) ---------- */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwuI3jr90X_khH5yFwI0sIGto4YgFx0d8b3C4sgsenoC7XzOJIG0NwWvZM7Pc60Dm_C/exec";

/* ---------- تحميل الامتحان وتصحيح ---------- */
async function loadAndGrade() {
  if (!examId) {
    examNameEl.textContent = "❌ examId غير موجود";
    return;
  }

  const examRef = ref(db, `exams/${examId}`);
  const snap = await get(examRef);

  if (!snap.exists()) {
    examNameEl.textContent = "❌ الامتحان غير موجود";
    return;
  }

  const exam = snap.val();
  examNameEl.textContent = exam.name || "امتحان";

  // grade
  let correctCount = 0;
  const total = exam.questions.length;
  const details = [];

  exam.questions.forEach((q, idx) => {
    const key = `q${idx}`;
    const userAns = (answers[key] || "").toString();
    let isCorrect = false;
    let correctDisplay = "";

    if (q.type === "multiple") {
      const correctOp = Array.isArray(q.options) ? q.options.find(o => o.correct) : null;
      correctDisplay = correctOp ? correctOp.text : "";
      isCorrect = userAns === (correctOp ? correctOp.text : "");
    } else if (q.type === "truefalse") {
      correctDisplay = String(q.correct);
      isCorrect = userAns === String(q.correct);
    } else { // essay
      correctDisplay = q.correctAnswer || "";
      isCorrect = essayMatch(userAns, q.correctAnswer || "");
    }

    if (isCorrect) correctCount++;

    // عرض كل سؤال
    const div = document.createElement("div");
    div.className = `question-result ${isCorrect ? "correct" : "wrong"}`;
    div.innerHTML = `
      <p><strong>${idx + 1}.</strong> ${escapeHtml(q.text)}</p>
      <p><strong>إجابتك:</strong> ${escapeHtml(userAns || "لم يجب")}</p>
      ${ (q.type !== "essay") ? `<p><strong>الإجابة الصحيحة:</strong> ${escapeHtml(correctDisplay)}</p>` : `<p><strong>الإجابة النموذجية:</strong> ${escapeHtml(correctDisplay)}</p>`}
    `;
    resultsContainer.appendChild(div);

    details.push({
      index: idx,
      question: q.text,
      userAnswer: userAns,
      correctAnswer: correctDisplay,
      isCorrect
    });
  });

  // عرض الملخص
  const percent = Math.round((correctCount / total) * 100);
  summaryEl.innerHTML = `<h3>الدرجة: ${correctCount} / ${total} — (${percent}%)</h3>`;

  // حفظ النتيجة على Firebase
  const resultObj = {
    examId,
    examName: exam.name || "",
    studentName,
    score: correctCount,
    total,
    percent,
    timestamp: Date.now(),
    details
  };

  try {
    await push(ref(db, `results/${examId}`), resultObj);
    console.log("✅ تم حفظ النتيجة في Firebase");
  } catch (err) {
    console.error("❌ خطأ في حفظ النتيجة في Firebase:", err);
  }

  // إرسال للـ Google Sheet عبر Apps Script
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultObj)
    });
    const txt = await res.text();
    console.log("✅ Apps Script response:", txt);
  } catch (err) {
    console.error("❌ خطأ في إرسال للـ Google Sheet:", err);
  }
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

/* بسيط: مقارنة إجابة مقالية — نهج مجاني:
   - نأخذ كلمات من الإجابة النموذجية (correctAnswer)
   - نتحقق إذا الطالب كتب أي من الكلمات الأساسية (مع تجاهل كلمات صغيرة)
   - إذا وجدت نسبة كلمات مطابقة >= حد (مثلاً 30%) نعتبرها صحيحة
*/
function essayMatch(user, correct) {
  if (!user || !correct) return false;
  const clean = str => str.toLowerCase().replace(/[^ء-يa-z0-9\s]/g,'').trim();
  const userWords = clean(user).split(/\s+/).filter(w => w.length>2);
  const correctWords = clean(correct).split(/\s+/).filter(w => w.length>2);

  if (userWords.length === 0 || correctWords.length === 0) return false;

  let matches = 0;
  correctWords.forEach(cw => {
    if (userWords.includes(cw)) matches++;
  });

  const matchRatio = matches / correctWords.length;
  return matchRatio >= 0.3; // عتبة 30% — تقدر تعدلها
}

doneBtn.addEventListener("click", () => {
  // نظف التخزين المحلي لو حبيت
  localStorage.removeItem("studentAnswers");
  localStorage.removeItem("studentName");
  localStorage.removeItem("examId");
  // ارجع للصفحة الرئيسية المعلم (غّير المسار لو لازم)
  window.location.href = "../teacher/teacher.html";
});

/* تشغيل */
loadAndGrade();
