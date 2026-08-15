const statusEl = document.getElementById("seller-status");
const cardEl = document.getElementById("seller-card");
const avatarEl = document.getElementById("seller-avatar");
const nameEl = document.getElementById("seller-name");
const departmentEl = document.getElementById("seller-department");

async function loadSeller() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const productId = params.get("productId");
  const backLink = document.getElementById("back-link");

  if (productId) {
    backLink.href = "product.html?id=" + productId;
    backLink.textContent = "← 返回商品";
  } else {
    backLink.href = "home.html";
    backLink.textContent = "← 返回商品列表";
  }

  if (!id) {
    statusEl.textContent = "找不到賣家";
    return;
  }

  const result = await supabaseClient
    .from("profiles")
    .select("display_name, avatar_url, department")
    .eq("id", id)
    .maybeSingle();

  if (result.error || !result.data) {
    console.error(result.error);
    statusEl.textContent = "找不到這位賣家的個人檔案";
    return;
  }

  const profile = result.data;
  const name = profile.display_name || "未設定姓名";

  document.title = name + "｜輔大二手交易平台";
  nameEl.textContent = name;
  departmentEl.textContent = profile.department || "未填寫";
  avatarEl.src =
    profile.avatar_url || "https://placehold.co/160x160/f0f0f0/666666?text=頭像";
  avatarEl.alt = name;

  statusEl.classList.add("hidden");
  cardEl.classList.remove("hidden");
}

loadSeller();
