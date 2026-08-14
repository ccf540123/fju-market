const form = document.getElementById("reset-form");
const messageEl = document.getElementById("form-message");
const submitBtn = document.querySelector(".auth-submit");

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
  window.location.href = "login.html";
});
