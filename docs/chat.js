const chatTitle = document.getElementById("chat-title");
const chatStatus = document.getElementById("chat-status");
const chatBox = document.getElementById("chat-box");
const messageList = document.getElementById("message-list");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");

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
  messageList.scrollTop = messageList.scrollHeight;
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

        // 人在對話裡時，對方新訊息也立刻標成已讀
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
});

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
    .select("id, product_id, buyer_id, seller_id, products(title)")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationResult.error || !conversationResult.data) {
    console.error(conversationResult.error);
    chatStatus.textContent = "找不到這則對話，或你沒有權限查看";
    return;
  }

  const conversation = conversationResult.data;
  const productTitle =
    (conversation.products && conversation.products.title) || "商品聊天";

  chatTitle.textContent = productTitle;
  document.title = productTitle + "｜聊天";
  chatStatus.classList.add("hidden");
  chatBox.classList.remove("hidden");

  await loadMessages();
  await markConversationAsRead(conversationId);
  subscribeMessages();
}

initChat();
