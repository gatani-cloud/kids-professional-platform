const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,  // Disable CSP for demo
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}
if (!fs.existsSync('uploads/profiles')) {
    fs.mkdirSync('uploads/profiles', { recursive: true });
}
if (!fs.existsSync('uploads/certifications')) {
    fs.mkdirSync('uploads/certifications', { recursive: true });
}

// Database connection
const db = new sqlite3.Database('app.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'profile_image') {
            cb(null, 'uploads/profiles/');
        } else if (file.fieldname === 'certifications') {
            cb(null, 'uploads/certifications/');
        } else {
            cb(null, 'uploads/');
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'profile_image') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('プロフィール画像は画像ファイルのみアップロード可能です'), false);
            }
        } else if (file.fieldname === 'certifications') {
            if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
                cb(null, true);
            } else {
                cb(new Error('資格証明書は画像またはPDFファイルのみアップロード可能です'), false);
            }
        } else {
            cb(null, true);
        }
    }
});

// API Routes

// Get all professionals for directory
app.get('/api/professionals', (req, res) => {
    const { category, area, keyword, age } = req.query;
    
    let query = `
        SELECT 
            p.id, p.display_name, p.activity_area, p.target_age_min, p.target_age_max,
            p.service_format, p.bio, p.hourly_rate_min, p.hourly_rate_max, p.profile_image_url,
            p.view_count, p.created_at,
            GROUP_CONCAT(c.name) as categories
        FROM professionals p
        LEFT JOIN professional_categories pc ON p.id = pc.professional_id
        LEFT JOIN categories c ON pc.category_id = c.id
        WHERE p.is_published = 1 AND p.status = 'approved'
    `;
    
    const params = [];
    
    if (category) {
        query += ' AND c.slug = ?';
        params.push(category);
    }
    
    if (area && area !== '全国') {
        query += ' AND p.activity_area = ?';
        params.push(area);
    }
    
    if (keyword) {
        query += ' AND (p.display_name LIKE ? OR p.bio LIKE ? OR c.name LIKE ?)';
        const keywordParam = `%${keyword}%`;
        params.push(keywordParam, keywordParam, keywordParam);
    }
    
    query += ' GROUP BY p.id ORDER BY p.created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'データベースエラーが発生しました' });
        } else {
            res.json(rows);
        }
    });
});

// Get single professional by ID
app.get('/api/professionals/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            p.*, 
            GROUP_CONCAT(DISTINCT c.name) as categories,
            GROUP_CONCAT(DISTINCT ps.skill_name) as skills
        FROM professionals p
        LEFT JOIN professional_categories pc ON p.id = pc.professional_id
        LEFT JOIN categories c ON pc.category_id = c.id
        LEFT JOIN professional_skills ps ON p.id = ps.professional_id
        WHERE p.id = ? AND p.is_published = 1 AND p.status = 'approved'
        GROUP BY p.id
    `;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'データベースエラーが発生しました' });
        } else if (!row) {
            res.status(404).json({ error: 'プロフェッショナルが見つかりません' });
        } else {
            // Update view count
            db.run('UPDATE professionals SET view_count = view_count + 1 WHERE id = ?', [id]);
            res.json(row);
        }
    });
});

// Register new professional
app.post('/api/professionals/register', upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'certifications', maxCount: 5 }
]), async (req, res) => {
    try {
        const {
            email, password, display_name, full_name, phone, activity_area,
            target_age_min, target_age_max, service_format, bio, teaching_philosophy,
            skills, hourly_rate_min, hourly_rate_max, price_note,
            instagram_url, twitter_url, facebook_url, youtube_url, website_url,
            categories
        } = req.body;
        
        // Hash password
        const password_hash = await bcrypt.hash(password, 12);
        
        // Handle uploaded files
        let profile_image_url = null;
        if (req.files && req.files.profile_image) {
            profile_image_url = `/uploads/profiles/${req.files.profile_image[0].filename}`;
        }
        
        // Insert professional
        const query = `
            INSERT INTO professionals (
                email, password_hash, display_name, full_name, phone,
                activity_area, target_age_min, target_age_max, service_format,
                bio, teaching_philosophy, hourly_rate_min, hourly_rate_max, price_note,
                profile_image_url, instagram_url, twitter_url, facebook_url, 
                youtube_url, website_url, status, is_published
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
        `;
        
        db.run(query, [
            email, password_hash, display_name, full_name, phone,
            activity_area, target_age_min || null, target_age_max || null, service_format,
            bio, teaching_philosophy, hourly_rate_min || null, hourly_rate_max || null, price_note,
            profile_image_url, instagram_url, twitter_url, facebook_url,
            youtube_url, website_url
        ], function(err) {
            if (err) {
                console.error('Database error:', err);
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
                } else {
                    res.status(500).json({ error: 'データベースエラーが発生しました' });
                }
                return;
            }
            
            const professionalId = this.lastID;
            
            // Insert categories
            if (categories) {
                const categoryList = Array.isArray(categories) ? categories : [categories];
                
                // Get category IDs
                const placeholders = categoryList.map(() => '?').join(',');
                db.all(`SELECT id, slug FROM categories WHERE slug IN (${placeholders})`, categoryList, (err, categoryRows) => {
                    if (err) {
                        console.error('Category lookup error:', err);
                        res.status(500).json({ error: 'カテゴリの処理中にエラーが発生しました' });
                        return;
                    }
                    
                    // Insert category relationships
                    const categoryInserts = categoryRows.map((cat, index) => {
                        return new Promise((resolve, reject) => {
                            db.run(
                                'INSERT INTO professional_categories (professional_id, category_id, is_primary) VALUES (?, ?, ?)',
                                [professionalId, cat.id, index === 0 ? 1 : 0],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                    });
                    
                    Promise.all(categoryInserts)
                        .then(() => {
                            // Insert skills if provided
                            if (skills) {
                                const skillsList = skills.split('\n').filter(skill => skill.trim());
                                const skillInserts = skillsList.map(skill => {
                                    return new Promise((resolve, reject) => {
                                        db.run(
                                            'INSERT INTO professional_skills (professional_id, skill_name, skill_type) VALUES (?, ?, ?)',
                                            [professionalId, skill.trim(), 'skill'],
                                            (err) => {
                                                if (err) reject(err);
                                                else resolve();
                                            }
                                        );
                                    });
                                });
                                
                                Promise.all(skillInserts)
                                    .then(() => {
                                        res.json({ 
                                            success: true, 
                                            id: professionalId,
                                            message: '登録申請が完了しました。審査結果をメールでお知らせいたします。'
                                        });
                                    })
                                    .catch(err => {
                                        console.error('Skills insert error:', err);
                                        res.status(500).json({ error: 'スキル情報の処理中にエラーが発生しました' });
                                    });
                            } else {
                                res.json({ 
                                    success: true, 
                                    id: professionalId,
                                    message: '登録申請が完了しました。審査結果をメールでお知らせいたします。'
                                });
                            }
                        })
                        .catch(err => {
                            console.error('Category insert error:', err);
                            res.status(500).json({ error: 'カテゴリ情報の処理中にエラーが発生しました' });
                        });
                });
            } else {
                res.json({ 
                    success: true, 
                    id: professionalId,
                    message: '登録申請が完了しました。審査結果をメールでお知らせいたします。'
                });
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: '登録処理中にエラーが発生しました' });
    }
});

// Admin routes
app.get('/api/admin/applications', (req, res) => {
    const query = `
        SELECT 
            p.id, p.display_name, p.email, p.activity_area, p.status, p.created_at,
            GROUP_CONCAT(c.name) as categories
        FROM professionals p
        LEFT JOIN professional_categories pc ON p.id = pc.professional_id
        LEFT JOIN categories c ON pc.category_id = c.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'データベースエラーが発生しました' });
        } else {
            res.json(rows);
        }
    });
});

// Approve professional
app.post('/api/admin/professionals/:id/approve', (req, res) => {
    const { id } = req.params;
    
    db.run(
        'UPDATE professionals SET status = ?, is_published = ?, approved_at = datetime("now") WHERE id = ?',
        ['approved', 1, id],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                res.status(500).json({ error: 'データベースエラーが発生しました' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'プロフェッショナルが見つかりません' });
            } else {
                res.json({ success: true, message: '承認が完了しました' });
            }
        }
    );
});

// Reject professional
app.post('/api/admin/professionals/:id/reject', (req, res) => {
    const { id } = req.params;
    
    db.run(
        'UPDATE professionals SET status = ?, is_published = 0 WHERE id = ?',
        ['rejected', id],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                res.status(500).json({ error: 'データベースエラーが発生しました' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'プロフェッショナルが見つかりません' });
            } else {
                res.json({ success: true, message: '却下が完了しました' });
            }
        }
    );
});

// Get categories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'データベースエラーが発生しました' });
        } else {
            res.json(rows);
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'ファイルサイズが大きすぎます（5MB以下にしてください）' });
        }
    }
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📱 Access the app:');
    console.log(`   - Website: http://localhost:${PORT}/website/index.html`);
    console.log(`   - Directory: http://localhost:${PORT}/app/directory.html`);
    console.log(`   - Register: http://localhost:${PORT}/app/register.html`);
    console.log(`   - Admin: http://localhost:${PORT}/app/admin/login.html`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});