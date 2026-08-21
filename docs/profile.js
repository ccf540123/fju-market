const form = document.getElementById("profile-form");
const nameInput = document.getElementById("display-name");
const departmentInput = document.getElementById("department");
const avatarInput = document.getElementById("avatar-file");
const avatarPreview = document.getElementById("avatar-preview");
const messageEl = document.getElementById("profile-message");
const submitBtn = document.querySelector(".auth-submit");
const productList = document.getElementById("product-list");
const productsEmpty = document.getElementById("products-empty");

let currentUser = null;
let currentAvatarUrl = "";

function setMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = type ? "form-message " + type : "form-message";
}

function showAvatar(url) {
  avatarPreview.src =
    url || "https://placehold.co/96x96/f0f0f0/666666?text=頭像";
}

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

async function loadMyProducts() {
  if (!currentUser || !productList) {
    return;
  }

  const result = await supabaseClient
    .from("products")
    .select("id, title, price, image, seller_id")
    .eq("seller_id", currentUser.id)
    .order("id", { ascending: false });

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
    productsEmpty.textContent = "你還沒有發布商品";
    productsEmpty.classList.remove("hidden");
  } else {
    productsEmpty.classList.add("hidden");
  }
}

async function loadProfile() {
  const userResult = await supabaseClient.auth.getUser();
  currentUser = userResult.data.user;

  if (!currentUser) {
    alert("請先登入");
    window.location.href = "/login/";
    return;
  }

  const result = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (result.error) {
    console.error(result.error);
    setMessage("載入個人檔案失敗");
    return;
  }

  let profile = result.data;

  if (!profile) {
    const insertResult = await supabaseClient.from("profiles").insert({
      id: currentUser.id,
      display_name: currentUser.email.split("@")[0],
    }).select().maybeSingle();

    if (insertResult.error) {
      console.error(insertResult.error);
      setMessage("建立個人檔案失敗");
      return;
    }

    profile = insertResult.data;
  }

  nameInput.value = profile.display_name || "";
  departmentInput.value = profile.department || "";
  currentAvatarUrl = profile.avatar_url || "";
  showAvatar(currentAvatarUrl);
  await loadMyProducts();
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!currentUser) {
    return;
  }

  const displayName = nameInput.value.trim();
  const department = departmentInput.value.trim();
  const avatarFile = avatarInput.files[0];

  if (!displayName) {
    setMessage("請輸入姓名");
    return;
  }

  submitBtn.disabled = true;
  setMessage("儲存中...");

  let avatarUrl = currentAvatarUrl;

  if (avatarFile) {
    const filePath =
      currentUser.id + "/" + Date.now() + "-" + avatarFile.name;

    const uploadResult = await supabaseClient.storage
      .from("avatars")
      .upload(filePath, avatarFile);

    if (uploadResult.error) {
      console.error(uploadResult.error);
      setMessage("頭像上傳失敗，請稍後再試");
      submitBtn.disabled = false;
      return;
    }

    const publicUrlResult = supabaseClient.storage
      .from("avatars")
      .getPublicUrl(filePath);

    avatarUrl = publicUrlResult.data.publicUrl;
  }

  const updateResult = await supabaseClient
    .from("profiles")
    .update({
      display_name: displayName,
      department: department,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentUser.id);

  if (updateResult.error) {
    console.error(updateResult.error);
    setMessage("儲存失敗，請稍後再試");
    submitBtn.disabled = false;
    return;
  }

  currentAvatarUrl = avatarUrl;
  showAvatar(avatarUrl);
  setMessage("已儲存", "success");
  submitBtn.disabled = false;
});

loadProfile();

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    await supabaseClient.auth.signOut();
    window.location.href = "/login/";
  });
}
