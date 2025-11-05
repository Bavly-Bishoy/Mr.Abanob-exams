import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, get, remove, update } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

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

// تحميل الامتحانات من Firebase
async function loadExams() {
  const examsRef = ref(db, "exams");
  const snapshot = await get(examsRef);

  if (!snapshot.exists()) {
    examsListContainer.innerHTML = "❌ لا توجد امتحانات حالياً.";
    return;
  }

  const exams = Object.values(snapshot.val());
  examsListContainer.innerHTML = ""; // حذف النص "جارٍ التحميل..." السابق

  exams.forEach((exam, idx) => {
    const examItem = document.createElement("div");
    examItem.className = "exam-item";
    examItem.innerHTML = `
      <span><strong>${exam.name}</strong> (ID: ${exam.id})</span>
      <div>
        <button class="editBtn" data-id="${exam.id}">✏️ تعديل</button>
        <button class="deleteBtn" data-id="${exam.id}">❌ حذف</button>
        <button class="copyLinkBtn" data-id="${exam.id}">📑 نسخ الرابط</button>
      </div>
    `;
    examsListContainer.appendChild(examItem);
  });
}

// حذف الامتحان من Firebase
async function deleteExam(examId) {
  const examRef = ref(db, `exams/${examId}`);
  await remove(examRef); // حذف الامتحان من قاعدة البيانات
  alert("✅ تم حذف الامتحان!");
  loadExams(); // إعادة تحميل الامتحانات بعد الحذف
}

// تعديل الامتحان
async function editExam(examId) {
  const examRef = ref(db, `exams/${examId}`);
  const snapshot = await get(examRef);

  if (!snapshot.exists()) {
    alert("❌ لم يتم العثور على الامتحان للتعديل.");
    return;
  }

  const examData = snapshot.val();
  const newName = prompt("أدخل اسم الامتحان الجديد:", examData.name);

  if (newName && newName !== examData.name) {
    // تحديث اسم الامتحان في Firebase
    await update(examRef, {
      name: newName
    });

    alert("✅ تم تعديل الامتحان بنجاح!");
    loadExams(); // إعادة تحميل الامتحانات بعد التعديل
  } else {
    alert("❌ لم يتم التعديل. اسم الامتحان هو نفسه.");
  }
}

// نسخ رابط الامتحان
function copyExamLink(examId) {
  const examUrl = `${window.location.origin}/student/student.html?examId=${examId}`;
  
  // نسخ الرابط إلى الحافظة
  navigator.clipboard.writeText(examUrl).then(() => {
    alert("✅ تم نسخ الرابط! يمكنك الآن مشاركته مع الطلاب.");
  }).catch(err => {
    alert("❌ حدث خطأ أثناء نسخ الرابط. حاول مرة أخرى.");
    console.error(err);
  });
}

// أزرار التفاعل مع كل امتحان
examsListContainer.addEventListener("click", (event) => {
  const examId = event.target.dataset.id;
  
  if (event.target.classList.contains("deleteBtn")) {
    if (confirm("هل أنت متأكد أنك تريد حذف هذا الامتحان؟")) {
      deleteExam(examId);
    }
  }

  if (event.target.classList.contains("editBtn")) {
    editExam(examId);
  }

  if (event.target.classList.contains("copyLinkBtn")) {
    copyExamLink(examId);
  }
});

// إضافة امتحان جديد
createExamBtn.addEventListener("click", () => {
  window.location.href = "/make_new_quiz/make_new_quiz.html"; // تأكد من وجود صفحة لإنشاء امتحان
});

// تحميل الامتحانات عند فتح الصفحة
loadExams();
