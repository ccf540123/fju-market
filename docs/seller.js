const statusEl = document.getElementById("seller-status");
const cardEl = document.getElementById("seller-card");
const headingEl = document.getElementById("seller-heading");
const avatarEl = document.getElementById("seller-avatar");
const departmentEl = document.getElementById("seller-department");
const bioEl = document.getElementById("seller-bio");
const productsSection = document.getElementById("seller-products");
const productList = document.getElementById("product-list");
const productsEmpty = document.getElementById("products-empty");

function formatPrice(price) {
  return "NT$" + Number(price).toLocaleString("zh-TW");
}

function createProfileProductCard(product) {
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

  info.appendChild(title);
  info.appendChild(price);
  card.appendChild(media);
  card.appendChild(info);

  card.addEventListener("click", function () {
    window.location.href = "/product/?id=" + product.id;
  });

  return card;
}

async function loadSellerProducts(sellerId) {
  const result = await supabaseClient
    .from("products")
    .select("id, title, price, image, seller_id")
    .eq("seller_id", sellerId)
    .order("id", { ascending: false });

  productsSection.classList.remove("hidden");

  if (result.error) {
    console.error(result.error);
    productsEmpty.textContent = "商品載入失敗，請稍後再試";
    productsEmpty.classList.remove("hidden");
    return;
  }

  const rows = result.data || [];
  productList.textContent = "";

  rows.forEach(function (product) {
    productList.appendChild(createProfileProductCard(product));
  });

  if (rows.length === 0) {
    productsEmpty.textContent = "目前還沒有商品";
    productsEmpty.classList.remove("hidden");
  } else {
    productsEmpty.classList.add("hidden");
  }
}

async function loadSeller() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const productId = params.get("productId");
  const backLink = document.getElementById("back-link");

  if (productId) {
    backLink.href = "/product/?id=" + productId;
    backLink.textContent = "← 返回商品";
  } else {
    backLink.href = "/home/";
    backLink.textContent = "← 返回商品列表";
  }

  if (!id) {
    statusEl.textContent = "找不到這位使用者";
    return;
  }

  // 只讀公開欄位：姓名、頭像、科系
  const result = await supabaseClient
    .from("profiles")
    .select("display_name, avatar_url, department, bio")
    .eq("id", id)
    .maybeSingle();

  if (result.error || !result.data) {
    console.error(result.error);
    statusEl.textContent = "找不到這位使用者的個人頁面";
    return;
  }

  const profile = result.data;
  const name = profile.display_name || "未設定姓名";

  document.title = name + "｜WAYFLOO";
  headingEl.textContent = name;
  departmentEl.textContent = profile.department || "未填寫";
  avatarEl.src =
    profile.avatar_url || "https://placehold.co/160x160/f0f0f0/666666?text=頭像";
  avatarEl.alt = name;

  const bioText = profile.bio ? String(profile.bio).trim() : "";
  if (bioText) {
    bioEl.textContent = bioText;
    bioEl.classList.remove("hidden");
  } else {
    bioEl.textContent = "";
    bioEl.classList.add("hidden");
  }

  statusEl.classList.add("hidden");
  cardEl.classList.remove("hidden");

  await loadSellerProducts(id);
}

loadSeller();
