// Test Supabase connection
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
        console.log('Testing Supabase connection...');
        console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'Set' : 'Using fallback'}`);
        console.log(`Supabase Key: ${process.env.SUPABASE_ANON_KEY ? 'Set' : 'Using fallback'}`);
        
        // Test connection by getting professionals count
        const { data, error } = await supabase
            .from('professionals')
            .select('id', { count: 'exact' });
        
        if (error) throw error;
        
        return res.status(200).json({
            status: 'ok',
            supabase: 'connected', 
            professionalsCount: data?.length || 0,
            environment: {
                hasSupabaseUrl: !!process.env.SUPABASE_URL,
                hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
                nodeEnv: process.env.NODE_ENV || 'development'
            }
        });
        
    } catch (error) {
        console.error('Supabase test error:', error);
        return res.status(500).json({
            error: 'Supabase connection failed',
            details: error.message,
            environment: {
                hasSupabaseUrl: !!process.env.SUPABASE_URL,
                hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY
            }
        });
    }
}