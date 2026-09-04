const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false },
});

module.exports = supabase;
