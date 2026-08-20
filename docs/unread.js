// 未讀訊息：計算數量、更新導覽紅點、進入對話後標成已讀

async function countUnreadMessages() {
  const userResult = await supabaseClient.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    return 0;
  }

  // 別人寄給我、而且還沒讀的訊息
  const result = await supabaseClient
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
    .neq("sender_id", user.id);

  if (result.error) {
    console.error(result.error);
    return 0;
  }

  return result.count || 0;
}

function formatUnreadBadgeText(count) {
  if (count <= 0) {
    return "";
  }

  if (count > 99) {
    return "99+";
  }

  return String(count);
}

// 在「我的訊息」連結旁顯示未讀數字（沒有未讀就隱藏）
function renderMessagesNavBadges(count) {
  const links = document.querySelectorAll('[data-nav="messages"]');
  const text = formatUnreadBadgeText(count);

  links.forEach(function (link) {
    let badge = link.querySelector(".nav-unread-badge");

    if (!text) {
      if (badge) {
        badge.remove();
      }
      return;
    }

    if (!badge) {
      badge = document.createElement("span");
      badge.className = "nav-unread-badge";
      link.appendChild(badge);
    }

    badge.textContent = text;
  });
}

async function refreshMessagesNavBadges() {
  const count = await countUnreadMessages();
  renderMessagesNavBadges(count);
  return count;
}

// 進入某則對話後，把「別人寄給我的未讀」全部標成已讀
async function markConversationAsRead(conversationId) {
  const userResult = await supabaseClient.auth.getUser();
  const user = userResult.data.user;

  if (!user || !conversationId) {
    return false;
  }

  const result = await supabaseClient
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", user.id);

  if (result.error) {
    console.error(result.error);
    return false;
  }

  return true;
}
