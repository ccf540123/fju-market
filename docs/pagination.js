var PRODUCT_PAGE_SIZE = 10;

function getTotalPages(itemCount) {
  var count = itemCount || 0;
  if (count <= 0) {
    return 1;
  }

  return Math.ceil(count / PRODUCT_PAGE_SIZE);
}

function getPageItems(items, page) {
  var list = items || [];
  var total = list.length;
  var totalPages = getTotalPages(total);
  var safePage = page;

  if (typeof safePage !== "number" || safePage < 1) {
    safePage = 1;
  }
  if (safePage > totalPages) {
    safePage = totalPages;
  }

  var start = (safePage - 1) * PRODUCT_PAGE_SIZE;

  return {
    items: list.slice(start, start + PRODUCT_PAGE_SIZE),
    page: safePage,
    totalPages: totalPages,
    total: total,
  };
}

function renderPagination(container, pageData, onPageChange) {
  if (!container) {
    return;
  }

  container.textContent = "";

  if (!pageData || !pageData.total || pageData.total <= PRODUCT_PAGE_SIZE) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  function addButton(label, targetPage, isDisabled, isActive) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "pagination-btn";
    if (isActive) {
      button.classList.add("is-active");
    }
    button.textContent = label;
    button.disabled = isDisabled;
    button.addEventListener("click", function () {
      onPageChange(targetPage);
    });
    container.appendChild(button);
  }

  addButton("上一頁", pageData.page - 1, pageData.page <= 1, false);

  var i = 1;
  while (i <= pageData.totalPages) {
    addButton(String(i), i, false, i === pageData.page);
    i = i + 1;
  }

  addButton(
    "下一頁",
    pageData.page + 1,
    pageData.page >= pageData.totalPages,
    false
  );
}
