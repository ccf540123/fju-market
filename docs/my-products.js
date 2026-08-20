const productList = document.getElementById("product-list");
const emptyMessage = document.getElementById("empty-message");

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

  const seller = document.createElement("p");
  seller.className = "product-seller";
  seller.textContent = product.seller || "未知賣家";

  const title = document.createElement("h3");
  title.className = "product-title";
  title.textContent = product.title;

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatPrice(product.price || 0);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "刪除";
  deleteBtn.style.borderRadius ="12px";

  info.appendChild(seller);
  info.appendChild(title);
  info.appendChild(price);
  info.appendChild(deleteBtn);

  card.appendChild(media);
  card.appendChild(info);

  deleteBtn.addEventListener("click", async function (event) {
    event.stopPropagation();

    const confirmed = confirm("確定要刪除「" + product.title + "」嗎？");
    if (!confirmed) {
      return;
    }

    const result = await supabaseClient
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("seller_id", product.seller_id);

    if (result.error) {
      console.error(result.error);
      alert("刪除失敗，請稍後再試");
      return;
    }

    loadMyProducts();
  });

  card.addEventListener("click", function () {
    window.location.href = "../product/?id=" + product.id;
  });

  return card;
}

async function loadMyProducts() {
  const userResult = await supabaseClient.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    alert("請先登入");
    window.location.href = "../login/";
    return;
  }

  const result = await supabaseClient
    .from("products")
    .select("*")
    .eq("seller_id", user.id);

  if (result.error) {
    console.error(result.error);
    emptyMessage.textContent = "載入失敗，請稍後再試";
    return;
  }

  const myProducts = result.data;
  // console.log(myProducts)
  productList.textContent = "";

  myProducts.forEach(function (product) {
    productList.appendChild(createMyProductCard(product));
  });

  if (myProducts.length === 0) {
    emptyMessage.textContent = "你還沒有發布商品";
    emptyMessage.classList.remove("hidden");
  } else {
    emptyMessage.classList.add("hidden");
  }
}

loadMyProducts();
