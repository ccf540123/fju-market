// 輔大二手交易平台 - 資料庫 Schema
// 適用於 PostgreSQL（也可依需求改為 MySQL）

-- ========== 使用者 ==========
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,          -- 必須為 @go.fju.edu.tw
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    student_id      VARCHAR(20),                           -- 學號（選填）
    avatar_url      TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,        -- 學校信箱是否已驗證
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 信箱驗證 ==========
CREATE TABLE email_verifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(128) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 商品分類 ==========
CREATE TABLE categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,           -- 例如：書籍、3C、生活用品
    slug            VARCHAR(50) NOT NULL UNIQUE,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

-- ========== 商品 ==========
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    seller_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES categories(id),
    title           VARCHAR(120) NOT NULL,
    description     TEXT NOT NULL,
    price           INTEGER NOT NULL CHECK (price >= 0),   -- 以新台幣整數儲存
    condition       VARCHAR(20) NOT NULL DEFAULT 'used',   -- new / like_new / used
    status          VARCHAR(20) NOT NULL DEFAULT 'available', -- available / reserved / sold
    view_count      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 商品圖片 ==========
CREATE TABLE product_images (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 收藏 ==========
CREATE TABLE favorites (
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);

-- ========== 訂單 / 交易 ==========
CREATE TABLE orders (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id),
    buyer_id        INTEGER NOT NULL REFERENCES users(id),
    seller_id       INTEGER NOT NULL REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending / completed / cancelled
    meet_location   VARCHAR(120),                          -- 面交地點
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ========== 聊天訊息（進階功能） ==========
CREATE TABLE conversations (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, buyer_id, seller_id)
);

CREATE TABLE messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 常用索引 ==========
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- ========== 初始分類資料 ==========
INSERT INTO categories (name, slug, sort_order) VALUES
    ('書籍', 'books', 1),
    ('3C 電子', 'electronics', 2),
    ('生活用品', 'daily', 3),
    ('服飾', 'clothing', 4),
    ('其他', 'others', 5);
