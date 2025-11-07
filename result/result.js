import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, get, push } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

/* ---------- Firebase config ---------- */
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

/* ---------- Data ---------- */
const answers = JSON.parse(localStorage.getItem("studentAnswers") || "{}");
const studentName = localStorage.getItem("studentName") || "غير معروف";
const examIdFromStorage = localStorage.getItem("examId");

const params = new URLSearchParams(window.location.search);
const examId = params.get("examId") || examIdFromStorage;

studentNameDisplay.textContent = studentName;

/* ---------- Apps Script ---------- */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwuI3jr90X_khH5yFwI0sIGto4YgFx0d8b3C4sgsenoC7XzOJIG0NwWvZM7Pc60Dm_C/exec";

/* ---------- تحميل وتصحيح ---------- */
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

  // تصحيح
  let correctCount = 0;
  const total = exam.questions.length;
  const details = [];

  exam.questions.forEach((q, idx) => {
    const key = `q${idx}`;
    const userAns = (answers[key] || "").toString();
    let isCorrect = false;
    let correctDisplay = "";
    let reason = "";

    if (q.type === "multiple") {
      const correctOp = Array.isArray(q.options) ? q.options.find(o => o.correct) : null;
      correctDisplay = correctOp ? correctOp.text : "";
      isCorrect = userAns === (correctOp ? correctOp.text : "");
    } else if (q.type === "truefalse") {
      correctDisplay = String(q.correct);
      isCorrect = userAns === String(q.correct);
    } else { 
      correctDisplay = q.correctAnswer || "";
      const essayResult = essayMatch(userAns, q.correctAnswer || "");
      isCorrect = essayResult.correct;
      reason = essayResult.reason || "";
    }

    if (isCorrect) correctCount++;

    const div = document.createElement("div");
    div.className = `question-result ${isCorrect ? "correct" : "wrong"}`;
    div.innerHTML = `
      <p><strong>${idx + 1}.</strong> ${escapeHtml(q.text)}</p>
      <p><strong>إجابتك:</strong> ${escapeHtml(userAns || "لم يجب")}</p>
      ${
        (q.type !== "essay")
          ? `<p><strong>الإجابة الصحيحة:</strong> ${escapeHtml(correctDisplay)}</p>`
          : `<p><strong>الإجابة النموذجية:</strong> ${escapeHtml(correctDisplay)}</p>
             ${reason ? `<p style="color:#c00;"><strong>ملاحظة:</strong> ${escapeHtml(reason)}</p>` : ""}`
      }
    `;
    resultsContainer.appendChild(div);

    details.push({
      index: idx,
      question: q.text,
      userAnswer: userAns,
      correctAnswer: correctDisplay,
      isCorrect,
      reason
    });
  });

  const percent = Math.round((correctCount / total) * 100);
  summaryEl.innerHTML = `<h3>الدرجة: ${correctCount} / ${total} — (${percent}%)</h3>`;

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
    console.error("❌ خطأ في حفظ النتيجة:", err);
  }

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
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ---------- تصحيح الإجابات المقاليّة ---------- */
function essayMatch(user, correct) {
  if (!user || !correct)
    return { correct: false, reason: "لم يتم إدخال إجابة." };

  const clean = str => str
    .toLowerCase()
    .replace(/[^ء-يa-z0-9\s']/g, '')
    .replace(/\b(i'm)\b/g, 'i am')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bdon't\b/g, 'do not')
    .replace(/\bthe\b/g, '') // ← تجاهل كلمة "the"
    .trim();

  const normalize = word => {
    const synonyms = {
      fine: ["good", "well", "ok", "okay"],
      yes: ["yeah", "yep", "sure", "of course"],
      no: ["nope", "nah"],
      happy: ["glad", "pleased"],
      sad: ["unhappy", "upset"],
      thank: ["thanks", "thankyou", "thank you"],
      energy: ["power", "strength"],
      eat: ["consume"],
      food: ["meal", "nutrition"],
    };
    for (const [base, list] of Object.entries(synonyms)) {
      if (list.includes(word)) return base;
    }
    return word;
  };

  const userWords = clean(user).split(/\s+/).map(normalize);
  const correctWords = clean(correct).split(/\s+/).map(normalize);

  if (userWords.length === 0 || correctWords.length === 0)
    return { correct: false, reason: "لم يتم إدخال إجابة مفهومة." };

  let matches = 0;
  correctWords.forEach(cw => {
    if (userWords.includes(cw)) matches++;
  });

  const matchRatio = matches / correctWords.length;
  const missing = correctWords.filter(w => !userWords.includes(w));
  const extra = userWords.filter(w => !correctWords.includes(w));

  let reason = "";
  if (matchRatio >= 0.8) {
    return { correct: true, reason: "" }; // إجابة صحيحة تقريبًا
  } else if (matchRatio >= 0.5) {
    reason = "إجابتك قريبة من الصحيحة جدًا، بس فيها اختلاف بسيط في الصياغة.";
  } else if (missing.length > 0 && extra.length === 0) {
    reason = `ناقص كلمات مثل: ${missing.slice(0, 3).join(", ")}`;
  } else if (extra.length > 0 && missing.length === 0) {
    reason = `في إجابتك كلمات زائدة: ${extra.slice(0, 3).join(", ")}`;
  } else if (missing.length > 0 && extra.length > 0) {
    reason = `ناقص كلمات مثل: ${missing.slice(0, 2).join(", ")}، وزايد: ${extra.slice(0, 2).join(", ")}`;
  }

  const isCorrect = matchRatio >= 0.3; // أكثر تسامح
  return { correct: isCorrect, reason };
}

/* ---------- تشغيل ---------- */
loadAndGrade();

