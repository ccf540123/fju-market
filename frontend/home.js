// 假資料：之後可以改成從後端 API 取得
const products = [
  {
    id: 1,
    title: "微積分原文書（九成新）",
    price: 450,
    seller: "王",
    category: "books",
    image: "https://placehold.co/400x400/f0f0f0/666666?text=書籍",
  },
  {
    id: 2,
    title: "AirPods 保護殼",
    price: 120,
    seller: "林",
    category: "electronics",
    image: "https://placehold.co/400x400/f0f0f0/666666?text=3C",
  },
  {
    id: 3,
    title: "宿舍檯燈",
    price: 300,
    seller: "嗨",
    category: "daily",
    image: "https://placehold.co/400x400/f0f0f0/666666?text=生活用品",
  },
  {
    id: 4,
    title: "輔大社團 T 恤 M 號",
    price: 200,
    seller: "不好",
    category: "clothing",
    image: "https://placehold.co/400x400/f0f0f0/666666?text=服飾",
  },
  {
    id: 5,
    title: "程式設計入門（含習題解答）",
    price: 380,
    seller: "李小華",
    category: "books",
    image: "https://placehold.co/400x400/f0f0f0/666666?text=書籍",
  },
  {
    id: 6,
    title: "二手 iPad 鍵盤",
    price: 800,
    seller: "黃志豪",
    category: "electronics",
    image: "https://placehold.co/400x400/f0f0f0/666666?text=3C",
  },
  {
    id: 7,
    title: "收納箱三入組",
    price: 150,
    seller: "你好",
    category: "daily",
    image: "https://placehold.co/400x400/f0f0f0/666666?text=生活用品",
  },
  {
    id: 8,
    title: "運動水壺（全新）",
    price: 90,
    seller: "大便",
    category: "others",
    image: "https://placehold.co/400x400/f0f0f0/666666?text=其他",
  },
];

const productList = document.getElementById("product-list");
const searchInput = document.getElementById("search-input");
const categoryButtons = document.querySelectorAll(".category-btn");
const emptyMessage = document.getElementById("empty-message");
const productCount = document.getElementById("product-count");
const sortSelect = document.getElementById("sort-select");
const publishBtn = document.getElementById("publish-btn");

let currentCategory = "all";
let currentSearch = "";
let currentSort = "newest";

// 把價格加上千分位，例如 3852 → 3,852
function formatPrice(price) {
  return "NT$" + price.toLocaleString("zh-TW");
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
  img.src = product.image;
  img.alt = product.title;

  const info = document.createElement("div");
  info.className = "product-info";

  const seller = document.createElement("p");
  seller.className = "product-seller";
  seller.textContent = product.seller;

  const title = document.createElement("h3");
  title.className = "product-title";
  title.textContent = product.title;

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatPrice(product.price);

  info.appendChild(seller);
  info.appendChild(title);
  info.appendChild(price);

  card.appendChild(img);
  card.appendChild(info);

  card.addEventListener("click", function () {
    alert("商品詳情頁尚未建立：「" + product.title + "」");
  });

  return card;
}

// 依分類、搜尋、排序篩選並顯示商品
function renderProducts() {
  const keyword = currentSearch.toLowerCase();

  let filteredProducts = products.filter(function (product) {
    const matchCategory =
      currentCategory === "all" || product.category === currentCategory;

    const matchSearch =
      keyword === "" ||
      product.title.toLowerCase().includes(keyword) ||
      product.seller.toLowerCase().includes(keyword);

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

// 分類按鈕
categoryButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    setCategory(button.dataset.category);
  });
});

// 搜尋框輸入
searchInput.addEventListener("input", function () {
  currentSearch = searchInput.value.trim();
  renderProducts();
});

// 排序下拉選單
sortSelect.addEventListener("change", function () {
  currentSort = sortSelect.value;
  renderProducts();
});

// 發布商品按鈕
publishBtn.addEventListener("click", function () {
  alert("發布商品頁尚未建立");
});

// 第一次載入時顯示全部商品
renderProducts();
