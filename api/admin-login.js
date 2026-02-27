// Simple admin login API
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://nrfipfxmrtijhkxqqknc.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'sb_publishable_pfXIzDuCXo54T6KNtSy-kQ_P1xpuMbb'
);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        console.log('Admin login attempt:', req.body);
        
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'メールアドレスとパスワードを入力してください' 
            });
        }
        
        // Simple admin check
        if (email === 'admin@kids-platform.jp' && password === 'demo123') {
            return res.status(200).json({
                success: true,
                message: 'ログイン成功',
                token: 'admin-token-demo',
                user: {
                    email: email,
                    name: 'システム管理者',
                    role: 'admin'
                }
            });
        } else {
            return res.status(401).json({
                error: 'メールアドレスまたはパスワードが正しくありません'
            });
        }
        
    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({
            error: 'ログインエラーが発生しました',
            details: error.message
        });
    }
}