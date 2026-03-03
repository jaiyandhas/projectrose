import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!_client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) {
            throw new Error(
                "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
            );
        }
        _client = createClient(url, key);
    }
    return _client;
}

// Convenience proxy — works the same as the old `supabase` export for most usages
// but defers client creation until first use (safe for SSR)
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
    },
});
