document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.querySelector('[data-action="login"]');
  const verifyBtn = document.querySelector('[data-action="verify"]');
  const aboutBtn = document.querySelector('[data-action="about"]');

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener("click", () => {
      // window.location.href = "login.html";
    });
  }

  if (aboutBtn) {
    aboutBtn.addEventListener("click", () => {
      alert("輔大二手交易平台 — 專為輔仁大學學生設計的校園二手市集。");
    });
  }
});
