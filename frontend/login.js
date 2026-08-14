const SCHOOL_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@cloud\.fju\.edu\.tw$/;

const form = document.getElementById("auth-form");
const tabs = document.querySelectorAll(".auth-tab");
const confirmGroup = document.getElementById("confirm-password-group");
const confirmInput = document.getElementById("confirm-password");
const messageEl = document.getElementById("form-message");
const submitBtn = document.querySelector(".auth-submit");
const forgotBtn = document.getElementById("forgot-password-btn");

let mode = "login";

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = type ? `form-message ${type}` : "form-message";
}

function getAuthErrorMessage(error) {
  const text = (error && error.message) || "";

  if (text.toLowerCase().indexOf("invalid login credentials") !== -1) {
    return "密碼錯誤";
  }

  return text;
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
  forgotBtn.classList.toggle("hidden", isRegister);
  setMessage("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchMode(tab.dataset.mode));
});

form.addEventListener("submit", async (event) => {
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

  submitBtn.disabled = true;
  setMessage(mode === "register" ? "註冊中..." : "登入中...");

  if (mode === "register") {
    const result = await supabaseClient.auth.signUp({
      email: email,
      password: password,
    });

    if (result.error) {
      setMessage(getAuthErrorMessage(result.error));
      submitBtn.disabled = false;
      return;
    }

    if (!result.data.session) {
      setMessage("註冊成功，請到信箱確認後再登入", "success");
      submitBtn.disabled = false;
      return;
    }

    goToHome();
    return;
  }

  const result = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (result.error) {
    setMessage(getAuthErrorMessage(result.error));
    submitBtn.disabled = false;
    return;
  }

  goToHome();
});

forgotBtn.addEventListener("click", async function () {
  const email = form.email.value.trim();

  if (!SCHOOL_EMAIL_PATTERN.test(email)) {
    setMessage("請先輸入輔大學校信箱（@cloud.fju.edu.tw）");
    return;
  }

  forgotBtn.disabled = true;
  setMessage("寄送重設信件中...");

  const redirectTo = new URL("reset-password.html", window.location.href).href;
  const result = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo,
  });

  if (result.error) {
    setMessage(result.error.message);
    forgotBtn.disabled = false;
    return;
  }

  setMessage("重設信件已寄出，請到信箱點開連結", "success");
  forgotBtn.disabled = false;
});
