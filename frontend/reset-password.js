const form = document.getElementById("reset-form");
const messageEl = document.getElementById("form-message");
const submitBtn = document.querySelector(".auth-submit");

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

function setMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = type ? "form-message " + type : "form-message";
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const password = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (password.length < 8) {
    setMessage("密碼至少需要 8 個字元");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("兩次輸入的密碼不一致");
    return;
  }

  submitBtn.disabled = true;
  setMessage("更新中...");

  const result = await supabaseClient.auth.updateUser({
    password: password,
  });

  if (result.error) {
    setMessage(result.error.message);
    submitBtn.disabled = false;
    return;
  }

  setMessage("密碼已更新，請重新登入", "success");
  window.location.href = "../login/";
});
