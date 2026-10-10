function pathFromPublicUrl(bucket, url) {
  const marker = "/object/public/" + bucket + "/";
  const index = String(url || "").indexOf(marker);
  if (index === -1) {
    return "";
  }
  return decodeURIComponent(String(url).slice(index + marker.length).split("?")[0]);
}

function addPath(list, value) {
  if (value && list.indexOf(value) === -1) {
    list.push(value);
  }
}

async function listFolder(supabase, bucket, userId) {
  const paths = [];
  let offset = 0;

  while (offset < 500) {
    const listed = await supabase.storage.from(bucket).list(userId, {
      limit: 100,
      offset: offset,
    });
    if (listed.error || !listed.data || listed.data.length === 0) {
      break;
    }
    listed.data.forEach(function (file) {
      if (file && file.name && file.name !== ".emptyFolderPlaceholder") {
        paths.push(userId + "/" + file.name);
      }
    });
    if (listed.data.length < 100) {
      break;
    }
    offset = offset + 100;
  }

  return paths;
}

export async function deleteSignedInAccount(supabase) {
  const userResult = await supabase.auth.getUser();
  const userId = userResult.data.user && userResult.data.user.id;
  if (!userId) {
    return { ok: false, message: "請先登入" };
  }

  const products = await supabase
    .from("products_for_client")
    .select("image, image_2")
    .eq("seller_id", userId);
  const profile = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  const verifies = await supabase
    .from("school_verify_requests")
    .select("image_path")
    .eq("user_id", userId);

  const productPaths = [];
  const avatarPaths = [];
  const verifyPaths = [];

  (products.data || []).forEach(function (row) {
    addPath(productPaths, pathFromPublicUrl("products", row.image));
    addPath(productPaths, pathFromPublicUrl("products", row.image_2));
  });
  addPath(avatarPaths, pathFromPublicUrl("avatars", profile.data && profile.data.avatar_url));
  (verifies.data || []).forEach(function (row) {
    addPath(verifyPaths, row.image_path);
  });

  const folders = await Promise.all([
    listFolder(supabase, "products", userId),
    listFolder(supabase, "avatars", userId),
    listFolder(supabase, "school-verify", userId),
  ]);
  folders[0].forEach(function (path) {
    addPath(productPaths, path);
  });
  folders[1].forEach(function (path) {
    addPath(avatarPaths, path);
  });
  folders[2].forEach(function (path) {
    addPath(verifyPaths, path);
  });

  const jobs = [
    ["products", productPaths],
    ["avatars", avatarPaths],
    ["school-verify", verifyPaths],
  ];

  for (let index = 0; index < jobs.length; index = index + 1) {
    if (jobs[index][1].length === 0) {
      continue;
    }
    const removed = await supabase.storage.from(jobs[index][0]).remove(jobs[index][1]);
    if (removed.error) {
      return { ok: false, message: "圖片刪除失敗，帳號尚未刪除。" };
    }
  }

  const deleted = await supabase.rpc("delete_own_account");
  if (deleted.error) {
    return { ok: false, message: "刪除失敗，請稍後再試。" };
  }
  await supabase.auth.signOut({ scope: "local" });
  return { ok: true };
}
