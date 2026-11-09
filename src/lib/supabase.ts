import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rbjqgfqnjqvhrisavqyh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-sJ6I5TW-9iQ6QgJytmEtA_lCZSxEMc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
