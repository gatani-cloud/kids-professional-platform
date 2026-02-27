// Simple Node.js server without external dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const PORT = 3000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Simple SQLite-like in-memory data (for demo)
let professionals = [
    {
        id: 1,
        display_name: '田中美咲',
        email: 'tanaka@example.com',
        activity_area: '関東地方',
        target_age_min: 3,
        target_age_max: 14,
        service_format: 'both',
        bio: '音楽大学卒業後、10年間で100名以上のお子さまを指導。楽しく学べる個別レッスンが人気です。',
        teaching_philosophy: '楽しく学ぶことを大切にし、一人ひとりの個性や学習ペースに合わせた指導を心がけています。',
        hourly_rate_min: 3000,
        hourly_rate_max: 5000,
        status: 'approved',
        is_published: true,
        view_count: 42,
        categories: '音楽・芸術',
        skills: 'ピアノ演奏,音楽理論,楽典,ソルフェージュ',
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        display_name: '佐藤健太',
        email: 'sato@example.com',
        activity_area: '関東地方',
        target_age_min: 6,
        target_age_max: 14,
        service_format: 'offline',
        bio: '元小学校教員。15年の指導経験で中学受験合格率95%。お子さまのやる気を引き出す指導が得意です。',
        teaching_philosophy: '基礎学力の向上と共に、学習への興味関心を育むことを大切にしています。',
        hourly_rate_min: 4000,
        hourly_rate_max: 6000,
        status: 'approved',
        is_published: true,
        view_count: 28,
        categories: '学習・教育',
        skills: '小学校教諭,中学受験指導,算数,国語',
        created_at: new Date().toISOString()
    },
    {
        id: 3,
        display_name: '山田リナ',
        email: 'yamada@example.com',
        activity_area: '全国',
        target_age_min: 0,
        target_age_max: 99,
        service_format: 'online',
        bio: '子ども向けサービス企業のWebサイト制作専門。直感的で安全なUI設計により、子どもたちが使いやすいサイトを作成します。',
        teaching_philosophy: 'ユーザビリティと安全性を重視した子ども向けWebデザインを提供します。',
        hourly_rate_min: 80000,
        hourly_rate_max: 150000,
        status: 'approved',
        is_published: true,
        view_count: 15,
        categories: '企業支援',
        skills: 'UI/UXデザイン,フロントエンド開発,WordPress,子ども向けデザイン',
        created_at: new Date().toISOString()
    }
];

let pendingApplications = [
    {
        id: 4,
        display_name: '高橋みゆき',
        email: 'takahashi@example.com',
        activity_area: '東京都',
        status: 'pending',
        is_published: false,
        categories: '音楽・芸術',
        created_at: new Date().toISOString()
    }
];

function getContentType(filePath) {
    const ext = path.extname(filePath);
    return mimeTypes[ext] || 'text/plain';
}

function serveFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        res.writeHead(200, {
            'Content-Type': getContentType(filePath),
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
}

function handleAPI(req, res, parsedUrl) {
    const pathname = parsedUrl.pathname;
    const method = req.method;
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // GET /api/professionals - Get all published professionals
    if (method === 'GET' && pathname === '/api/professionals') {
        const query = parsedUrl.query || {};
        let filtered = professionals.filter(p => p.is_published && p.status === 'approved');
        
        // Simple filtering
        if (query.category) {
            filtered = filtered.filter(p => p.categories && p.categories.includes(query.category));
        }
        if (query.area && query.area !== '全国') {
            filtered = filtered.filter(p => p.activity_area === query.area);
        }
        if (query.keyword) {
            const keyword = query.keyword.toLowerCase();
            filtered = filtered.filter(p => 
                p.display_name.toLowerCase().includes(keyword) ||
                p.bio.toLowerCase().includes(keyword) ||
                (p.categories && p.categories.toLowerCase().includes(keyword))
            );
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(filtered));
        return;
    }
    
    // GET /api/professionals/:id - Get single professional
    if (method === 'GET' && pathname.startsWith('/api/professionals/')) {
        const id = parseInt(pathname.split('/')[3]);
        const professional = professionals.find(p => p.id === id && p.is_published && p.status === 'approved');
        
        if (!professional) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Professional not found' }));
            return;
        }
        
        // Increment view count
        professional.view_count = (professional.view_count || 0) + 1;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(professional));
        return;
    }
    
    // POST /api/professionals/register - Register new professional
    if (method === 'POST' && pathname === '/api/professionals/register') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                // For demo, we'll accept both JSON and form data
                let data;
                if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                    data = JSON.parse(body);
                } else {
                    // Simple form parsing (for demo - in production use proper multipart parser)
                    data = querystring.parse(body);
                }
                
                // Check if email already exists
                if (professionals.some(p => p.email === data.email) || 
                    pendingApplications.some(p => p.email === data.email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'このメールアドレスは既に登録されています' }));
                    return;
                }
                
                // Create new application
                const newId = Math.max(...professionals.map(p => p.id), ...pendingApplications.map(p => p.id)) + 1;
                const newApplication = {
                    id: newId,
                    display_name: data.display_name,
                    email: data.email,
                    full_name: data.full_name,
                    phone: data.phone,
                    activity_area: data.activity_area,
                    target_age_min: data.target_age_min ? parseInt(data.target_age_min) : null,
                    target_age_max: data.target_age_max ? parseInt(data.target_age_max) : null,
                    service_format: data.service_format,
                    bio: data.bio,
                    teaching_philosophy: data.teaching_philosophy,
                    hourly_rate_min: data.hourly_rate_min ? parseInt(data.hourly_rate_min) : null,
                    hourly_rate_max: data.hourly_rate_max ? parseInt(data.hourly_rate_max) : null,
                    price_note: data.price_note,
                    instagram_url: data.instagram_url,
                    twitter_url: data.twitter_url,
                    facebook_url: data.facebook_url,
                    youtube_url: data.youtube_url,
                    website_url: data.website_url,
                    categories: Array.isArray(data.categories) ? data.categories.join(',') : data.categories,
                    skills: data.skills,
                    status: 'pending',
                    is_published: false,
                    view_count: 0,
                    created_at: new Date().toISOString()
                };
                
                pendingApplications.push(newApplication);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    id: newId,
                    message: '登録申請が完了しました。審査結果をメールでお知らせいたします。'
                }));
            } catch (error) {
                console.error('Registration error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '登録処理中にエラーが発生しました' }));
            }
        });
        return;
    }
    
    // GET /api/admin/applications - Get all applications for admin
    if (method === 'GET' && pathname === '/api/admin/applications') {
        const allApplications = [...professionals, ...pendingApplications]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(allApplications));
        return;
    }
    
    // POST /api/admin/professionals/:id/approve - Approve professional
    if (method === 'POST' && pathname.includes('/approve')) {
        const id = parseInt(pathname.split('/')[3]);
        const applicationIndex = pendingApplications.findIndex(p => p.id === id);
        
        if (applicationIndex !== -1) {
            const application = pendingApplications[applicationIndex];
            application.status = 'approved';
            application.is_published = true;
            application.approved_at = new Date().toISOString();
            
            // Move to professionals array
            professionals.push(application);
            pendingApplications.splice(applicationIndex, 1);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: '承認が完了しました' }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Application not found' }));
        }
        return;
    }
    
    // POST /api/admin/professionals/:id/reject - Reject professional
    if (method === 'POST' && pathname.includes('/reject')) {
        const id = parseInt(pathname.split('/')[3]);
        const application = pendingApplications.find(p => p.id === id);
        
        if (application) {
            application.status = 'rejected';
            application.is_published = false;
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: '却下が完了しました' }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Application not found' }));
        }
        return;
    }
    
    // 404 for unknown API routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API route not found' }));
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Handle API routes
    if (pathname.startsWith('/api/')) {
        handleAPI(req, res, parsedUrl);
        return;
    }
    
    // Handle static files
    let filePath = '.' + pathname;
    
    // Default to index.html for root
    if (pathname === '/') {
        filePath = './website/index.html';
    }
    
    // If it's a directory, try to serve index.html
    if (pathname.endsWith('/')) {
        filePath += 'index.html';
    }
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File doesn't exist, try common paths
            if (!pathname.includes('.')) {
                // Might be a route, try adding .html
                const htmlPath = filePath + '.html';
                fs.access(htmlPath, fs.constants.F_OK, (err) => {
                    if (err) {
                        res.writeHead(404);
                        res.end('File not found');
                    } else {
                        serveFile(htmlPath, res);
                    }
                });
            } else {
                res.writeHead(404);
                res.end('File not found');
            }
        } else {
            serveFile(filePath, res);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Kids Professional Platform Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('📱 Access the app:');
    console.log(`   - Website: http://localhost:${PORT}/website/index.html`);
    console.log(`   - Directory: http://localhost:${PORT}/app/directory.html`);
    console.log(`   - Register: http://localhost:${PORT}/app/register.html`);
    console.log(`   - Admin: http://localhost:${PORT}/app/admin/login.html`);
    console.log('');
    console.log('🔑 Admin Login:');
    console.log('   - Email: admin@kids-platform.jp');
    console.log('   - Password: demo123');
    console.log('');
    console.log('💡 Tips:');
    console.log('   - Try registering as a new professional');
    console.log('   - View profiles and test the search');
    console.log('   - Use admin panel to approve applications');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});