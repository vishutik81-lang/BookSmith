import { chromium } from 'playwright';

// Тестовая функция: просто открывает Perchance и проверяет, что сайт загрузился
export async function testPerchanceConnection() {
  let browser;
  try {
    // Запускаем невидимый браузер
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Важно для серверных сред типа Render
    });
    
    const page = await browser.newPage();
    console.log('🌐 Заходим на Perchance...');
    
    await page.goto('https://perchance.org/ai-text-to-image-generator', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    
    const title = await page.title();
    console.log('✅ Страница загружена:', title);
    
    return { success: true, title };
  } catch (error) {
    console.error('❌ Ошибка подключения к Perchance:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}
