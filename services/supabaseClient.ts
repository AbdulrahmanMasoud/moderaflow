import { createClient } from '@supabase/supabase-js';

// Using provided credentials for ModeraFlow SaaS
const supabaseUrl = 'https://seawwddgijrbejltevpr.supabase.co';
const supabaseKey = 'sb_publishable_87eFrqmTuPrzLPI6DL_6FA_Yb4YYQlF';

export const supabase = createClient(supabaseUrl, supabaseKey);