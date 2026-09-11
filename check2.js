const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  await page.goto('http://localhost:3311/', { waitUntil: 'networkidle' });
  await page.fill('#item-input', '테스트 아이템2');
  await page.click('#submit-btn');
  await page.waitForTimeout(4000);
  const status = await page.textContent('#status-line');
  console.log('status after wait:', status);
  console.log('errors:', errors);
  await browser.close();
})();
