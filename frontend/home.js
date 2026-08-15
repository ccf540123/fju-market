// 從資料庫抓回來的商品會放在這裡
let products = [];

const productList = document.getElementById("product-list");
const searchInputs = document.querySelectorAll(".search-input");
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
const currentUserNameEl = document.getElementById("current-user-name");
const logoutBtn = document.getElementById("logout-btn");
const menuBtn = document.getElementById("menu-btn");
const drawer = document.getElementById("drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const drawerClose = document.getElementById("drawer-close");
const categoryList = document.getElementById("category-list");
const parentCategorySelect = document.getElementById("product-parent-category");
const subcategorySelect = document.getElementById("product-subcategory");
const favoritesLinks = document.querySelectorAll('[data-nav="favorites"]');
const messagesLinks = document.querySelectorAll('[data-nav="messages"]');
const myProductsLinks = document.querySelectorAll('[data-nav="my-products"]');
const profileLinks = document.querySelectorAll('[data-nav="profile"]');

let currentUser = null;
let favoriteIds = [];
let categories = [];
let parentCategories = [];
let subcategoriesByParent = new Map();
let currentCategory = "all";
let currentSubcategory = "all";
let currentSearch = "";
let currentSort = "newest";
let isPublishing = false;

function getCategoryById(categoryId) {
  if (!categoryId) {
    return null;
  }

  return categories.find(function (category) {
    return String(category.id) === String(categoryId);
  }) || null;
}

function getProductCategoryContext(product) {
  const categoryId = product && product.category_id ? product.category_id : null;
  const category = categoryId ? getCategoryById(categoryId) : null;

  if (category) {
    if (category.parent_id) {
      const parentCategory = getCategoryById(category.parent_id);
      return {
        parentId: parentCategory ? String(parentCategory.id) : null,
        subcategoryId: String(category.id),
        label: parentCategory
          ? parentCategory.name + " / " + category.name
          : category.name,
      };
    }

    return {
      parentId: String(category.id),
      subcategoryId: null,
      label: category.name,
    };
  }

  // 舊資料只有文字 category 時的備援
  const legacyNames = {
    books: "書籍",
    electronics: "3C 電子",
    daily: "生活用品",
    clothing: "服飾",
    others: "其他",
  };

  if (product && product.category && legacyNames[product.category]) {
    const parentName = legacyNames[product.category];
    const parentCategory = parentCategories.find(function (item) {
      return item.name === parentName;
    });

    return {
      parentId: parentCategory ? String(parentCategory.id) : null,
      subcategoryId: null,
      label: parentName,
    };
  }

  return {
    parentId: null,
    subcategoryId: null,
    label: "未分類",
  };
}

function getSubcategoriesForParent(parentId) {
  if (!parentId || parentId === "all") {
    return [];
  }

  return subcategoriesByParent.get(String(parentId)) || [];
}

function renderCategoryMenu() {
  const items = [
    '<li class="category-item">' +
      '<button type="button" class="category-btn' +
      (currentCategory === "all" ? " active" : "") +
      '" data-category="all"><span>全部商品</span></button>' +
      "</li>",
  ];

  parentCategories.forEach(function (category) {
    const parentId = String(category.id);
    const isOpen = String(currentCategory) === parentId;
    const children = getSubcategoriesForParent(parentId);
    const hasChildren = children.length > 0;
    const arrowHtml = hasChildren
      ? '<span class="category-arrow" aria-hidden="true">' +
        (isOpen ? "˅" : "›") +
        "</span>"
      : "";

    let html =
      '<li class="category-item' +
      (isOpen ? " is-open" : "") +
      '">' +
      '<button type="button" class="category-btn' +
      (isOpen ? " active" : "") +
      '" data-category="' +
      parentId +
      '"><span>' +
      category.name +
      "</span>" +
      arrowHtml +
      "</button>";

    // 只有目前選到的主分類，才在該項目下方展開子分類
    if (isOpen && hasChildren) {
      html += '<ul class="subcategory-list">';
      html +=
        '<li><button type="button" class="subcategory-btn' +
        (currentSubcategory === "all" ? " active" : "") +
        '" data-subcategory="all"><span>全部</span></button></li>';

      children.forEach(function (child) {
        const isActive = String(currentSubcategory) === String(child.id);
        html +=
          '<li><button type="button" class="subcategory-btn' +
          (isActive ? " active" : "") +
          '" data-subcategory="' +
          String(child.id) +
          '"><span>' +
          child.name +
          "</span></button></li>";
      });

      html += "</ul>";
    }

    html += "</li>";
    items.push(html);
  });

  categoryList.innerHTML = items.join("");

  categoryList.querySelectorAll(".category-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      setCategory(button.dataset.category);
    });
  });

  categoryList.querySelectorAll(".subcategory-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      currentSubcategory = button.dataset.subcategory;
      renderCategoryMenu();
      renderProducts();
    });
  });
}

function renderPublishCategoryOptions() {
  parentCategorySelect.innerHTML =
    '<option value="">請選擇主分類</option>' +
    parentCategories
      .map(function (category) {
        return (
          '<option value="' +
          String(category.id) +
          '">' +
          category.name +
          "</option>"
        );
      })
      .join("");

  // 不要用 disabled：瀏覽器遇到 required + disabled 時，
  // 按發布常常沒反應（無法顯示驗證提示）
  subcategorySelect.innerHTML = '<option value="">請先選主分類</option>';
}

function updatePublishSubcategoryOptions(parentId) {
  if (!parentId) {
    subcategorySelect.innerHTML = '<option value="">請先選主分類</option>';
    return;
  }

  const children = getSubcategoriesForParent(parentId);

  if (!children.length) {
    subcategorySelect.innerHTML = '<option value="">此主分類沒有子分類</option>';
    return;
  }

  subcategorySelect.innerHTML =
    '<option value="">請選擇子分類</option>' +
    children
      .map(function (category) {
        return (
          '<option value="' +
          String(category.id) +
          '">' +
          category.name +
          "</option>"
        );
      })
      .join("");
}

function setCategory(category) {
  // 再點一次同一個主分類 → 收合
  if (String(currentCategory) === String(category) && category !== "all") {
    currentCategory = "all";
    currentSubcategory = "all";
  } else {
    currentCategory = category;
    currentSubcategory = "all";
  }

  renderCategoryMenu();
  renderProducts();
}

// 把價格加上千分位，例如 3852 → 3,852
function formatPrice(price) {
  return "NT$" + Number(price).toLocaleString("zh-TW");
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

  const category = document.createElement("p");
  category.className = "product-category";
  category.textContent = getProductCategoryContext(product).label;

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatPrice(product.price || 0);

  const favoriteBtn = document.createElement("button");
  favoriteBtn.type = "button";
  favoriteBtn.className = "favorite-btn";
  const isFavorited = favoriteIds.indexOf(product.id) !== -1;
  favoriteBtn.textContent = isFavorited ? "已收藏" : "收藏";
  if (isFavorited) {
    favoriteBtn.classList.add("active");
  }

  info.appendChild(seller);
  info.appendChild(title);
  info.appendChild(category);
  info.appendChild(price);
  info.appendChild(favoriteBtn);

  card.appendChild(img);
  card.appendChild(info);

  favoriteBtn.addEventListener("click", async function (event) {
    event.stopPropagation();

    if (!requireLogin()) {
      return;
    }

    const alreadyFavorited = favoriteIds.indexOf(product.id) !== -1;

    if (alreadyFavorited) {
      const result = await supabaseClient
        .from("favorites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("product_id", product.id);

      if (result.error) {
        console.error(result.error);
        alert("取消收藏失敗，請稍後再試");
        return;
      }

      favoriteIds = favoriteIds.filter(function (id) {
        return id !== product.id;
      });
    } else {
      const result = await supabaseClient.from("favorites").insert({
        user_id: currentUser.id,
        product_id: product.id,
      });

      if (result.error) {
        console.error(result.error);
        alert("收藏失敗，請稍後再試");
        return;
      }

      favoriteIds.push(product.id);
    }

    renderProducts();
  });

  card.addEventListener("click", function () {
    window.location.href = "product.html?id=" + product.id;
  });

  return card;
}

// 依分類、搜尋、排序篩選並顯示商品
function renderProducts() {
  const keyword = currentSearch.toLowerCase();

  let filteredProducts = products.filter(function (product) {
    const productContext = getProductCategoryContext(product);
    const parentMatch =
      currentCategory === "all" ||
      String(productContext.parentId) === String(currentCategory);

    const subcategoryMatch =
      currentSubcategory === "all" ||
      String(productContext.subcategoryId) === String(currentSubcategory);

    const sellerText = (product.seller || "").toLowerCase();
    const matchSearch =
      keyword === "" ||
      product.title.toLowerCase().includes(keyword) ||
      sellerText.includes(keyword);

    return parentMatch && subcategoryMatch && matchSearch;
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

async function loadCategories() {
  try {
    const result = await supabaseClient
      .from("categories")
      .select("*")
      .order("level", { ascending: true })
      .order("name", { ascending: true });

    if (result.error) {
      throw result.error;
    }

    categories = result.data || [];
  } catch (error) {
    console.warn("categories table unavailable; falling back to legacy category values", error);
    categories = [];
  }

  parentCategories = categories.filter(function (category) {
    return category.parent_id === null;
  });

  subcategoriesByParent = new Map();

  categories.forEach(function (category) {
    if (category.parent_id) {
      const key = String(category.parent_id);
      if (!subcategoriesByParent.has(key)) {
        subcategoriesByParent.set(key, []);
      }
      subcategoriesByParent.get(key).push(category);
    }
  });

  renderCategoryMenu();
  renderPublishCategoryOptions();
  renderProducts();
}

async function loadFavoriteIds() {
  favoriteIds = [];

  if (!currentUser) {
    return;
  }

  const result = await supabaseClient
    .from("favorites")
    .select("product_id")
    .eq("user_id", currentUser.id);

  if (result.error) {
    console.error(result.error);
    return;
  }

  favoriteIds = result.data.map(function (row) {
    return row.product_id;
  });
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
  await loadFavoriteIds();
  emptyMessage.textContent = "找不到符合的商品";
  renderProducts();
}

parentCategorySelect.addEventListener("change", function () {
  updatePublishSubcategoryOptions(parentCategorySelect.value);
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
  renderPublishCategoryOptions();
  updatePublishSubcategoryOptions("");
  if (!parentCategories.length) {
    publishMessage.textContent = "分類尚未載入，請重新整理頁面後再試";
  }
  publishModal.classList.remove("hidden");
}

function closePublishModal() {
  publishModal.classList.add("hidden");
  publishForm.reset();
  updatePublishSubcategoryOptions("");
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

  if (isPublishing) {
    return;
  }

  if (!requireLogin()) {
    return;
  }

  const title = document.getElementById("product-title").value.trim();
  const price = Number(document.getElementById("product-price").value);
  const parentCategoryId = parentCategorySelect.value;
  const subcategoryId = subcategorySelect.value;
  const imageFile = document.getElementById("product-image").files[0];

  if (!title || Number.isNaN(price) || price < 0) {
    publishMessage.textContent = "請填寫完整且正確的資料";
    return;
  }

  if (!parentCategoryId) {
    publishMessage.textContent = "請選擇主分類";
    return;
  }

  if (!subcategoryId) {
    publishMessage.textContent = "請選擇子分類";
    return;
  }

  if (!getCategoryById(subcategoryId)) {
    publishMessage.textContent = "分類資料載入失敗，請重新整理頁面後再試";
    return;
  }

  if (!imageFile) {
    publishMessage.textContent = "請上傳商品圖片";
    return;
  }

  isPublishing = true;

  const profileResult = await supabaseClient
    .from("profiles")
    .select("display_name")
    .eq("id", currentUser.id)
    .maybeSingle();

  const sellerName =
    (profileResult.data && profileResult.data.display_name) ||
    currentUser.email.split("@")[0];

  publishMessage.textContent = "發布中...";

  const filePath =
    currentUser.id + "/" + Date.now() + "-" + imageFile.name;

  const uploadResult = await supabaseClient.storage
    .from("products")
    .upload(filePath, imageFile);

  if (uploadResult.error) {
    console.error(uploadResult.error);
    publishMessage.textContent =
      "圖片上傳失敗：" + (uploadResult.error.message || "請稍後再試");
    isPublishing = false;
    return;
  }

  const publicUrlResult = supabaseClient.storage
    .from("products")
    .getPublicUrl(filePath);

  const imageUrl = publicUrlResult.data.publicUrl;
  const selectedSubcategory = getCategoryById(subcategoryId);

  // 新商品以 category_id（子分類）為準；文字 category 只當相容備援
  const result = await supabaseClient.from("products").insert({
    title: title,
    price: price,
    seller: sellerName,
    seller_id: currentUser.id,
    category_id: Number(subcategoryId),
    category: selectedSubcategory ? selectedSubcategory.name : "未分類",
    image: imageUrl,
  });

  if (result.error) {
    console.error(result.error);
    publishMessage.textContent =
      "發布失敗：" + (result.error.message || "請稍後再試");
    isPublishing = false;
    return;
  }

  isPublishing = false;
  closePublishModal();
  loadProducts();
});

// 先確認登入狀態，再載入分類與商品（未登入仍可瀏覽）
loadCurrentUser().then(async function () {
  await loadCategories();
  await loadProducts();
});

async function loadCurrentUser() {
  const result = await supabaseClient.auth.getUser();
  currentUser = result.data.user || null;

  if (!currentUser) {
    loginLink.classList.remove("hidden");
    userArea.classList.add("hidden");
    return;
  }

  const profileResult = await supabaseClient
    .from("profiles")
    .select("avatar_url, display_name")
    .eq("id", currentUser.id)
    .maybeSingle();

  const profile = profileResult.data || {};
  const displayName = profile.display_name || currentUser.email.split("@")[0];
  const avatarUrl =
    profile.avatar_url ||
    "https://placehold.co/36x36/f0f0f0/666666?text=頭像";

  currentUserEl.src = avatarUrl;
  currentUserEl.alt = "使用者頭像";
  currentUserNameEl.textContent = displayName;
  loginLink.classList.add("hidden");
  userArea.classList.remove("hidden");
}

favoritesLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    closeDrawer();
    requireLoginOrStay(event);
  });
});

messagesLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    closeDrawer();
    requireLoginOrStay(event);
  });
});

myProductsLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    closeDrawer();
    requireLoginOrStay(event);
  });
});

profileLinks.forEach(function (link) {
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
