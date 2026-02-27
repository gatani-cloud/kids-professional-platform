// Supabase client configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://nrfipfxmrtijhkxqqknc.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_pfXIzDuCXo54T6KNtSy-kQ_P1xpuMbb';

// Simple Supabase client without external dependencies
class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.headers = {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };
    }

    async query(sql, params = []) {
        const response = await fetch(`${this.url}/rest/v1/rpc/execute_sql`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ sql, params })
        });
        
        if (!response.ok) {
            throw new Error(`Supabase query failed: ${response.statusText}`);
        }
        
        return response.json();
    }

    async select(table, columns = '*', conditions = '', params = []) {
        let url = `${this.url}/rest/v1/${table}?select=${columns}`;
        if (conditions) {
            url += `&${conditions}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: this.headers
        });

        if (!response.ok) {
            throw new Error(`Supabase select failed: ${response.statusText}`);
        }

        return response.json();
    }

    async insert(table, data) {
        const response = await fetch(`${this.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                ...this.headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Supabase insert failed: ${response.statusText} - ${error}`);
        }

        return response.json();
    }

    async update(table, id, data) {
        const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                ...this.headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Supabase update failed: ${response.statusText}`);
        }

        return response.json();
    }

    async delete(table, id) {
        const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
            method: 'DELETE',
            headers: this.headers
        });

        if (!response.ok) {
            throw new Error(`Supabase delete failed: ${response.statusText}`);
        }

        return response.json();
    }
}

const supabase = new SupabaseClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;