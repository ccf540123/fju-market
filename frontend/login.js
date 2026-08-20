const SCHOOL_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@cloud\.fju\.edu\.tw$/;

const form = document.getElementById("auth-form");
const tabs = document.querySelectorAll(".auth-tab");
const confirmGroup = document.getElementById("confirm-password-group");
const confirmInput = document.getElementById("confirm-password");
const messageEl = document.getElementById("form-message");
const submitBtn = document.querySelector(".auth-submit");
const forgotBtn = document.getElementById("forgot-password-btn");

let mode = "login";

const EYE_OPEN =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const EYE_OFF =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

function setupPasswordToggles() {
  const buttons = document.querySelectorAll(".password-toggle");

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      const inputId = button.getAttribute("data-target");
      const input = document.getElementById(inputId);

      if (!input) {
        return;
      }

      const willShow = input.type === "password";
      input.type = willShow ? "text" : "password";
      button.setAttribute("aria-label", willShow ? "隱藏密碼" : "顯示密碼");
      button.setAttribute("title", willShow ? "隱藏密碼" : "顯示密碼");
      button.innerHTML = willShow ? EYE_OFF : EYE_OPEN;
    });
  });
}

setupPasswordToggles();

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = type ? `form-message ${type}` : "form-message";
}

function getAuthErrorMessage(error) {
  const text = (error && error.message) || "";
  const lower = text.toLowerCase();

  if (lower.indexOf("invalid login credentials") !== -1) {
    return "密碼錯誤";
  }

  if (
    lower.indexOf("already registered") !== -1 ||
    lower.indexOf("user already registered") !== -1 ||
    lower.indexOf("user already exists") !== -1 ||
    (error && error.code === "user_already_exists")
  ) {
    return "此信箱已經註冊，請直接登入";
  }

  return text;
}

// Supabase 在開啟「確認信箱」時，已註冊 email 可能不會回傳 error，
// 而是回傳 user.identities 為空陣列（避免洩漏帳號是否存在的細節給攻擊者）。
function isExistingEmailSignUp(result) {
  if (result.error) {
    const message = getAuthErrorMessage(result.error);
    return message === "此信箱已經註冊，請直接登入";
  }

  const user = result.data && result.data.user;
  if (
    user &&
    Array.isArray(user.identities) &&
    user.identities.length === 0
  ) {
    return true;
  }

  return false;
}

function goToHome() {
  window.location.href = "home.html";
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

  try {
    if (mode === "register") {
      const result = await supabaseClient.auth.signUp({
        email: email,
        password: password,
      });

      if (isExistingEmailSignUp(result)) {
        setMessage("此信箱已經註冊，請直接登入");
        return;
      }

      if (result.error) {
        setMessage(getAuthErrorMessage(result.error));
        return;
      }

      if (!result.data.session) {
        setMessage("註冊成功，請到信箱確認後再登入", "success");
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
      return;
    }

    goToHome();
  } catch (error) {
    console.error(error);
    setMessage("登入失敗，請稍後再試");
  } finally {
    submitBtn.disabled = false;
  }
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
