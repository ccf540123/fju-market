import { legalPages, CONTACT_EMAIL, TERMS_VERSION } from "./legal-content.js";

export function renderPage(slug) {
  const page = legalPages[slug];
  const root = document.querySelector("#app");
  root.textContent = "";

  const wrap = document.createElement("div");
  wrap.className = "wrap";

  const brand = document.createElement("div");
  brand.className = "brand";
  brand.textContent = "WAYFLOO";
  wrap.appendChild(brand);

  if (!page) {
    const missing = document.createElement("h1");
    missing.textContent = "找不到這個頁面";
    wrap.appendChild(missing);
    root.appendChild(wrap);
    return;
  }

  document.title = page.title + "｜WAYFLOO";

  const title = document.createElement("h1");
  title.textContent = page.documentTitle || page.title;
  wrap.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "muted";
  let metaText = "";
  if (page.updatedAt) {
    metaText = "最後更新日期：" + page.updatedAt;
  }
  if (page.version) {
    metaText = metaText
      ? metaText + "｜版本 " + page.version
      : "版本 " + page.version;
  }
  if (!metaText) {
    metaText = "條款版本 " + TERMS_VERSION;
  }
  meta.textContent = metaText;
  wrap.appendChild(meta);

  page.sections.forEach(function (section) {
    const block = document.createElement(section.todo ? "div" : "section");
    if (section.todo) {
      block.className = "todo";
    }
    const heading = document.createElement("h2");
    heading.textContent = section.title;
    block.appendChild(heading);

    (section.paragraphs || []).forEach(function (paragraph) {
      const p = document.createElement("p");
      p.textContent = paragraph;
      block.appendChild(p);
    });

    if (section.items && section.items.length > 0) {
      const list = document.createElement("ul");
      section.items.forEach(function (item) {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      block.appendChild(list);
    }

    wrap.appendChild(block);
  });

  if (slug === "contact" && CONTACT_EMAIL) {
    const mail = document.createElement("p");
    const link = document.createElement("a");
    link.href = "mailto:" + CONTACT_EMAIL;
    link.textContent = CONTACT_EMAIL;
    mail.appendChild(link);
    wrap.appendChild(mail);
  }

  const nav = document.createElement("nav");
  const links = [
    ["/", "首頁"],
    ["/terms/", "使用條款"],
    ["/privacy/", "隱私權政策"],
    ["/community/", "社群規範"],
    ["/contact/", "聯絡我們"],
    ["/deletion/", "刪除帳號說明"],
    ["/account-deletion.html", "刪除帳號"],
  ];
  links.forEach(function (item) {
    const a = document.createElement("a");
    a.className = "secondary";
    a.href = item[0];
    a.textContent = item[1];
    nav.appendChild(a);
  });
  wrap.appendChild(nav);
  root.appendChild(wrap);
}
