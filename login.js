const SCHOOL_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@cloud\.fju\.edu\.tw$/;

const form = document.getElementById("auth-form");
const tabs = document.querySelectorAll(".auth-tab");
const confirmGroup = document.getElementById("confirm-password-group");
const confirmInput = document.getElementById("confirm-password");
const messageEl = document.getElementById("form-message");
const submitBtn = document.querySelector(".auth-submit");

let mode = "login";

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = type ? `form-message ${type}` : "form-message";
}

function switchMode(nextMode) {
  mode = nextMode;

  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });

  const isRegister = mode === "register";
  confirmGroup.classList.toggle("hidden", !isRegister);
  confirmInput.required = isRegister;
  submitBtn.textContent = isRegister ? "註冊" : "登入";
  setMessage("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchMode(tab.dataset.mode));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = confirmInput.value;

  if (!SCHOOL_EMAIL_PATTERN.test(email)) {
    setMessage("請使用輔大學校信箱（@cloud.fju.edu.tw）");
    return;
  }

  if (password.length < 8) {
    setMessage("密碼至少需要 8 個字元");
    return;
  }

  if (mode === "register" && password !== confirmPassword) {
    setMessage("兩次輸入的密碼不一致");
    return;
  }

  setMessage(
    mode === "register"
      ? "註冊表單驗證通過（後端 API 尚未串接）"
      : "登入表單驗證通過（後端 API 尚未串接）",
    "success"
  );
});
