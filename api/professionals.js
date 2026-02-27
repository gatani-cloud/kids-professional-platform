// Simple API endpoint for professionals
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Simple Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || 'https://nrfipfxmrtijhkxqqknc.supabase.co';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_pfXIzDuCXo54T6KNtSy-kQ_P1xpuMbb';
    
    try {
        if (req.method === 'GET') {
            // Fetch professionals from Supabase
            const response = await fetch(`${supabaseUrl}/rest/v1/professionals?status=eq.approved&is_published=eq.true&select=*`, {
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
            
            const professionals = await response.json();
            return res.status(200).json(professionals);
        }
        
        if (req.method === 'POST') {
            // Register new professional
            const data = req.body;
            
            // Validate required fields
            if (!data.email || !data.display_name || !data.bio || !data.activity_area) {
                return res.status(400).json({ error: '必須項目が入力されていません' });
            }
            
            // Insert into Supabase
            const response = await fetch(`${supabaseUrl}/rest/v1/professionals`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    email: data.email,
                    display_name: data.display_name,
                    full_name: data.full_name || data.display_name,
                    activity_area: data.activity_area,
                    bio: data.bio,
                    target_age_min: data.target_age_min ? parseInt(data.target_age_min) : 0,
                    target_age_max: data.target_age_max ? parseInt(data.target_age_max) : 18,
                    service_format: data.service_format || 'both',
                    teaching_philosophy: data.teaching_philosophy,
                    hourly_rate_min: data.hourly_rate_min ? parseInt(data.hourly_rate_min) : null,
                    hourly_rate_max: data.hourly_rate_max ? parseInt(data.hourly_rate_max) : null,
                    status: 'pending',
                    is_published: false
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Supabase error:', response.status, errorText);
                return res.status(500).json({ 
                    error: '登録処理中にエラーが発生しました',
                    details: errorText
                });
            }
            
            const result = await response.json();
            return res.status(200).json({
                success: true,
                id: result[0]?.id,
                message: '登録申請が完了しました。審査結果をメールでお知らせいたします。'
            });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({
            error: 'サーバーエラーが発生しました',
            details: error.message
        });
    }
}