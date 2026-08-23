const statusEl = document.getElementById("edit-status");
const form = document.getElementById("edit-form");
const titleInput = document.getElementById("product-title");
const priceInput = document.getElementById("product-price");
const descriptionInput = document.getElementById("product-description");
const parentSelect = document.getElementById("product-parent-category");
const subcategorySelect = document.getElementById("product-subcategory");
const imageInput = document.getElementById("product-image");
const imageName = document.getElementById("product-image-name");
const preview = document.getElementById("image-preview");
const anonymousInput = document.getElementById("product-anonymous");
const schoolHint = document.getElementById("school-hint");
const messageEl = document.getElementById("edit-message");
const saveBtn = document.getElementById("save-btn");

let currentUser = null;
let currentProduct = null;
let categories = [];
let parentCategories = [];
let subcategoriesByParent = new Map();
let currentImageUrl = "";

function setMessage(text) {
  messageEl.textContent = text || "";
}

function getCategoryById(categoryId) {
  return (
    categories.find(function (category) {
      return String(category.id) === String(categoryId);
    }) || null
  );
}

function fillParentOptions() {
  parentSelect.innerHTML = '<option value="">請選擇主分類</option>';
  parentCategories.forEach(function (category) {
    const option = document.createElement("option");
    option.value = String(category.id);
    option.textContent = category.name;
    parentSelect.appendChild(option);
  });
}

function fillSubcategoryOptions(parentId) {
  const children = subcategoriesByParent.get(String(parentId)) || [];
  if (!parentId || children.length === 0) {
    subcategorySelect.innerHTML = '<option value="">不指定子分類</option>';
    return;
  }

  subcategorySelect.innerHTML = '<option value="">不指定子分類</option>';
  children.forEach(function (category) {
    const option = document.createElement("option");
    option.value = String(category.id);
    option.textContent = category.name;
    subcategorySelect.appendChild(option);
  });
}

parentSelect.addEventListener("change", function () {
  fillSubcategoryOptions(parentSelect.value);
});

if (imageInput) {
  imageInput.addEventListener("change", function () {
    if (imageInput.files && imageInput.files[0]) {
      imageName.textContent = imageInput.files[0].name;
      preview.src = URL.createObjectURL(imageInput.files[0]);
      preview.classList.remove("hidden");
    } else {
      imageName.textContent = currentImageUrl ? "使用目前照片" : "尚未選擇照片";
    }
  });
}

async function loadCategories() {
  const result = await supabaseClient
    .from("categories")
    .select("*")
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  categories = result.error ? [] : result.data || [];
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
}

async function loadPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const userResult = await supabaseClient.auth.getUser();
  currentUser = userResult.data.user;

  if (!currentUser) {
    window.location.href = "/login/";
    return;
  }

  if (!id) {
    statusEl.textContent = "找不到商品";
    return;
  }

  await loadCategories();
  fillParentOptions();

  const schools = await loadSchools();
  const result = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (result.error || !result.data) {
    statusEl.textContent = "找不到這件商品";
    return;
  }

  if (result.data.seller_id !== currentUser.id) {
    statusEl.textContent = "只能編輯自己的商品";
    return;
  }

  if (result.data.is_listed === false) {
    statusEl.textContent = "這件商品已下架";
    return;
  }

  currentProduct = result.data;
  currentImageUrl = result.data.image || "";
  titleInput.value = result.data.title || "";
  priceInput.value = result.data.price == null ? "" : result.data.price;
  descriptionInput.value = result.data.description || "";
  anonymousInput.checked = result.data.is_anonymous === true;

  const school = findSchoolById(schools, result.data.school_id);
  schoolHint.textContent = school
    ? "刊登學校：「" + school.name + "」（不能更改）"
    : "刊登學校不能更改";

  if (currentImageUrl) {
    preview.src = currentImageUrl;
    preview.classList.remove("hidden");
    imageName.textContent = "使用目前照片";
  }

  const currentCategory = getCategoryById(result.data.category_id);
  if (currentCategory && currentCategory.parent_id) {
    parentSelect.value = String(currentCategory.parent_id);
    fillSubcategoryOptions(parentSelect.value);
    subcategorySelect.value = String(currentCategory.id);
  } else if (currentCategory) {
    parentSelect.value = String(currentCategory.id);
    fillSubcategoryOptions(parentSelect.value);
  }

  statusEl.classList.add("hidden");
  form.classList.remove("hidden");
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const price = Number(priceInput.value);
  const description = descriptionInput.value.trim();
  const parentCategoryId = parentSelect.value;
  const subcategoryId = subcategorySelect.value;

  if (!title || Number.isNaN(price) || price < 0) {
    setMessage("請填寫商品名稱和正確價格");
    return;
  }

  if (!parentCategoryId) {
    setMessage("請選擇分類");
    return;
  }

  const selectedCategory = getCategoryById(subcategoryId || parentCategoryId);
  if (!selectedCategory) {
    setMessage("分類資料載入失敗，請稍後再試");
    return;
  }

  saveBtn.disabled = true;
  setMessage("儲存中...");

  let nextImageUrl = currentImageUrl;
  if (imageInput.files && imageInput.files[0]) {
    const file = imageInput.files[0];
    const filePath = currentUser.id + "/" + Date.now() + "-" + file.name;
    const uploadResult = await supabaseClient.storage
      .from("products")
      .upload(filePath, file);

    if (uploadResult.error) {
      setMessage("圖片上傳失敗：" + (uploadResult.error.message || "請稍後再試"));
      saveBtn.disabled = false;
      return;
    }

    nextImageUrl = supabaseClient.storage
      .from("products")
      .getPublicUrl(filePath).data.publicUrl;
  }

  const payload = {
    title: title,
    price: price,
    description: description || null,
    category_id: Number(selectedCategory.id),
    is_anonymous: anonymousInput.checked,
  };

  if (imageInput.files && imageInput.files[0]) {
    payload.image = nextImageUrl;
  }

  let result = await supabaseClient
    .from("products")
    .update(payload)
    .eq("id", currentProduct.id)
    .eq("seller_id", currentUser.id);

  if (result.error && String(result.error.message).indexOf("is_anonymous") !== -1) {
    delete payload.is_anonymous;
    result = await supabaseClient
      .from("products")
      .update(payload)
      .eq("id", currentProduct.id)
      .eq("seller_id", currentUser.id);
  }

  if (result.error && String(result.error.message).indexOf("category_id") !== -1) {
    delete payload.category_id;
    result = await supabaseClient
      .from("products")
      .update(payload)
      .eq("id", currentProduct.id)
      .eq("seller_id", currentUser.id);
  }

  if (result.error) {
    setMessage("儲存失敗：" + (result.error.message || "請稍後再試"));
    saveBtn.disabled = false;
    return;
  }

  setMessage("已儲存");
  window.location.href = "/my-products/";
});

loadPage();
