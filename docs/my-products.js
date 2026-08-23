const productList = document.getElementById("product-list");
const emptyMessage = document.getElementById("empty-message");
const paginationEl = document.getElementById("product-pagination");

let myProducts = [];
let currentPage = 1;
let currentUser = null;

function formatPrice(price) {
  return "NT$" + Number(price).toLocaleString("zh-TW");
}

function createMyProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const img = document.createElement("img");
  img.src = product.image || "https://placehold.co/400x400/f0f0f0/666666?text=商品";
  img.alt = product.title;

  const media = document.createElement("div");
  media.className = "product-card-media";
  media.appendChild(img);

  const info = document.createElement("div");
  info.className = "product-info";

  const title = document.createElement("h3");
  title.className = "product-title";
  title.textContent = product.title;

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatPrice(product.price || 0);

  const actions = document.createElement("div");
  actions.className = "product-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "action-btn";
  editBtn.textContent = "編輯";

  const unlistBtn = document.createElement("button");
  unlistBtn.type = "button";
  unlistBtn.className = "action-btn";
  unlistBtn.textContent = "下架";

  actions.appendChild(editBtn);
  actions.appendChild(unlistBtn);
  info.appendChild(title);
  info.appendChild(price);
  info.appendChild(actions);
  card.appendChild(media);
  card.appendChild(info);

  editBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    window.location.href = "/edit-product/?id=" + product.id;
  });

  unlistBtn.addEventListener("click", async function (event) {
    event.stopPropagation();

    const confirmed = confirm(
      "確定要下架「" + product.title + "」嗎？下架後其他人就看不到這件商品。"
    );
    if (!confirmed) {
      return;
    }

    const result = await supabaseClient
      .from("products")
      .update({ is_listed: false })
      .eq("id", product.id)
      .eq("seller_id", currentUser.id);

    if (result.error) {
      console.error(result.error);
      alert("下架失敗：" + (result.error.message || "請稍後再試"));
      return;
    }

    loadMyProducts();
  });

  card.addEventListener("click", function () {
    window.location.href = "/product/?id=" + product.id;
  });

  return card;
}

function renderMyProducts() {
  const pageData = getPageItems(myProducts, currentPage);
  currentPage = pageData.page;
  productList.textContent = "";

  pageData.items.forEach(function (product) {
    productList.appendChild(createMyProductCard(product));
  });

  emptyMessage.classList.toggle("hidden", pageData.total > 0);
  if (pageData.total === 0) {
    emptyMessage.textContent = "你還沒有發布商品";
  }

  renderPagination(paginationEl, pageData, function (nextPage) {
    currentPage = nextPage;
    renderMyProducts();
    window.scrollTo(0, 0);
  });
}

async function loadMyProducts() {
  const userResult = await supabaseClient.auth.getUser();
  currentUser = userResult.data.user;

  if (!currentUser) {
    alert("請先登入");
    window.location.href = "/login/";
    return;
  }

  const result = await supabaseClient
    .from("products")
    .select("*")
    .eq("seller_id", currentUser.id)
    .order("id", { ascending: false });

  if (result.error) {
    console.error(result.error);
    emptyMessage.textContent = "載入失敗，請稍後再試";
    emptyMessage.classList.remove("hidden");
    return;
  }

  myProducts = keepListedProducts(result.data);
  renderMyProducts();
}

loadMyProducts();
