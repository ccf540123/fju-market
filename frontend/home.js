// 從資料庫抓回來的商品會放在這裡
let products = [];

const productList = document.getElementById("product-list");
const searchInputs = document.querySelectorAll(".search-input");
const categoryButtons = document.querySelectorAll(".category-btn");
const emptyMessage = document.getElementById("empty-message");
const productCount = document.getElementById("product-count");
const sortSelect = document.getElementById("sort-select");
const publishBtn = document.getElementById("publish-btn");
const publishModal = document.getElementById("publish-modal");
const publishForm = document.getElementById("publish-form");
const cancelPublishBtn = document.getElementById("cancel-publish-btn");
const publishMessage = document.getElementById("publish-message");
const loginLink = document.getElementById("login-link");
const userArea = document.getElementById("user-area");
const currentUserEl = document.getElementById("current-user");
const logoutBtn = document.getElementById("logout-btn");
const menuBtn = document.getElementById("menu-btn");
const drawer = document.getElementById("drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const drawerClose = document.getElementById("drawer-close");
const favoritesLinks = document.querySelectorAll('[data-nav="favorites"]');
const myProductsLinks = document.querySelectorAll('[data-nav="my-products"]');

let currentUser = null;
let currentCategory = "all";
let currentSearch = "";
let currentSort = "newest";

// 把價格加上千分位，例如 3852 → 3,852
function formatPrice(price) {
  return "NT$" + Number(price).toLocaleString("zh-TW");
}

// 更新分類按鈕的 active 狀態
function updateActiveButtons() {
  categoryButtons.forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.category === currentCategory);
  });
}

// 切換分類
function setCategory(category) {
  currentCategory = category;
  updateActiveButtons();
  renderProducts();
}

// 把一個商品資料變成卡片 DOM 元素
function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.id = product.id;

  const img = document.createElement("img");
  img.src = product.image || "https://placehold.co/400x400/f0f0f0/666666?text=商品";
  img.alt = product.title;

  const info = document.createElement("div");
  info.className = "product-info";

  const seller = document.createElement("p");
  seller.className = "product-seller";
  seller.textContent = product.seller || "未知賣家";

  const title = document.createElement("h3");
  title.className = "product-title";
  title.textContent = product.title;

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatPrice(product.price || 0);

  info.appendChild(seller);
  info.appendChild(title);
  info.appendChild(price);

  card.appendChild(img);
  card.appendChild(info);

  card.addEventListener("click", function () {
    window.location.href = "product.html?id=" + product.id;
  });

  return card;
}

// 依分類、搜尋、排序篩選並顯示商品
function renderProducts() {
  const keyword = currentSearch.toLowerCase();

  let filteredProducts = products.filter(function (product) {
    const matchCategory =
      currentCategory === "all" || product.category === currentCategory;

    const sellerText = (product.seller || "").toLowerCase();
    const matchSearch =
      keyword === "" ||
      product.title.toLowerCase().includes(keyword) ||
      sellerText.includes(keyword);

    return matchCategory && matchSearch;
  });

  // 排序：slice() 先複製一份，避免改到原本陣列
  filteredProducts = filteredProducts.slice().sort(function (a, b) {
    if (currentSort === "price-asc") {
      return a.price - b.price;
    }
    if (currentSort === "price-desc") {
      return b.price - a.price;
    }
    // newest：id 越大越新
    return b.id - a.id;
  });

  productList.textContent = "";

  filteredProducts.forEach(function (product) {
    const card = createProductCard(product);
    productList.appendChild(card);
  });

  productCount.textContent = filteredProducts.length;
  emptyMessage.classList.toggle("hidden", filteredProducts.length > 0);
}

// 從 Supabase 抓商品資料
async function loadProducts() {
  emptyMessage.classList.remove("hidden");
  emptyMessage.textContent = "載入商品中...";

  // from("products") = 讀 products 這張表
  // select("*") = 抓全部欄位
  const result = await supabaseClient.from("products").select("*");

  if (result.error) {
    console.error(result.error);
    emptyMessage.textContent = "載入失敗，請稍後再試";
    return;
  }

  products = result.data;
  emptyMessage.textContent = "找不到符合的商品";
  renderProducts();
}

// 分類按鈕
categoryButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    setCategory(button.dataset.category);
  });
});

// 搜尋框輸入
searchInputs.forEach(function (input) {
  input.addEventListener("input", function () {
    currentSearch = input.value.trim();
    searchInputs.forEach(function (otherInput) {
      otherInput.value = input.value;
    });
    renderProducts();
  });
});

// 排序下拉選單
sortSelect.addEventListener("change", function () {
  currentSort = sortSelect.value;
  renderProducts();
});

function openPublishModal() {
  publishMessage.textContent = "";
  publishModal.classList.remove("hidden");
}

function closePublishModal() {
  publishModal.classList.add("hidden");
  publishForm.reset();
  publishMessage.textContent = "";
}

function requireLogin() {
  if (currentUser) {
    return true;
  }

  alert("請先登入");
  window.location.href = "login.html";
  return false;
}

function requireLoginOrStay(event) {
  if (currentUser) {
    return true;
  }

  event.preventDefault();
  alert("請先登入");
  window.location.href = "login.html";
  return false;
}

// 發布商品按鈕：未登入會先去登入頁
publishBtn.addEventListener("click", function () {
  if (!requireLogin()) {
    return;
  }

  openPublishModal();
});

cancelPublishBtn.addEventListener("click", function () {
  closePublishModal();
});

publishForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!requireLogin()) {
    return;
  }

  const title = document.getElementById("product-title").value.trim();
  const price = Number(document.getElementById("product-price").value);
  const seller = document.getElementById("product-seller").value.trim();
  const category = document.getElementById("product-category").value;

  const imageFile = document.getElementById("product-image").files[0];

  if (!title || !seller || Number.isNaN(price) || price < 0) {
    publishMessage.textContent = "請填寫完整且正確的資料";
    return;
  }

  if (!imageFile) {
    publishMessage.textContent = "請上傳商品圖片";
    return;
  }

  publishMessage.textContent = "發布中...";

  const filePath =
    currentUser.id + "/" + Date.now() + "-" + imageFile.name;

  const uploadResult = await supabaseClient.storage
    .from("products")
    .upload(filePath, imageFile);

  if (uploadResult.error) {
    console.error(uploadResult.error);
    publishMessage.textContent = "圖片上傳失敗，請稍後再試";
    return;
  }

  const publicUrlResult = supabaseClient.storage
    .from("products")
    .getPublicUrl(filePath);

  const imageUrl = publicUrlResult.data.publicUrl;

  // insert() 會把一筆新資料寫進 products 表
  const result = await supabaseClient.from("products").insert({
    title: title,
    price: price,
    seller: seller,
    seller_id: currentUser.id,
    category: category,
    image: imageUrl,
  });

  if (result.error) {
    console.error(result.error);
    publishMessage.textContent = "發布失敗，請稍後再試";
    return;
  }

  closePublishModal();
  loadProducts();
});

// 先確認登入狀態，再載入商品（未登入仍可瀏覽）
loadCurrentUser().then(function () {
  loadProducts();
});

async function loadCurrentUser() {
  const result = await supabaseClient.auth.getUser();
  currentUser = result.data.user || null;

  if (!currentUser) {
    loginLink.classList.remove("hidden");
    userArea.classList.add("hidden");
    return;
  }

  currentUserEl.textContent = currentUser.email;
  loginLink.classList.add("hidden");
  userArea.classList.remove("hidden");
}

favoritesLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    closeDrawer();
    if (!requireLoginOrStay(event)) {
      return;
    }

    event.preventDefault();
    alert("收藏功能尚未建立");
  });
});

myProductsLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    closeDrawer();
    requireLoginOrStay(event);
  });
});

function openDrawer() {
  drawer.classList.add("open");
  drawerOverlay.classList.add("open");
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
}

menuBtn.addEventListener("click", function () {
  openDrawer();
});

drawerClose.addEventListener("click", function () {
  closeDrawer();
});

drawerOverlay.addEventListener("click", function () {
  closeDrawer();
});

logoutBtn.addEventListener("click", async function () {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
});
