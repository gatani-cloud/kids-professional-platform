// Admin API endpoints
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://nrfipfxmrtijhkxqqknc.supabase.co';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_pfXIzDuCXo54T6KNtSy-kQ_P1xpuMbb';
    
    try {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);
        console.log(`Admin API: ${req.method} ${pathname}`);
        
        if (req.method === 'POST' && pathname === '/api/admin') {
            // Admin login
            const { email, password } = req.body;
            
            // Simple admin check (in production, use proper authentication)
            if (email === 'admin@kids-platform.jp' && password === 'demo123') {
                return res.status(200).json({
                    success: true,
                    message: 'ログイン成功',
                    token: 'admin-token-demo' // In production, use proper JWT
                });
            } else {
                return res.status(401).json({
                    error: 'メールアドレスまたはパスワードが正しくありません'
                });
            }
        }
        
        if (req.method === 'GET' && pathname === '/api/admin') {
            // Get all applications
            const response = await fetch(`${supabaseUrl}/rest/v1/professionals?select=*&order=created_at.desc`, {
                method: 'GET',
                headers: {
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Supabase error: ${response.statusText}`);
            }
            
            const applications = await response.json();
            return res.status(200).json(applications);
        }
        
        // Handle approve/reject actions
        const urlParts = pathname.split('/');
        if (req.method === 'POST' && urlParts[2] === 'admin' && urlParts.length >= 5) {
            const id = urlParts[3];
            const action = urlParts[4];
            
            let updateData = {};
            if (action === 'approve') {
                updateData = {
                    status: 'approved',
                    is_published: true,
                    approved_at: new Date().toISOString()
                };
            } else if (action === 'reject') {
                updateData = {
                    status: 'rejected',
                    is_published: false
                };
            } else {
                return res.status(400).json({ error: 'Invalid action' });
            }
            
            const response = await fetch(`${supabaseUrl}/rest/v1/professionals?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Supabase error:', response.status, errorText);
                return res.status(500).json({ error: '処理中にエラーが発生しました' });
            }
            
            const result = await response.json();
            return res.status(200).json({
                success: true,
                message: action === 'approve' ? '承認が完了しました' : '却下が完了しました'
            });
        }
        
        return res.status(404).json({ error: 'API route not found' });
        
    } catch (error) {
        console.error('Admin API error:', error);
        return res.status(500).json({
            error: 'サーバーエラーが発生しました',
            details: error.message
        });
    }
}