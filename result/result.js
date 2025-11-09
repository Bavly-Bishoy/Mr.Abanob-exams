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

/* ---------- دالة تصحيح مقالي محسّنة - استبدلي بها الدالة القديمة ---------- */
function essayMatch(user, correct) {
  // حالات سريعة
  if (!user || !user.trim()) 
    return { correct: false, reason: "لم تُدخل إجابة. الرجاء كتابة جملة أو فقرة توضح فكرتك." };
  if (!correct || !correct.trim())
    return { correct: false, reason: "لا توجد إجابة نموذجية لمقارنة إجابتك — تأكد من إعداد السؤال." };

  // تنظيف النصوص (يحافظ على العربية والإنجليزية والأرقام وبعض الأحرف)
  const clean = str => String(str)
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s']/g, ' ') // احتفاظ بالعربية واللاتينية والأرقام
    .replace(/\s+/g, ' ')
    .trim();

  // خريطة مرادفات بسيطة لتقليل حساسية الصياغة
  const normalizeWord = w => {
    const map = {
      "good": "good", "well": "good", "ok": "good", "okay": "good",
      "yes": "yes", "yeah": "yes", "yep": "yes",
      "no": "no", "nah": "nope",
      "eat": "eat", "consume": "eat",
      "food": "food", "meal": "food",
      "energy": "energy", "power": "energy"
      // أضيفي هنا مرادفات تحتاجيها لاحقًا
    };
    return map[w] || w;
  };

  const userWords = clean(user).split(/\s+/).map(normalizeWord).filter(Boolean);
  const correctWords = clean(correct).split(/\s+/).map(normalizeWord).filter(Boolean);

  if (userWords.length === 0 || correctWords.length === 0)
    return { correct: false, reason: "تعذر فهم كلمات الإجابة، اكتب جملة واضحة من فضلك." };

  // حساب المطابقات
  let matches = 0;
  const userSet = new Set(userWords);
  correctWords.forEach(w => { if (userSet.has(w)) matches++; });

  const matchRatio = matches / correctWords.length;

  // كلمات ناقصة وزائدة (لإعطاء ملاحظات مفصلة)
  const missing = correctWords.filter(w => !userSet.has(w));
  const extra = userWords.filter(w => !correctWords.includes(w));

  // صياغة المعلومة بصوت مدرس - بالعربي
const makeTeacherMsg = () => {
  if (matchRatio >= 0.85) {
    return {
      correct: true,
      reason: `إجابتك صحيحة وواضحة 👍 استمر بنفس الأسلوب.`
    };
  }

  if (matchRatio >= 0.6) {
    let note = `إجابتك قريبة جدًا من الفكرة المطلوبة، لكن محتاجة توضيح بسيط.`;
    if (missing.length) note += ` كان لازم تذكر جزء مهم مثل: ${[...new Set(missing)].slice(0,3).join(", ")}`;
    return { correct: false, reason: note };
  }

  if (matchRatio >= 0.35) {
    let note = `إجابتك فيها جزء من المعنى الصحيح، لكن ناقص نقاط أساسية علشان تكون كاملة.`;
    if (missing.length) note += ` حاول تضيف: ${[...new Set(missing)].slice(0,4).join(", ")}`;
    return { correct: false, reason: note };
  }

  let note = `إجابتك بعيدة عن المطلوب. حاول تركز على شرح السبب الرئيسي بشكل أوضح وجملة كاملة.`;
  return { correct: false, reason: note };
};

    // أقل من ذلك => غير كافٍ
    let note = `الإجابة غير كافية لتغطية الفكرة المطلوبة. حاول تذكر النقاط الأساسية التالية:\n- ${correctWords.slice(0,6).join(" ")}...`;
    note += `\n\nالإجابة النموذجية: ${suggested}\n\nنصيحة: اكتب جملة كاملة توضح لماذا أو كيف (مثال مقترح أعلاه).`;
    return { correct: false, reason: note };
  };

  const result = makeTeacherMsg();

  // لو عايزة تعتبر بعض المطابقات كصحّو، ممكن تغيري العتبات أعلاه
  return result;
}

/* ---------- تشغيل ---------- */
loadAndGrade();




