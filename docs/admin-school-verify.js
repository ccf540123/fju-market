const gateEl = document.getElementById("admin-gate");
const panelEl = document.getElementById("admin-panel");
const listEl = document.getElementById("request-list");
const statusEl = document.getElementById("admin-status");
const filterRow = document.getElementById("filter-row");
const previewMask = document.getElementById("preview-mask");
const previewImage = document.getElementById("preview-image");
const rejectMask = document.getElementById("reject-mask");
const rejectNote = document.getElementById("reject-note");
const rejectConfirm = document.getElementById("reject-confirm");
const rejectCancel = document.getElementById("reject-cancel");

let currentFilter = "pending";
let rejectTargetId = "";
let busyId = "";

function statusLabel(status) {
  if (status === "pending") {
    return "待審核";
  }
  if (status === "approved") {
    return "已通過";
  }
  if (status === "rejected") {
    return "已拒絕";
  }
  return status || "未知";
}

function documentTypeLabel(documentType) {
  if (documentType === "diploma") {
    return "畢業證明";
  }
  return "學生證";
}

function setStatus(text, type) {
  statusEl.textContent = text || "";
  statusEl.className = type ? "form-message " + type : "form-message";
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function requireAdmin() {
  const userResult = await supabaseClient.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    window.location.href = "/login/";
    return false;
  }

  const adminResult = await supabaseClient.rpc("is_wayfloo_admin");
  if (adminResult.error || adminResult.data !== true) {
    gateEl.textContent =
      "你沒有管理員權限。請確認 app_metadata.role = admin，並重新登入。";
    return false;
  }

  gateEl.classList.add("hidden");
  panelEl.classList.remove("hidden");
  return true;
}

async function getSignedImageUrl(imagePath) {
  if (!imagePath) {
    return "";
  }

  const result = await supabaseClient.storage
    .from("school-verify")
    .createSignedUrl(imagePath, 3600);

  if (result.error) {
    console.error(result.error);
    return "";
  }

  return (result.data && result.data.signedUrl) || "";
}

async function loadRequests() {
  setStatus("載入中...");
  listEl.innerHTML = "";

  let query = supabaseClient
    .from("school_verify_requests")
    .select(
      "id, user_id, school_id, student_id, document_type, image_path, status, created_at, reviewed_at, review_note, profiles(display_name, avatar_url), schools(name)"
    )
    .order("created_at", { ascending: false });

  if (currentFilter !== "all") {
    query = query.eq("status", currentFilter);
  }

  const result = await query;
  if (result.error) {
    console.error(result.error);
    setStatus("載入申請失敗（可能沒有管理員權限）", "error");
    return;
  }

  const rows = result.data || [];
  if (rows.length === 0) {
    setStatus("目前沒有申請");
    return;
  }

  setStatus("");

  let html = "";
  let index = 0;

  while (index < rows.length) {
    const row = rows[index];
    const profile = row.profiles || {};
    const school = row.schools || {};
    const imageUrl = await getSignedImageUrl(row.image_path);
    const createdAt = row.created_at
      ? new Date(row.created_at).toLocaleString("zh-TW")
      : "";

    html +=
      '<article class="request-card" data-id="' +
      escapeHtml(row.id) +
      '">' +
      '<div class="request-top">' +
      '<img class="request-avatar" alt="" src="' +
      escapeHtml(
        profile.avatar_url ||
          "https://placehold.co/96x96/f0f0f0/666666?text=頭像"
      ) +
      '">' +
      '<div class="request-meta">' +
      '<p class="request-name">' +
      escapeHtml(profile.display_name || "未設定暱稱") +
      "</p>" +
      '<p class="request-line">' +
      escapeHtml(school.name || "未知學校") +
      " · 學號 " +
      escapeHtml(row.student_id || "—") +
      "</p>" +
      '<p class="request-line">' +
      escapeHtml(documentTypeLabel(row.document_type)) +
      " · " +
      escapeHtml(createdAt) +
      "</p>" +
      '<p class="request-status">' +
      escapeHtml(statusLabel(row.status)) +
      "</p>" +
      "</div></div>";

    if (imageUrl) {
      html +=
        '<img class="request-image" data-preview="' +
        escapeHtml(imageUrl) +
        '" src="' +
        escapeHtml(imageUrl) +
        '" alt="學生證">' +
        '<p class="request-image-hint">點擊可放大查看</p>';
    } else {
      html += '<p class="request-line">無法載入學生證圖片</p>';
    }

    if (row.status === "rejected" && row.review_note) {
      html +=
        '<p class="request-note">拒絕原因：' +
        escapeHtml(row.review_note) +
        "</p>";
    }

    if (row.status === "pending") {
      html +=
        '<div class="request-actions">' +
        '<button type="button" class="box auth-submit approve-btn">通過</button>' +
        '<button type="button" class="admin-reject-btn reject-btn">拒絕</button>' +
        "</div>";
    }

    html += "</article>";
    index = index + 1;
  }

  listEl.innerHTML = html;
}

async function handleApprove(requestId) {
  if (busyId) {
    return;
  }

  const ok = window.confirm("確認通過這筆申請？");
  if (!ok) {
    return;
  }

  busyId = requestId;
  setStatus("通過處理中...");

  const result = await supabaseClient.rpc("approve_school_verify_request", {
    p_request_id: requestId,
  });

  busyId = "";

  if (result.error) {
    console.error(result.error);
    setStatus(result.error.message || "通過失敗", "error");
    return;
  }

  setStatus("已通過", "success");
  await loadRequests();
}

function openReject(requestId) {
  rejectTargetId = requestId;
  rejectNote.value = "";
  rejectMask.classList.remove("hidden");
  rejectNote.focus();
}

async function handleReject() {
  if (!rejectTargetId || busyId) {
    return;
  }

  const note = rejectNote.value.trim();
  if (!note) {
    alert("請填寫拒絕原因");
    return;
  }

  busyId = rejectTargetId;
  setStatus("拒絕處理中...");

  const result = await supabaseClient.rpc("reject_school_verify_request", {
    p_request_id: rejectTargetId,
    p_review_note: note,
  });

  busyId = "";
  rejectMask.classList.add("hidden");
  rejectTargetId = "";

  if (result.error) {
    console.error(result.error);
    setStatus(result.error.message || "拒絕失敗", "error");
    return;
  }

  setStatus("已拒絕", "success");
  await loadRequests();
}

filterRow.addEventListener("click", function (event) {
  const button = event.target.closest("[data-filter]");
  if (!button) {
    return;
  }

  currentFilter = button.getAttribute("data-filter");
  const chips = filterRow.querySelectorAll(".filter-chip");
  let i = 0;
  while (i < chips.length) {
    chips[i].classList.toggle(
      "is-on",
      chips[i].getAttribute("data-filter") === currentFilter
    );
    i = i + 1;
  }
  loadRequests();
});

listEl.addEventListener("click", function (event) {
  const preview = event.target.closest("[data-preview]");
  if (preview) {
    previewImage.src = preview.getAttribute("data-preview");
    previewMask.classList.remove("hidden");
    return;
  }

  const card = event.target.closest(".request-card");
  if (!card) {
    return;
  }

  const requestId = card.getAttribute("data-id");
  if (event.target.closest(".approve-btn")) {
    handleApprove(requestId);
    return;
  }
  if (event.target.closest(".reject-btn")) {
    openReject(requestId);
  }
});

previewMask.addEventListener("click", function () {
  previewMask.classList.add("hidden");
  previewImage.src = "";
});

rejectCancel.addEventListener("click", function () {
  rejectMask.classList.add("hidden");
  rejectTargetId = "";
});

rejectConfirm.addEventListener("click", handleReject);

async function start() {
  const ok = await requireAdmin();
  if (!ok) {
    return;
  }
  await loadRequests();
}

start();
