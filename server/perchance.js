import { chromium } from 'playwright';

export async function testPerchanceConnection() {
  let browser;
  try {
    console.log('🚀 Запускаем браузер с настройками обхода базовой защиты...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Маскировка: скрываем флаг webdriver
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('🌐 Заходим на Perchance...');
    
    // ИСПРАВЛЕНИЕ: используем 'domcontentloaded' вместо 'networkidle'
    await page.goto('https://perchance.org/ai-text-to-image-generator', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    
    console.log('⏳ DOM загружен. Ожидаем прохождения проверки Cloudflare (8 секунд)...');
    // Даем время скрипту Cloudflare завершить проверку и сделать редирект
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const title = await page.title();
    console.log('✅ Текущий заголовок страницы:', title);
    
    // Проверяем, появилось ли поле для ввода промпта (основной индикатор успеха)
    const promptBox = await page.$('textarea');
    const hasPromptBox = !!promptBox;
    console.log('✅ Поле для ввода промпта найдено:', hasPromptBox);
    
    return { 
      success: true, 
      title: title, 
      hasPromptBox 
    };
  } catch (error) {
    console.error('❌ Ошибка подключения к Perchance:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Браузер закрыт.');
    }
  }
}
