import { createClient } from '@supabase/supabase-js';

// .env.local이 잘 안 읽히는 것 같으니 직접 넣어서 테스트합니다.
// 나중에는 다시 원래대로 돌려놓는 게 좋습니다.
const supabaseUrl = "https://gljyohpldaulgcyhdken.supabase.co";
const supabaseKey = "sb_publishable_cYKRxQvnlHYZ5O7-xTXyDg_zak63Nbf"; // ⚠️ 주의: 이 키는 전체가 다 복사된 게 맞는지 꼭 확인해주세요!

export const supabase = createClient(supabaseUrl, supabaseKey);