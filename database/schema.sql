-- Kids Professional Platform Database Schema for Supabase
-- Run this SQL in Supabase SQL Editor

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_code VARCHAR(7) DEFAULT '#333333',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert default categories
INSERT INTO categories (name, description, color_code) VALUES
('学習・教育', '学習指導、受験対策、学習サポート', '#ffeb3b'),
('スポーツ', '体育指導、スポーツクラブ、運動教室', '#ff9800'),
('音楽・芸術', '音楽レッスン、美術指導、芸術活動', '#e91e63'),
('プログラミング・STEM', 'プログラミング教育、科学実験、技術指導', '#9c27b0'),
('語学', '英語教育、多言語指導、国際交流', '#3f51b5'),
('ライフスキル', '生活指導、マナー教育、実生活スキル', '#00bcd4'),
('メンタルサポート', 'カウンセリング、心理サポート、発達支援', '#4caf50'),
('企業支援', 'Webサイト制作、動画制作、マーケティング支援', '#795548')
ON CONFLICT (name) DO NOTHING;

-- Professionals table
CREATE TABLE IF NOT EXISTS professionals (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    display_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    activity_area VARCHAR(100) NOT NULL,
    target_age_min INTEGER DEFAULT 0,
    target_age_max INTEGER DEFAULT 18,
    service_format VARCHAR(20) CHECK (service_format IN ('online', 'offline', 'both')) DEFAULT 'both',
    bio TEXT NOT NULL,
    teaching_philosophy TEXT,
    hourly_rate_min INTEGER,
    hourly_rate_max INTEGER,
    price_note TEXT,
    instagram_url VARCHAR(255),
    twitter_url VARCHAR(255),
    facebook_url VARCHAR(255),
    youtube_url VARCHAR(255),
    website_url VARCHAR(255),
    profile_image_url VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')) DEFAULT 'pending',
    is_published BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Professional categories junction table
CREATE TABLE IF NOT EXISTS professional_categories (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER REFERENCES professionals(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(professional_id, category_id)
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER REFERENCES professionals(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_level VARCHAR(20) CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')) DEFAULT 'intermediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER REFERENCES professionals(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    project_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER REFERENCES professionals(id) ON DELETE CASCADE,
    certification_name VARCHAR(200) NOT NULL,
    issuing_organization VARCHAR(200),
    issue_date DATE,
    expiry_date DATE,
    certificate_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_professionals_status ON professionals(status);
CREATE INDEX IF NOT EXISTS idx_professionals_published ON professionals(is_published);
CREATE INDEX IF NOT EXISTS idx_professionals_area ON professionals(activity_area);
CREATE INDEX IF NOT EXISTS idx_professionals_email ON professionals(email);
CREATE INDEX IF NOT EXISTS idx_professional_categories_professional ON professional_categories(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_categories_category ON professional_categories(category_id);

-- Insert sample professionals
INSERT INTO professionals (
    email, display_name, full_name, activity_area, target_age_min, target_age_max, 
    service_format, bio, teaching_philosophy, hourly_rate_min, hourly_rate_max, 
    status, is_published, view_count
) VALUES 
(
    'tanaka@example.com', '田中美咲', '田中美咲', '関東地方', 3, 14, 'both',
    '音楽大学卒業後、10年間で100名以上のお子さまを指導。楽しく学べる個別レッスンが人気です。',
    '楽しく学ぶことを大切にし、一人ひとりの個性や学習ペースに合わせた指導を心がけています。',
    3000, 5000, 'approved', true, 42
),
(
    'sato@example.com', '佐藤健太', '佐藤健太', '関東地方', 6, 14, 'offline',
    '元小学校教員。15年の指導経験で中学受験合格率95%。お子さまのやる気を引き出す指導が得意です。',
    '基礎学力の向上と共に、学習への興味関心を育むことを大切にしています。',
    4000, 6000, 'approved', true, 28
),
(
    'yamada@example.com', '山田リナ', '山田リナ', '全国', 0, 99, 'online',
    '子ども向けサービス企業のWebサイト制作専門。直感的で安全なUI設計により、子どもたちが使いやすいサイトを作成します。',
    'ユーザビリティと安全性を重視した子ども向けWebデザインを提供します。',
    80000, 150000, 'approved', true, 15
)
ON CONFLICT (email) DO NOTHING;

-- Insert professional categories relationships
INSERT INTO professional_categories (professional_id, category_id, is_primary)
SELECT p.id, c.id, true
FROM professionals p, categories c
WHERE (p.email = 'tanaka@example.com' AND c.name = '音楽・芸術')
   OR (p.email = 'sato@example.com' AND c.name = '学習・教育')
   OR (p.email = 'yamada@example.com' AND c.name = '企業支援')
ON CONFLICT (professional_id, category_id) DO NOTHING;

-- Insert sample skills
INSERT INTO skills (professional_id, skill_name, skill_level)
SELECT p.id, skill, 'expert'
FROM professionals p,
     UNNEST(ARRAY['ピアノ演奏', '音楽理論', '楽典', 'ソルフェージュ']) AS skill
WHERE p.email = 'tanaka@example.com'
UNION ALL
SELECT p.id, skill, 'expert'
FROM professionals p,
     UNNEST(ARRAY['小学校教諭', '中学受験指導', '算数', '国語']) AS skill
WHERE p.email = 'sato@example.com'
UNION ALL
SELECT p.id, skill, 'expert'
FROM professionals p,
     UNNEST(ARRAY['UI/UXデザイン', 'フロントエンド開発', 'WordPress', '子ども向けデザイン']) AS skill
WHERE p.email = 'yamada@example.com';

-- Enable Row Level Security (RLS)
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to approved professionals
CREATE POLICY "Public read access to approved professionals" ON professionals
    FOR SELECT USING (status = 'approved' AND is_published = true);

CREATE POLICY "Public read access to categories" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Public read access to professional categories" ON professional_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM professionals 
            WHERE professionals.id = professional_categories.professional_id 
            AND professionals.status = 'approved' 
            AND professionals.is_published = true
        )
    );

-- Allow anonymous inserts for new applications (will be moderated)
CREATE POLICY "Allow anonymous inserts for applications" ON professionals
    FOR INSERT WITH CHECK (status = 'pending' AND is_published = false);

CREATE POLICY "Allow inserts for professional categories" ON professional_categories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow inserts for skills" ON skills
    FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON professionals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();