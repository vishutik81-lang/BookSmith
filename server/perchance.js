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

export async function generateImage(prompt) {
  let browser;
  try {
    console.log('🚀 Запускаем браузер для генерации изображения...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log('🌐 Заходим на Perchance...');
    await page.goto('https://perchance.org/ai-text-to-image-generator', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    
    // Ждем прохождения Cloudflare
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    console.log('⌨️ Вводим промпт...');
    // Находим поле ввода (обычно это textarea с плейсхолдером "prompt" или "describe")
    const promptBox = await page.$('textarea');
    if (!promptBox) throw new Error('Не удалось найти поле для ввода промпта');
    
    await promptBox.click();
    await promptBox.fill(prompt);
    
    console.log('🖱️ Нажимаем кнопку генерации...');
    // Находим кнопку генерации (обычно это кнопка с текстом "generate" или иконкой)
    const generateBtn = await page.$('button:has-text("generate"), button:has-text("Generate"), .generate-button');
    if (!generateBtn) throw new Error('Не удалось найти кнопку генерации');
    
    await generateBtn.click();
    
    console.log('⏳ Ожидаем результат генерации (до 30 секунд)...');
    // Ждем появления нового изображения (обычно это img внутри блока с результатом)
    // Мы ищем изменение в DOM или появление изображения с новым src
    await page.waitForFunction(() => {
      const imgs = document.querySelectorAll('img');
      // Ищем изображение, которое не является иконкой или логотипом, а имеет большой размер или специфичный класс
      // Для Perchance результат часто появляется в блоке с классом, содержащим 'output' или просто как большое изображение
      for (const img of imgs) {
        if (img.src && img.src.startsWith('http') && img.width > 200 && img.height > 200) {
          return true;
        }
      }
      return false;
    }, { timeout: 30000 });

    // Даем еще пару секунд на полную отрисовку
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Извлекаем URL сгенерированного изображения
   const resultImg = await page.evaluate(() => {
  const candidates = [...document.querySelectorAll('img')]
    .filter(i => i.width > 200 && i.height > 200 && i.src);
  candidates.sort((a, b) => b.width * b.height - a.width * a.height);
  return candidates[0]?.src || null;
});
if (!resultImg) throw new Error('Не удалось найти готовое изображение на странице');

    console.log('✅ Изображение сгенерировано:', resultImg);
    
    return { success: true, imageUrl: resultImg };
  } catch (error) {
    console.error('❌ Ошибка генерации изображения:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Браузер закрыт.');
    }
  }
}
