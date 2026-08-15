const productList = document.getElementById("product-list");
const emptyMessage = document.getElementById("empty-message");

let currentUser = null;

function formatPrice(price) {
  return "NT$" + Number(price).toLocaleString("zh-TW");
}

function createFavoriteCard(product) {
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

  const seller = document.createElement("p");
  seller.className = "product-seller";
  seller.textContent = product.seller || "未知賣家";

  const title = document.createElement("h3");
  title.className = "product-title";
  title.textContent = product.title;

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatPrice(product.price || 0);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "favorite-btn active";
  removeBtn.textContent = "取消收藏";

  info.appendChild(seller);
  info.appendChild(title);
  info.appendChild(price);
  info.appendChild(removeBtn);

  card.appendChild(media);
  card.appendChild(info);

  removeBtn.addEventListener("click", async function (event) {
    event.stopPropagation();

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

    loadFavorites();
  });

  card.addEventListener("click", function () {
    window.location.href = "product.html?id=" + product.id;
  });

  return card;
}

async function loadFavorites() {
  const userResult = await supabaseClient.auth.getUser();
  currentUser = userResult.data.user;

  if (!currentUser) {
    alert("請先登入");
    window.location.href = "login.html";
    return;
  }

  emptyMessage.classList.remove("hidden");
  emptyMessage.textContent = "載入中...";

  const result = await supabaseClient
    .from("favorites")
    .select("product_id, products(*)")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error(result.error);
    emptyMessage.textContent = "載入失敗，請稍後再試";
    return;
  }

  productList.textContent = "";

  const rows = result.data || [];
  rows.forEach(function (row) {
    if (row.products) {
      productList.appendChild(createFavoriteCard(row.products));
    }
  });

  if (rows.length === 0) {
    emptyMessage.textContent = "目前還沒有收藏商品";
    emptyMessage.classList.remove("hidden");
  } else {
    emptyMessage.classList.add("hidden");
  }
}

loadFavorites();
