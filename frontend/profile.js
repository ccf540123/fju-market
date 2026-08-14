const form = document.getElementById("profile-form");
const nameInput = document.getElementById("display-name");
const departmentInput = document.getElementById("department");
const avatarInput = document.getElementById("avatar-file");
const avatarPreview = document.getElementById("avatar-preview");
const messageEl = document.getElementById("profile-message");
const submitBtn = document.querySelector(".auth-submit");

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

async function loadProfile() {
  const userResult = await supabaseClient.auth.getUser();
  currentUser = userResult.data.user;

  if (!currentUser) {
    alert("請先登入");
    window.location.href = "login.html";
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

const passwordForm = document.getElementById("password-form");
const passwordMessage = document.getElementById("password-message");

passwordForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const password = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (password.length < 8) {
    passwordMessage.textContent = "密碼至少需要 8 個字元";
    passwordMessage.className = "form-message";
    return;
  }

  if (password !== confirmPassword) {
    passwordMessage.textContent = "兩次輸入的密碼不一致";
    passwordMessage.className = "form-message";
    return;
  }

  const result = await supabaseClient.auth.updateUser({
    password: password,
  });

  if (result.error) {
    passwordMessage.textContent = result.error.message;
    passwordMessage.className = "form-message";
    return;
  }

  passwordForm.reset();
  passwordMessage.textContent = "密碼已更新";
  passwordMessage.className = "form-message success";
});
