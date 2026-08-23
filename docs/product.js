const statusEl = document.getElementById("product-status");
const detailEl = document.getElementById("product-detail");

function formatPrice(price) {
  return "NT$" + Number(price).toLocaleString("zh-TW");
}

function showError(text) {
  statusEl.textContent = text;
  detailEl.classList.add("hidden");
}

async function showProduct(product, sellerProfile, schools, currentUser) {
  statusEl.classList.add("hidden");
  detailEl.classList.remove("hidden");
  detailEl.textContent = "";

  const isOwner = currentUser && product.seller_id === currentUser.id;
  const isAnonymous = product.is_anonymous === true && !isOwner;
  const sellerName =
    (sellerProfile && sellerProfile.display_name) || "未知賣家";
  const shownSellerName = isAnonymous ? "匿名賣家" : sellerName;
  const school = findSchoolById(schools, product.school_id);
  const postedAt = formatRelativeTime(product.created_at);

  const img = document.createElement("img");
  img.src = product.image || "https://placehold.co/400x400/f0f0f0/666666?text=商品";
  img.alt = product.title || "商品圖片";

  const media = document.createElement("div");
  media.className = "product-detail-media";
  media.appendChild(img);

  const info = document.createElement("div");
  info.className = "product-detail-info";

  const title = document.createElement("h1");
  title.textContent = product.title || "未命名商品";

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatPrice(product.price || 0);

  info.appendChild(title);
  info.appendChild(price);

  if (postedAt) {
    const timeLine = document.createElement("p");
    timeLine.className = "product-meta";
    timeLine.textContent = postedAt + " 發布";
    info.appendChild(timeLine);
  }

  if (school) {
    const schoolLine = document.createElement("p");
    schoolLine.className = "product-meta";
    schoolLine.textContent = school.name;
    info.appendChild(schoolLine);
  }

  const descriptionText =
    (product.description && String(product.description).trim()) ||
    (product.descirption && String(product.descirption).trim()) ||
    "";

  const desc = document.createElement("p");
  desc.className = descriptionText ? "product-desc" : "product-desc product-desc-empty";
  desc.textContent = descriptionText || "賣家還沒有寫商品說明";
  info.appendChild(desc);

  const sellerLine = document.createElement("p");
  sellerLine.className = "product-meta seller-row";

  if (product.seller_id && !isAnonymous) {
    sellerLine.appendChild(document.createTextNode("賣家："));
    const sellerLink = document.createElement("a");
    sellerLink.className = "seller-link";
    sellerLink.href =
      "/seller/?id=" + product.seller_id + "&productId=" + product.id;
    sellerLink.textContent = shownSellerName + "（查看個人頁面）";
    sellerLine.appendChild(sellerLink);
  } else {
    sellerLine.textContent = "賣家：" + shownSellerName;
  }

  info.appendChild(sellerLine);

  if (isOwner) {
    const editLink = document.createElement("a");
    editLink.className = "contact-btn";
    editLink.href = "/edit-product/?id=" + product.id;
    editLink.textContent = "編輯商品";
    info.appendChild(editLink);
  } else if (product.seller_id) {
    const contactBtn = document.createElement("button");
    contactBtn.type = "button";
    contactBtn.className = "contact-btn";
    contactBtn.textContent = "聯絡賣家";
    info.appendChild(contactBtn);

    contactBtn.addEventListener("click", async function () {
      const userResult = await supabaseClient.auth.getUser();
      const user = userResult.data.user;

      if (!user) {
        alert("請先登入");
        window.location.href = "/login/";
        return;
      }

      if (user.id === product.seller_id) {
        alert("這是你自己的商品");
        return;
      }

      contactBtn.disabled = true;
      contactBtn.textContent = "開啟聊天中...";

      const existing = await supabaseClient
        .from("conversations")
        .select("id")
        .eq("product_id", product.id)
        .eq("buyer_id", user.id)
        .eq("seller_id", product.seller_id)
        .maybeSingle();

      if (existing.error) {
        console.error(existing.error);
        alert("無法開啟聊天，請稍後再試");
        contactBtn.disabled = false;
        contactBtn.textContent = "聯絡賣家";
        return;
      }

      if (existing.data) {
        window.location.href = "/chat/?id=" + existing.data.id;
        return;
      }

      const created = await supabaseClient
        .from("conversations")
        .insert({
          product_id: product.id,
          buyer_id: user.id,
          seller_id: product.seller_id,
        })
        .select("id")
        .single();

      if (created.error) {
        console.error(created.error);
        alert("無法開啟聊天，請稍後再試");
        contactBtn.disabled = false;
        contactBtn.textContent = "聯絡賣家";
        return;
      }

      window.location.href = "/chat/?id=" + created.data.id;
    });
  }

  detailEl.appendChild(media);
  detailEl.appendChild(info);
}

async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    showError("找不到商品編號");
    return;
  }

  const schools = await loadSchools();
  const userResult = await supabaseClient.auth.getUser();
  const currentUser = userResult.data.user || null;

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

  if (result.data.is_listed === false) {
    showError("這件商品已下架");
    return;
  }

  document.title = result.data.title + "｜WAYFLOO";

  let sellerProfile = null;
  if (result.data.seller_id) {
    let profileResult = await supabaseClient
      .from("profiles")
      .select(PUBLIC_PROFILE_FIELDS)
      .eq("id", result.data.seller_id)
      .maybeSingle();

    if (profileResult.error) {
      profileResult = await supabaseClient
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", result.data.seller_id)
        .maybeSingle();
    }

    sellerProfile = profileResult.data;
  }

  showProduct(result.data, sellerProfile, schools, currentUser);
}

loadProduct();
