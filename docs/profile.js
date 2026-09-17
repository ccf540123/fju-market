const form = document.getElementById("profile-form");
const nameInput = document.getElementById("display-name");
const departmentInput = document.getElementById("department");
const gradeInput = document.getElementById("grade");
const bioInput = document.getElementById("bio");
const avatarInput = document.getElementById("avatar-file");
const avatarPreview = document.getElementById("avatar-preview");
const messageEl = document.getElementById("profile-message");
const submitBtn = document.querySelector(".auth-submit");
const listedCountEl = document.getElementById("listed-count");

let currentUser = null;
let currentAvatarUrl = "";
let currentProfile = null;

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

async function loadMyProductCount() {
  if (!currentUser || !listedCountEl) {
    return;
  }

  const result = await supabaseClient
    .from("products")
    .select("id, is_listed")
    .eq("seller_id", currentUser.id);

  if (result.error) {
    console.error(result.error);
    listedCountEl.textContent = "商品數量載入失敗";
    return;
  }

  const listed = keepListedProducts(result.data);
  listedCountEl.textContent = "在售 " + listed.length + " 件";
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
    const schools = await loadSchools();
    const school = findSchoolByEmail(schools, currentUser.email);
    const insertResult = await supabaseClient.from("profiles").insert({
      id: currentUser.id,
      school_id: school ? school.id : null,
    }).select().maybeSingle();

    if (insertResult.error) {
      console.error(insertResult.error);
      setMessage("建立個人檔案失敗");
      return;
    }

    profile = insertResult.data;
  }

  currentProfile = profile;
  nameInput.value = profile.display_name || "";
  departmentInput.value = profile.department || "";
  if (gradeInput) {
    gradeInput.value = profile.grade || "";
  }
  bioInput.value = profile.bio || "";
  currentAvatarUrl = profile.avatar_url || "";
  showAvatar(currentAvatarUrl);
  await loadMyProductCount();

  const adminLink = document.getElementById("admin-school-verify-link");
  if (adminLink) {
    const adminResult = await supabaseClient.rpc("is_wayfloo_admin");
    if (!adminResult.error && adminResult.data === true) {
      adminLink.hidden = false;
    }
  }
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!currentUser) {
    return;
  }

  const displayName = nameInput.value.trim();
  const department = departmentInput.value.trim();
  const grade = gradeInput ? gradeInput.value.trim() : "";
  const bio = bioInput.value.trim();
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

  const payload = {
    display_name: displayName,
    department: department,
    bio: bio || null,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  };

  if (grade || (currentProfile && currentProfile.grade !== undefined)) {
    payload.grade = grade || null;
  }

  const updateResult = await supabaseClient
    .from("profiles")
    .update(payload)
    .eq("id", currentUser.id);

  if (updateResult.error) {
    console.error(updateResult.error);
    const errorText = (updateResult.error.message || "").toLowerCase();
    if (errorText.indexOf("grade") !== -1) {
      setMessage("資料庫還沒有年級欄位，請先到 Supabase 執行新增年級的 SQL");
    } else {
      setMessage("儲存失敗，請稍後再試");
    }
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
