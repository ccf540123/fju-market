document.addEventListener("DOMContentLoaded", () => {
  const aboutBtn = document.querySelector('[data-action="about"]');

  if (aboutBtn) {
    aboutBtn.addEventListener("click", () => {
      alert("輔大二手交易平台 — 專為輔仁大學學生設計的校園二手市集。");
    });
  }
});
