const puppeteer = require('puppeteer');

const DBUS_BASE_URL = 'https://dbus.eus/';

async function getLineStops() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(DBUS_BASE_URL);

    // Aceptar cookies
    await page.waitForSelector('.cmplz-btn.cmplz-accept');
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

    return options;
  } catch (error) {
    console.error('Error in getStops:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function getBusLines() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(DBUS_BASE_URL);

    // Aceptar cookies
    await page.waitForSelector('.cmplz-btn.cmplz-accept');
    await page.click('.cmplz-btn.cmplz-accept');

    // Recargar la página para que el `select` aparezca
    await page.reload();

    // Esperar a que el `select` se cargue
    await page.waitForSelector('#desplegable-lineas');

    // Extraer las opciones del select
    const options = await page.evaluate(() => {
      const select = document.querySelector('#desplegable-lineas');
      return Array.from(select.options).map(option => ({
        value: option.value,
        text: option.textContent,
        url: option.getAttribute('enlace')
      })).filter(option => option.text.includes('|'));
    });

    return options;
  } catch (error) {
    console.error('Error in getBusLines:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function getSecurityCode() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(DBUS_BASE_URL);

    // Aceptar cookies
    await page.waitForSelector('.cmplz-btn.cmplz-accept');
    await page.click('.cmplz-btn.cmplz-accept');

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

    return securityValue;
  } catch (error) {
    console.error('Error in getSecurityCode:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = {
  getLineStops,
  getBusLines,
};


