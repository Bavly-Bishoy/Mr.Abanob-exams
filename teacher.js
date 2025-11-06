import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, get, remove, update } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

/* ---------------- Firebase Config ---------------- */
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

const examsListContainer = document.getElementById("examsList");
const createExamBtn = document.getElementById("createExamBtn");

/* ✅ تحميل الامتحانات */
async function loadExams() {
  const examsRef = ref(db, "exams");
  const snapshot = await get(examsRef);

  if (!snapshot.exists()) {
    examsListContainer.innerHTML = "❌ لا توجد امتحانات حالياً.";
    return;
  }

  examsListContainer.innerHTML = "";
  const examsObj = snapshot.val();

  Object.keys(examsObj).forEach((key) => {
    const exam = examsObj[key];
    const examItem = document.createElement("div");
    examItem.className = "exam-item";

    examItem.innerHTML = `
      <span><strong>${exam.name}</strong> (ID: ${exam.id})</span>
      <div>
        <button class="editBtn" data-id="${exam.id}">✏️ تعديل</button>
        <button class="deleteBtn" data-id="${exam.id}">❌ حذف</button>
        <button class="copyLinkBtn" data-id="${exam.id}">📑 نسخ الرابط</button>
        <button class="viewBtn" data-id="${exam.id}">👁 فتح كطالب</button>
      </div>
    `;

    examsListContainer.appendChild(examItem);
  });
}

/* ✅ حذف الامتحان من Firebase */
async function deleteExam(examId) {
  const examRef = ref(db, `exams/${examId}`);
  await remove(examRef);
  alert("✅ تم حذف الامتحان بالكامل من Firebase");
  loadExams();
}

/* ✅ تعديل الامتحان */
async function editExam(examId) {
  const examRef = ref(db, `exams/${examId}`);
  const snapshot = await get(examRef);

  if (!snapshot.exists()) {
    alert("❌ الامتحان غير موجود للتعديل.");
    return;
  }

  const examData = snapshot.val();
  const newName = prompt("✏️ أدخل اسم الامتحان الجديد:", examData.name);

  if (newName && newName !== examData.name) {
    await update(examRef, { name: newName });
    alert("✅ تم تعديل الامتحان!");
    loadExams();
  } else {
    alert("❌ لم يتم التعديل.");
  }
}

/* ✅ نسخ رابط الامتحان */
function copyExamLink(examId) {
  const examUrl = `${window.location.origin}/student/student.html?examId=${examId}`;
  navigator.clipboard.writeText(examUrl)
    .then(() => alert("✅ تم نسخ الرابط!"))
    .catch(() => alert("❌ خطأ أثناء النسخ"));
}

/* ✅ فتح الامتحان كطالب */
function openExamAsStudent(examId) {
  window.open(`/student/student.html?examId=${examId}`, "_blank");
}

/* ✅ الأزرار */
examsListContainer.addEventListener("click", (event) => {
  const examId = event.target.dataset.id;

  if (event.target.classList.contains("deleteBtn")) {
    if (confirm("⚠ هل تريد فعلاً حذف هذا الامتحان؟")) deleteExam(examId);
  }

  if (event.target.classList.contains("editBtn")) {
    editExam(examId);
  }

  if (event.target.classList.contains("copyLinkBtn")) {
    copyExamLink(examId);
  }

  if (event.target.classList.contains("viewBtn")) {
    openExamAsStudent(examId);
  }
});

/* ✅ إنشاء امتحان جديد */
createExamBtn.addEventListener("click", () => {
  window.location.href = "make_new_quiz/make_new_quiz.html";
});

/* ✅ تحميل الامتحانات عند فتح الصفحة */
loadExams();
