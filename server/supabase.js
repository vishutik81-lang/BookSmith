import { createClient } from '@supabase/supabase-js';

// Инициализируем клиент Supabase, используя ключи из переменных окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Используем секретный ключ для сервера

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения SUPABASE_URL или SUPABASE_SECRET_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
