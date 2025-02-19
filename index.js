const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Quitar 'headless' si necesitas ver el navegador
  const page = await browser.newPage();
  await page.goto('https://dbus.eus//24-altza-gros-antiguo-intxaurrondo//');

  // Aceptar cookies (ajusta el selector según el botón de tu página)
  await page.waitForSelector('.cmplz-btn.cmplz-accept'); // Cambia a tu selector real
  await page.click('.cmplz-btn.cmplz-accept');

  // Recargar la página para que el `select` aparezca
  await page.reload();

  // Esperar a que el `select` se cargue
  await page.waitForSelector('#select_paradas_1');

  // Extraer las opciones del select
  const options = await page.evaluate(() => {
    const select = document.querySelector('#select_paradas_1');
    return Array.from(select.options).map(option => ({
      value: option.value,
      text: option.textContent
    }));
  });

  console.log(options);

  // Buscar el valor de "security"
  const securityValue = await page.evaluate(() => {
    let security = null;
    const scriptTags = Array.from(document.querySelectorAll('script'));
    
    scriptTags.forEach(script => {
      if (script.textContent.includes('security')) {
        const match = script.textContent.match(/security:\s*'(\w+)'/);
        if (match) {
          security = match[1];
        }
      }
    });

    return security;
  });

  console.log(securityValue);


  await browser.close();
})();
