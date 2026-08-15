const emptyMessage = document.getElementById("empty-message");
const conversationList = document.getElementById("conversation-list");

async function loadConversations() {
  const userResult = await supabaseClient.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    alert("請先登入");
    window.location.href = "login.html";
    return;
  }

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

  conversationList.textContent = "";
  const rows = result.data || [];

  rows.forEach(function (row) {
    const link = document.createElement("a");
    link.className = "conversation-item";
    link.href = "chat.html?id=" + row.id;

    const title = document.createElement("h3");
    title.textContent =
      (row.products && row.products.title) || "商品對話";

    const meta = document.createElement("p");
    const role = row.buyer_id === user.id ? "你是買家" : "你是賣家";
    meta.textContent = role;

    link.appendChild(title);
    link.appendChild(meta);
    conversationList.appendChild(link);
  });

  if (rows.length === 0) {
    emptyMessage.textContent = "目前還沒有訊息";
    emptyMessage.classList.remove("hidden");
  } else {
    emptyMessage.classList.add("hidden");
  }
}

loadConversations();
