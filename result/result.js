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

/* ---------- DOM Elements ---------- */
const examNameEl = document.getElementById("examName");
const studentNameDisplay = document.getElementById("studentNameDisplay");
const resultsContainer = document.getElementById("resultsContainer");
const summaryEl = document.getElementById("summary");

/* ---------- Data from LocalStorage ---------- */
const answers = JSON.parse(localStorage.getItem("studentAnswers") || "{}");
const studentName = localStorage.getItem("studentName") || "غير معروف";
const examIdFromStorage = localStorage.getItem("examId");

const params = new URLSearchParams(window.location.search);
const examId = params.get("examId") || examIdFromStorage;

studentNameDisplay.textContent = studentName;

/* ---------- Google Apps Script URL ---------- */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxh3KSHszukzHySXgefBeaqaiKAn8wWaT2V5SzAQ4B0XVzA2Ae0gi9o3HlUoP85zMYW/exec";

/* ---------- Utility Function ---------- */
function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ---------- Main Function ---------- */
async function loadAndGrade() {
  if (!examId) {
    examNameEl.textContent = "❌ examId غير موجود";
    return;
  }

  try {
    const examSnap = await get(ref(db, `exams/${examId}`));
    if (!examSnap.exists()) {
      examNameEl.textContent = "❌ الامتحان غير موجود";
      return;
    }

    const exam = examSnap.val();
    examNameEl.textContent = exam.name || "امتحان";

    let correctCount = 0;
    const total = exam.questions.length;
    const details = [];

    // تمرير كل المقالية إلى Apps Script للتصحيح
    for (let idx = 0; idx < exam.questions.length; idx++) {
      const q = exam.questions[idx];
      const key = `q${idx}`;
      const userAns = (answers[key] || "").toString();
      let isCorrect = false;
      let correctDisplay = "";
      let reason = "";

      if (q.type === "multiple") {
        const correctOp = q.options?.find(o => o.correct);
        correctDisplay = correctOp?.text || "";
        isCorrect = userAns === correctDisplay;
      } else if (q.type === "truefalse") {
        correctDisplay = String(q.correct);
        isCorrect = userAns === correctDisplay;
      } else if (q.type === "essay") {
        // إرسال المقالية إلى Apps Script + Gemini
        try {
          const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: q.text, studentAnswer: userAns, correctAnswer: q.correctAnswer || "" })
          });
          const text = await res.text();
          console.log("Gemini Response:", text);
          //هنا اعمل تحليل النص بناءً على الصياغة الحقيقية
          isCorrect = data.correct;
          reason = data.reason || "";
          correctDisplay = q.correctAnswer || "";
        } catch (err) {
          console.error("❌ خطأ في تصحيح المقالية عبر Gemini:", err);
          reason = "تعذر تصحيح الإجابة، حاول لاحقًا.";
        }
      }

      if (isCorrect) correctCount++;

      const div = document.createElement("div");
      div.className = `question-result ${isCorrect ? "correct" : "wrong"}`;
      div.innerHTML = `
        <p><strong>${idx + 1}.</strong> ${escapeHtml(q.text)}</p>
        <p><strong>إجابتك:</strong> ${escapeHtml(userAns || "لم يجب")}</p>
        ${(q.type !== "essay")
          ? `<p><strong>الإجابة الصحيحة:</strong> ${escapeHtml(correctDisplay)}</p>`
          : `<p><strong>الإجابة النموذجية:</strong> ${escapeHtml(correctDisplay)}</p>
             ${reason ? `<p style="color:#c00;"><strong>ملاحظة:</strong> ${escapeHtml(reason)}</p>` : ""}`
        }
      `;
      resultsContainer.appendChild(div);

      details.push({ index: idx, question: q.text, userAnswer: userAns, correctAnswer: correctDisplay, isCorrect, reason });
    }

    const percent = Math.round((correctCount / total) * 100);
    summaryEl.innerHTML = `<h3>الدرجة: ${correctCount} / ${total} — (${percent}%)</h3>`;

    const resultObj = { examId, examName: exam.name || "", studentName, score: correctCount, total, percent, timestamp: Date.now(), details };

    // حفظ النتيجة في Firebase
    try { await push(ref(db, `results/${examId}`), resultObj); console.log("✅ تم حفظ النتيجة في Firebase"); }
    catch (err) { console.error("❌ خطأ في حفظ النتيجة:", err); }

  } catch (err) {
    console.error("❌ خطأ في تحميل الامتحان:", err);
    examNameEl.textContent = "❌ خطأ في تحميل الامتحان";
  }
}

/* ---------- Run ---------- */
loadAndGrade();

