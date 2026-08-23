var PUBLIC_PROFILE_FIELDS =
  "display_name, avatar_url, department, grade, bio, school_id";

function keepListedProducts(products) {
  return (products || []).filter(function (product) {
    return product.is_listed !== false;
  });
}

function formatRelativeTime(value) {
  if (!value) {
    return "";
  }

  var date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  var now = new Date();
  var diffMs = now.getTime() - date.getTime();
  var diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "剛剛";
  }
  if (diffMinutes < 60) {
    return String(diffMinutes) + " 分鐘前";
  }

  var diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return String(diffHours) + " 小時前";
  }

  var startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  var startOfThatDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  var dayDiff = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / 86400000
  );

  if (dayDiff === 1) {
    return "昨天";
  }

  return date.getMonth() + 1 + "/" + date.getDate();
}
