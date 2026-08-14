const statusEl = document.getElementById("product-status");
const detailEl = document.getElementById("product-detail");

const categoryNames = {
  books: "書籍",
  electronics: "3C 電子",
  daily: "生活用品",
  clothing: "服飾",
  others: "其他",
};

function formatPrice(price) {
  return "NT$" + Number(price).toLocaleString("zh-TW");
}

function getCategoryName(category) {
  return categoryNames[category] || category || "未分類";
}

function showError(text) {
  statusEl.textContent = text;
  detailEl.classList.add("hidden");
}

function showProduct(product) {
  statusEl.classList.add("hidden");
  detailEl.classList.remove("hidden");
  detailEl.textContent = "";

  const img = document.createElement("img");
  img.src = product.image || "https://placehold.co/400x400/f0f0f0/666666?text=商品";
  img.alt = product.title || "商品圖片";

  const info = document.createElement("div");
  info.className = "product-detail-info";

  const title = document.createElement("h1");
  title.textContent = product.title || "未命名商品";

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatPrice(product.price || 0);

  const seller = document.createElement("p");
  seller.className = "product-meta";
  seller.textContent = "賣家：" + (product.seller || "未知賣家");

  const category = document.createElement("p");
  category.className = "product-meta";
  category.textContent = "分類：" + getCategoryName(product.category);

  info.appendChild(title);
  info.appendChild(price);
  info.appendChild(seller);
  info.appendChild(category);

  if (product.descirption) {
    const desc = document.createElement("p");
    desc.className = "product-desc";
    desc.textContent = product.descirption;
    info.appendChild(desc);
  }

  detailEl.appendChild(img);
  detailEl.appendChild(info);
}

async function loadProduct() {
  // URLSearchParams 會讀網址 ? 後面的參數，例如 ?id=3
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    showError("找不到商品編號");
    return;
  }

  const result = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (result.error || !result.data) {
    console.error(result.error);
    showError("找不到這件商品");
    return;
  }

  document.title = result.data.title + "｜輔大二手交易平台";
  showProduct(result.data);
}

loadProduct();
