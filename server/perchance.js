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
    
    // Создаем контекст с реалистичными параметрами обычного пользователя
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Маскировка: скрываем флаг webdriver, который выдает бота
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('🌐 Заходим на Perchance...');
    
    // waitUntil: 'networkidle' критически важен! Он заставляет браузер ждать, 
    // пока Cloudflare не завершит свою 5-секундную проверку и не сделает редирект.
    await page.goto('https://perchance.org/ai-text-to-image-generator', { 
      waitUntil: 'networkidle', 
      timeout: 90000 // 90 секунд на случай медленной проверки
    });
    
    const title = await page.title();
    console.log('✅ Текущий заголовок страницы:', title);
    
    // На всякий случай, если защита все еще держит, даем 5 секунд на авто-редирект
    if (title.includes('Just a moment') || title.includes('Attention Required')) {
      console.log('⏳ Обнаружена защита Cloudflare. Ожидаем автоматического прохождения...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      const newTitle = await page.title();
      console.log('✅ Заголовок после ожидания:', newTitle);
    }
    
    // Проверяем, появилось ли поле для ввода промпта
    const promptBox = await page.$('textarea');
    const hasPromptBox = !!promptBox;
    console.log('✅ Поле для ввода промпта найдено:', hasPromptBox);
    
    return { 
      success: true, 
      title: await page.title(), 
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
