const emptyMessage = document.getElementById("empty-message");
const conversationList = document.getElementById("conversation-list");

const DEFAULT_AVATAR =
  "https://placehold.co/48x48/f0f0f0/666666?text=頭像";

function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return date.toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOtherUserId(conversation, currentUserId) {
  if (currentUserId === conversation.buyer_id) {
    return conversation.seller_id;
  }

  if (currentUserId === conversation.seller_id) {
    return conversation.buyer_id;
  }

  return null;
}

function createConversationCard(
  conversation,
  currentUserId,
  profileById,
  lastMessageById,
  unreadCountById
) {
  const otherUserId = getOtherUserId(conversation, currentUserId);
  const profile = (otherUserId && profileById[otherUserId]) || null;
  const lastMessage = lastMessageById[conversation.id] || null;
  const unreadCount = unreadCountById[conversation.id] || 0;

  const displayName =
    (profile && profile.display_name) || "未知使用者";
  const avatarUrl =
    (profile && profile.avatar_url) || DEFAULT_AVATAR;
  const productTitle =
    (conversation.products && conversation.products.title) || "商品對話";
  const lastContent =
    (lastMessage && lastMessage.content) || "尚無訊息";
  const lastTime =
    (lastMessage && lastMessage.created_at) ||
    conversation.created_at;

  const link = document.createElement("a");
  link.className = "conversation-item";
  if (unreadCount > 0) {
    link.classList.add("has-unread");
  }
  link.href = "/chat/?id=" + conversation.id;

  const avatar = document.createElement("img");
  avatar.className = "conversation-avatar";
  avatar.src = avatarUrl;
  avatar.alt = displayName;

  const body = document.createElement("div");
  body.className = "conversation-body";

  const topRow = document.createElement("div");
  topRow.className = "conversation-top";

  const nameEl = document.createElement("h3");
  nameEl.className = "conversation-name";
  nameEl.textContent = displayName;

  const timeEl = document.createElement("span");
  timeEl.className = "conversation-time";
  timeEl.textContent = formatMessageTime(lastTime);

  topRow.appendChild(nameEl);
  topRow.appendChild(timeEl);

  const productEl = document.createElement("p");
  productEl.className = "conversation-product";
  productEl.textContent = "商品：" + productTitle;

  const previewEl = document.createElement("p");
  previewEl.className = "conversation-preview";
  previewEl.textContent = lastContent;

  body.appendChild(topRow);
  body.appendChild(productEl);
  body.appendChild(previewEl);

  link.appendChild(avatar);
  link.appendChild(body);

  if (unreadCount > 0) {
    const badge = document.createElement("span");
    badge.className = "conversation-unread-badge";
    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    link.appendChild(badge);
  }

  return link;
}

async function loadConversations() {
  const userResult = await supabaseClient.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    alert("請先登入");
    window.location.href = "/login/";
    return;
  }

  // 1) 先抓我參與的 conversations，並帶出商品名稱
  const result = await supabaseClient
    .from("conversations")
    .select("id, product_id, buyer_id, seller_id, created_at, products(title)")
    .or("buyer_id.eq." + user.id + ",seller_id.eq." + user.id)
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error(result.error);
    emptyMessage.textContent = "載入失敗，請稍後再試";
    return;
  }

  const rows = result.data || [];
  conversationList.textContent = "";

  if (rows.length === 0) {
    emptyMessage.textContent = "目前還沒有訊息";
    emptyMessage.classList.remove("hidden");
    return;
  }

  emptyMessage.classList.add("hidden");

  // 2) 收集對方的 user id
  const otherIds = [];
  const conversationIds = [];

  rows.forEach(function (row) {
    conversationIds.push(row.id);

    const otherId = getOtherUserId(row, user.id);
    if (otherId && otherIds.indexOf(otherId) === -1) {
      otherIds.push(otherId);
    }
  });

  // 3) 一次抓對方的 profiles（display_name / avatar_url）
  const profileById = {};

  if (otherIds.length > 0) {
    const profilesResult = await supabaseClient
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", otherIds);

    if (profilesResult.error) {
      console.error(profilesResult.error);
    } else {
      (profilesResult.data || []).forEach(function (profile) {
        profileById[profile.id] = profile;
      });
    }
  }

  // 4) 抓這些對話的訊息：最新一則當預覽，並計算未讀數
  const lastMessageById = {};
  const unreadCountById = {};

  if (conversationIds.length > 0) {
    const messagesResult = await supabaseClient
      .from("messages")
      .select("conversation_id, content, created_at, sender_id, is_read")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (messagesResult.error) {
      console.error(messagesResult.error);
    } else {
      (messagesResult.data || []).forEach(function (message) {
        if (!lastMessageById[message.conversation_id]) {
          lastMessageById[message.conversation_id] = message;
        }

        // 別人寄給我、且尚未讀
        if (message.sender_id !== user.id && message.is_read === false) {
          unreadCountById[message.conversation_id] =
            (unreadCountById[message.conversation_id] || 0) + 1;
        }
      });
    }
  }

  // 5) 依最後訊息時間排序（沒訊息就用 conversation 建立時間）
  rows.sort(function (a, b) {
    const timeA =
      (lastMessageById[a.id] && lastMessageById[a.id].created_at) ||
      a.created_at;
    const timeB =
      (lastMessageById[b.id] && lastMessageById[b.id].created_at) ||
      b.created_at;
    return new Date(timeB) - new Date(timeA);
  });

  rows.forEach(function (row) {
    const card = createConversationCard(
      row,
      user.id,
      profileById,
      lastMessageById,
      unreadCountById
    );
    conversationList.appendChild(card);
  });
}

loadConversations();
