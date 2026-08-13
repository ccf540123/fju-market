document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.querySelector('[data-action="login"]');
  const browseBtn = document.querySelector('[data-action="browse"]');
  const aboutBtn = document.querySelector('[data-action="about"]');

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }

  if (browseBtn) {
    browseBtn.addEventListener("click", () => {
      window.location.href = "home.html";
    });
  }

  if (aboutBtn) {
    aboutBtn.addEventListener("click", () => {
      alert("輔大二手交易平台 — 專為輔仁大學學生設計的校園二手市集。");
    });
  }
});
