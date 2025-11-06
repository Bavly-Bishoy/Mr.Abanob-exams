import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, get, remove, update } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

/* ---------- Firebase config ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAVFxlp7aXIuIKiq9ySeyE4د6R-a4WLVGc",
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

// ✅ تحميل الامتحانات من Firebase
async function loadExams() {
  const snapshot = await get(ref(db, "exams"));

  if (!snapshot.exists()) {
    examsListContainer.innerHTML = "❌ لا توجد امتحانات حالياً.";
    return;
  }

  examsListContainer.innerHTML = "";
  const exams = snapshot.val();

  Object.keys(exams).forEach((id) => {
    const exam = exams[id];
    const examItem = document.createElement("div");
    examItem.className = "exam-item";
    examItem.innerHTML = `
      <span><strong>${exam.name}</strong> (ID: ${id})</span>
      <div>
        <button class="openBtn" data-id="${id}">👁 عرض</button>
        <button class="editBtn" data-id="${id}">✏ تعديل</button>
        <button class="deleteBtn" data-id="${id}">🗑 حذف</button>
        <button class="copyLinkBtn" data-id="${id}">🔗 نسخ الرابط</button>
      </div>
    `;
    examsListContainer.appendChild(examItem);
  });
}

// ✅ حذف الامتحان من Firebase
async function deleteExam(examId) {
  await remove(ref(db, `exams/${examId}`));
  alert("✅ تم حذف الامتحان من Firebase بنجاح!");
  loadExams();
}

// ✅ تعديل الامتحان (فقط تعديل الاسم للآن)
async function editExam(examId) {
  const snapshot = await get(ref(db, `exams/${examId}`));
  if (!snapshot.exists()) return alert("❌ الامتحان غير موجود!");

  const oldName = snapshot.val().name;
  const newName = prompt("📝 اكتب اسم الامتحان الجديد:", oldName);
  if (!newName || newName === oldName) return;

  await update(ref(db, `exams/${examId}`), { name: newName });
  alert("✅ تم تعديل الاسم بنجاح!");
  loadExams();
}

// ✅ نسخ رابط الامتحان الصحيح للطالب
function copyExamLink(examId) {
  const examUrl = `${window.location.origin}/student/student.html?examId=${examId}`;
  navigator.clipboard.writeText(examUrl);
  alert("✅ تم نسخ رابط الامتحان:\n" + examUrl);
}

// ✅ فتح الامتحان كطالب
function openExam(examId) {
  const url = `/student/student.html?examId=${examId}`;
  window.open(url, "_blank");
}

// ✅ أحداث الأزرار
examsListContainer.addEventListener("click", e => {
  const examId = e.target.dataset.id;

  if (e.target.classList.contains("deleteBtn")) deleteExam(examId);
  if (e.target.classList.contains("editBtn")) editExam(examId);
  if (e.target.classList.contains("copyLinkBtn")) copyExamLink(examId);
  if (e.target.classList.contains("openBtn")) openExam(examId);
});

// ✅ إنشاء امتحان جديد
createExamBtn.addEventListener("click", () => {
  window.location.href = "make_new_quiz/make_new_quiz.html";
});

loadExams();

