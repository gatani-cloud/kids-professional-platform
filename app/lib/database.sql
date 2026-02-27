-- Kids Professional Platform Database Schema
-- Step 1: プロフェッショナル登録・掲載機能のためのMVP

-- プロフェッショナル基本情報テーブル
CREATE TABLE professionals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- 基本情報
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL, -- 表示名（ニックネーム可）
    full_name TEXT, -- 本名（非公開、管理用）
    phone TEXT, -- 電話番号（非公開、管理用）
    
    -- 活動情報
    activity_area TEXT NOT NULL, -- 活動エリア
    target_age_min INTEGER, -- 対応年齢下限
    target_age_max INTEGER, -- 対応年齢上限
    
    -- サービス形式
    service_format TEXT DEFAULT 'both', -- 'online', 'offline', 'both'
    
    -- 自己紹介・説明
    bio TEXT, -- 自己紹介文
    teaching_philosophy TEXT, -- 指導方針・教育理念
    
    -- 料金情報（目安）
    hourly_rate_min INTEGER, -- 時給最低額
    hourly_rate_max INTEGER, -- 時給最高額
    price_note TEXT, -- 料金に関する補足説明
    
    -- ステータス管理
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    is_published BOOLEAN DEFAULT FALSE, -- 公開フラグ
    
    -- プロフィール画像
    profile_image_url TEXT,
    
    -- SNSリンク
    instagram_url TEXT,
    twitter_url TEXT,
    facebook_url TEXT,
    youtube_url TEXT,
    website_url TEXT,
    
    -- システム管理
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by INTEGER, -- 承認者ID
    
    -- メタデータ
    view_count INTEGER DEFAULT 0,
    last_login DATETIME
);

-- プロフェッショナルカテゴリテーブル
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- プロフェッショナル-カテゴリ関連テーブル（多対多）
CREATE TABLE professional_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id INTEGER REFERENCES professionals(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE, -- メインカテゴリかどうか
    UNIQUE(professional_id, category_id)
);

-- スキル・資格テーブル
CREATE TABLE professional_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id INTEGER REFERENCES professionals(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    skill_type TEXT NOT NULL, -- 'qualification', 'skill', 'experience'
    description TEXT,
    certification_url TEXT, -- 証明書画像URL
    acquired_date DATE,
    expiry_date DATE,
    issuer TEXT, -- 発行機関
    is_verified BOOLEAN DEFAULT FALSE
);

-- ポートフォリオテーブル
CREATE TABLE portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id INTEGER REFERENCES professionals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    media_type TEXT NOT NULL, -- 'image', 'video', 'link', 'document'
    media_url TEXT NOT NULL,
    thumbnail_url TEXT, -- サムネイル（動画の場合など）
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 管理者テーブル
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin', -- 'admin', 'super_admin'
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 審査ログテーブル
CREATE TABLE approval_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id INTEGER REFERENCES professionals(id),
    admin_id INTEGER REFERENCES admins(id),
    action TEXT NOT NULL, -- 'approved', 'rejected', 'suspended'
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 基本カテゴリデータの挿入
INSERT INTO categories (name, slug, description, sort_order) VALUES 
('学習・教育', 'education', '個別指導、受験対策、特別支援教育', 1),
('保育・託児', 'childcare', 'ベビーシッター、病児保育、一時保育', 2),
('音楽・芸術', 'music-arts', '楽器指導、美術、工作、創作活動', 3),
('スポーツ', 'sports', '個人コーチング、専門技術指導', 4),
('語学', 'language', '英会話、多言語学習、国際理解', 5),
('STEAM教育', 'steam', 'プログラミング、科学実験、工学', 6),
('エンターテイメント', 'entertainment', 'パフォーマー、マジック、イベント', 7),
('企業支援', 'business-support', 'Web制作、動画制作、マーケティング', 8);

-- サブカテゴリの追加
INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES 
-- 学習・教育のサブカテゴリ
('小学生指導', 'elementary', '小学生向けの学習指導', 1, 1),
('中学受験対策', 'junior-exam', '中学受験に特化した指導', 1, 2),
('特別支援教育', 'special-needs', '発達障害・学習障害支援', 1, 3),

-- 音楽・芸術のサブカテゴリ
('ピアノ', 'piano', 'ピアノレッスン・指導', 3, 1),
('絵画・工作', 'art-craft', '絵画、工作、手芸指導', 3, 2),
('声楽・合唱', 'vocal', '歌唱指導、合唱指導', 3, 3),

-- 企業支援のサブカテゴリ
('Web制作', 'web-design', '子ども向けWebサイト制作', 8, 1),
('動画制作', 'video-production', '教育・プロモーション動画制作', 8, 2),
('グラフィックデザイン', 'graphic-design', 'キャラクター・教材デザイン', 8, 3),
('マーケティング', 'marketing', '子育て世代向けマーケティング', 8, 4);

-- 管理者アカウント作成（初期設定）
INSERT INTO admins (email, password_hash, name, role) VALUES 
('admin@kids-platform.jp', '$2b$12$placeholder_hash', 'システム管理者', 'super_admin');

-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_professionals_status ON professionals(status);
CREATE INDEX idx_professionals_published ON professionals(is_published);
CREATE INDEX idx_professionals_category ON professional_categories(category_id);
CREATE INDEX idx_professionals_area ON professionals(activity_area);
CREATE INDEX idx_professionals_age_range ON professionals(target_age_min, target_age_max);