// Supabase 連線設定（anon key 可以放在前端）
const SUPABASE_URL = "https://owrxcatcniqhnatzuqwf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cnhjYXRjbmlxaG5hdHp1cXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzUxNTAsImV4cCI6MjEwMjIxMTE1MH0.ZXA8R8gOsrvEGNTY6pDltRWGwToe8wZHIoA8a2NQbe4";

// 建立連線，之後用 supabaseClient 讀寫資料
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
