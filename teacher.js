import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, get, remove } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

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

const examsListContainer = document.getElementById("examsList");
const createExamBtn = document.getElementById("createExamBtn");

/* ---------- تحميل الامتحانات ---------- */
async function loadExams() {
  const examsRef = ref(db, "exams");
  const snapshot = await get(examsRef);

  if (!snapshot.exists()) {
    examsListContainer.innerHTML = "❌ لا توجد امتحانات حالياً.";
    return;
  }

  const exams = Object.entries(snapshot.val());
  examsListContainer.innerHTML = "";

  exams.forEach(([id, exam]) => {
    const examItem = document.createElement("div");
    examItem.className = "exam-item";
    examItem.innerHTML = `
      <span><strong>${exam.name}</strong> (ID: ${id})</span>
      <div class="btn-group">
        <button class="editBtn" data-id="${id}">✏️ تعديل</button>
        <button class="deleteBtn" data-id="${id}">🗑️ حذف</button>
        <button class="copyLinkBtn" data-id="${id}">🔗 نسخ الرابط</button>
        <button class="viewBtn" data-id="${id}">👁️ فتح كطالب</button>
      </div>
    `;
    examsListContainer.appendChild(examItem);
  });
}

/* ---------- حذف امتحان ---------- */
async function deleteExam(examId) {
  if (!confirm("هل أنت متأكد أنك تريد حذف هذا الامتحان نهائياً؟")) return;

  const examRef = ref(db, `exams/${examId}`);
  await remove(examRef);
  alert("✅ تم حذف الامتحان بنجاح!");
  loadExams();
}

/* ---------- تعديل امتحان ---------- */
function editExam(examId) {
  // بيروح لصفحة إنشاء امتحان ويفتح نفس الامتحان للتعديل
  window.location.href = `make_new_quiz/make_new_quiz.html?edit=${examId}`;
}

/* ---------- نسخ رابط الطالب ---------- */
function copyExamLink(examId) {
  const examUrl = `${window.location.origin}/student/student.html?examId=${examId}`;
  navigator.clipboard.writeText(examUrl).then(() => {
    alert("✅ تم نسخ الرابط!");
  });
}


/* ---------- فتح كطالب ---------- */
function openAsStudent(examId) {
  const baseUrl = "https://bavly-bishoy.github.io";
  window.open(`${baseUrl}/student/student.html?examId=${examId}`, "_blank");
}

/* ---------- أحداث الأزرار ---------- */
examsListContainer.addEventListener("click", (event) => {
  const examId = event.target.dataset.id;

  if (event.target.classList.contains("deleteBtn")) deleteExam(examId);
  if (event.target.classList.contains("editBtn")) editExam(examId);
  if (event.target.classList.contains("copyLinkBtn")) copyExamLink(examId);
  if (event.target.classList.contains("viewBtn")) openAsStudent(examId);
});

/* ---------- زر إنشاء امتحان جديد ---------- */
createExamBtn.addEventListener("click", () => {
  window.location.href = "make_new_quiz/make_new_quiz.html";
});

/* ---------- تحميل الامتحانات عند الفتح ---------- */
loadExams();

