// 上架後把網址填進來；留空則顯示「即將上架」
const STORE_URLS = {
  ios: "",
  android: "",
};

function applyStoreLinks() {
  const note = document.getElementById("download-note");
  const buttons = document.querySelectorAll("[data-store]");
  let missing = false;
  let i = 0;

  while (i < buttons.length) {
    const button = buttons[i];
    const store = button.getAttribute("data-store");
    const url = STORE_URLS[store] || "";
    const sub = button.querySelector("[data-store-sub]");

    if (url) {
      button.href = url;
      button.target = "_blank";
      button.rel = "noopener noreferrer";
      button.classList.remove("is-soon");
      if (sub) {
        if (store === "ios") {
          sub.textContent = "下載 iOS 版";
        } else {
          sub.textContent = "下載 Android 版";
        }
      }
    } else {
      missing = true;
      button.href = "#download";
      button.classList.add("is-soon");
      if (sub) {
        sub.textContent = "即將上架";
      }
      button.addEventListener("click", function (event) {
        if (!STORE_URLS[store]) {
          event.preventDefault();
          if (note) {
            note.hidden = false;
          }
        }
      });
    }

    i = i + 1;
  }

  if (note && !missing) {
    note.hidden = true;
  }
}

applyStoreLinks();
