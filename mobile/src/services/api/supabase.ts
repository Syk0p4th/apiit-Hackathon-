import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import StorageAdapter from '../../lib/storage'

const SUPABASE_URL = 'https://jvvfkmwdsbhpyxfwwkmh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_nsRpLC3CCgM355HMCYe5cQ_J_PaQSSl'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: StorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})
