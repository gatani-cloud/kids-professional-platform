// Get admin applications
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://nrfipfxmrtijhkxqqknc.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'sb_publishable_pfXIzDuCXo54T6KNtSy-kQ_P1xpuMbb'
);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        console.log('Fetching applications from Supabase...');
        
        // Get all applications using Supabase client
        const { data: applications, error } = await supabase
            .from('professionals')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Supabase error:', error);
            throw new Error(`Supabase error: ${error.message}`);
        }
        
        console.log(`Found ${applications.length} applications`);
        
        return res.status(200).json(applications);
        
    } catch (error) {
        console.error('Applications fetch error:', error);
        return res.status(500).json({
            error: 'アプリケーションの取得に失敗しました',
            details: error.message
        });
    }
}