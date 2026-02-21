import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://piahvmeitbcibtsjagur.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYWh2bWVpdGJjaWJ0c2phZ3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MTQwNzUsImV4cCI6MjA4NzI5MDA3NX0.yVT7AOv17AqI2LmyyQs0BwX8_bNOKSrjNd6WWj_lKv4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
