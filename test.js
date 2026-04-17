import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:5174');
  await page.waitForSelector('.chat-input-area');
  
  // Get bounds of the chat input
  const inputBounds = await page.evaluate(() => {
    const el = document.querySelector('#chat-input');
    const rect = el.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });

  // Get what element is actually top-most at that coordinate
  const elementAtPoint = await page.evaluate((pos) => {
    const el = document.elementFromPoint(pos.x, pos.y);
    return el ? { tagName: el.tagName, className: el.className, id: el.id } : null;
  }, inputBounds);

  console.log('Top element at input center:', elementAtPoint);
  await browser.close();
})();
