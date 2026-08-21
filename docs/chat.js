const chatPeerName = document.getElementById("chat-peer-name");
const chatAvatar = document.getElementById("chat-avatar");
const chatProduct = document.getElementById("chat-product");
const chatStatus = document.getElementById("chat-status");
const chatBox = document.getElementById("chat-box");
const messageList = document.getElementById("message-list");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatShell = document.getElementById("chat-shell");

const DEFAULT_AVATAR =
  "https://placehold.co/48x48/f0f0f0/666666?text=頭像";

let currentUser = null;
let conversationId = null;
let shownMessageIds = {};

function formatTime(value) {
  const date = new Date(value);
  return date.toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price) {
  return "NT$" + Number(price).toLocaleString("zh-TW");
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

function scrollToLatest() {
  messageList.scrollTop = messageList.scrollHeight;
}

function fitChatHeight() {
  if (!chatShell || !window.visualViewport) {
    return;
  }

  // 手機鍵盤出現時，用實際可見高度，避免輸入框被擋住
  chatShell.style.height = window.visualViewport.height + "px";
}

function resizeInput() {
  messageInput.style.height = "auto";
  const nextHeight = Math.min(messageInput.scrollHeight, 120);
  messageInput.style.height = nextHeight + "px";
}

function appendMessage(message) {
  if (shownMessageIds[message.id]) {
    return;
  }

  shownMessageIds[message.id] = true;

  const item = document.createElement("div");
  item.className = "message-item";
  if (message.sender_id === currentUser.id) {
    item.classList.add("mine");
  }

  const meta = document.createElement("p");
  meta.className = "message-meta";
  meta.textContent =
    (message.sender_id === currentUser.id ? "我" : "對方") +
    " · " +
    formatTime(message.created_at);

  const content = document.createElement("p");
  content.className = "message-content";
  content.textContent = message.content;

  item.appendChild(meta);
  item.appendChild(content);
  messageList.appendChild(item);
  scrollToLatest();
}

async function loadMessages() {
  const result = await supabaseClient
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (result.error) {
    console.error(result.error);
    chatStatus.textContent = "訊息載入失敗";
    return;
  }

  messageList.textContent = "";
  shownMessageIds = {};

  result.data.forEach(function (message) {
    appendMessage(message);
  });

  scrollToLatest();
}

function subscribeMessages() {
  supabaseClient
    .channel("chat-" + conversationId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "conversation_id=eq." + conversationId,
      },
      function (payload) {
        appendMessage(payload.new);

        if (payload.new.sender_id !== currentUser.id) {
          markConversationAsRead(conversationId);
        }
      }
    )
    .subscribe();
}

chatForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const content = messageInput.value.trim();
  if (!content) {
    return;
  }

  const result = await supabaseClient
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content: content,
    })
    .select("*")
    .single();

  if (result.error) {
    console.error(result.error);
    alert("訊息送出失敗，請稍後再試");
    return;
  }

  appendMessage(result.data);
  messageInput.value = "";
  resizeInput();
  messageInput.focus();
});

messageInput.addEventListener("input", resizeInput);

async function initChat() {
  const params = new URLSearchParams(window.location.search);
  conversationId = params.get("id");

  if (!conversationId) {
    chatStatus.textContent = "找不到對話";
    return;
  }

  const userResult = await supabaseClient.auth.getUser();
  currentUser = userResult.data.user;

  if (!currentUser) {
    alert("請先登入");
    window.location.href = "/login/";
    return;
  }

  const conversationResult = await supabaseClient
    .from("conversations")
    .select("id, product_id, buyer_id, seller_id, products(title, price)")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationResult.error || !conversationResult.data) {
    console.error(conversationResult.error);
    chatStatus.textContent = "找不到這則對話，或你沒有權限查看";
    return;
  }

  const conversation = conversationResult.data;
  const otherUserId = getOtherUserId(conversation, currentUser.id);

  let peerName = "未知使用者";
  let peerAvatar = DEFAULT_AVATAR;

  if (otherUserId) {
    const profileResult = await supabaseClient
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", otherUserId)
      .maybeSingle();

    if (profileResult.data) {
      peerName = profileResult.data.display_name || peerName;
      peerAvatar = profileResult.data.avatar_url || peerAvatar;
    }
  }

  const product = conversation.products || null;
  const productTitle = (product && product.title) || "商品聊天";
  let productLine = productTitle;
  if (product && product.price !== null && product.price !== undefined) {
    productLine = productTitle + " · " + formatPrice(product.price);
  }

  chatPeerName.textContent = peerName;
  chatAvatar.src = peerAvatar;
  chatAvatar.alt = peerName;
  chatProduct.textContent = productLine;
  document.title = peerName + "｜聊天";

  chatStatus.classList.add("hidden");
  chatBox.classList.remove("hidden");

  await loadMessages();
  await markConversationAsRead(conversationId);
  subscribeMessages();
  resizeInput();
}

if (window.visualViewport) {
  fitChatHeight();
  window.visualViewport.addEventListener("resize", fitChatHeight);
  window.visualViewport.addEventListener("scroll", fitChatHeight);
}

initChat();
