import puppeteer from 'puppeteer';
import { getCache, setCache } from './cache.js';
import { JSDOM } from 'jsdom';

const DBUS_BASE_URL = 'https://dbus.eus/';
const DBUS_AJAX_URL = 'https://dbus.eus/wp-admin/admin-ajax.php';

/**
 * Fetches the stops for a given bus line code.
 *
 * @param {string} line_code - The code of the bus line to fetch stops for.
 * @returns {Promise<{security: string, stops: Array<{code: string, name: string, internal_id: string}>}>} 
 * An object containing the security code and an array of stops with their code, name, and internal ID.
 * @throws Will throw an error if the line code is not found or if there is an issue with the Puppeteer operations.
 */
export async function getLineStops(line_code) {
  const cacheKey = `line_stops_${line_code}`;
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const busLines = await getBusLines();
    const lineData = busLines.find(busLine => busLine.code.toString() === line_code.toString());
    if (!lineData) {
      throw new Error(`Line with code ${line_code} not found`);
    }
    const line_url = lineData.url;

    const page = await browser.newPage();
    await page.goto(line_url);

    // Aceptar cookies
    await page.waitForSelector('.cmplz-btn.cmplz-accept');
    await page.click('.cmplz-btn.cmplz-accept');

    // Recargar la página para que el `select` aparezca
    await page.reload();

    // Esperar a que el `select` se cargue
    await page.waitForSelector('#select_paradas_1');

    // Obtener el código de seguridad
    const securityCode = await page.evaluate(() => {
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

    // Extraer las opciones del select
    const response = await page.evaluate(() => {
      const select = document.querySelector('#select_paradas_1');
      return Array.from(select.options)
        .filter(option => option.textContent.includes('|'))
        .map(option => {
          const [code, name] = option.textContent.split(' | ');
          return {
              code,
              name,
              internal_id: option.value
          };
        });
    });

    const result = { security: securityCode, stops: response };
    await setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error in getLineStops:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Fetches bus lines from the DBUS website.
 *
 * This function uses Puppeteer to navigate to the DBUS website, accept cookies,
 * reload the page, and extract bus line options from a dropdown menu.
 *
 * @async
 * @function getBusLines
 * @returns {Promise<Array<{code: string, name: string, url: string, internal_id: string}>>} 
 * An array of objects representing bus lines, each containing a code, name, URL, and internal ID.
 * @throws {Error} If there is an issue with the Puppeteer operations or page interactions.
 */
export async function getBusLines() {
  const cacheKey = 'bus_lines';
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

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
      return Array.from(select.options)
        .filter(option => option.textContent.includes('|'))
        .map(option => {
          const [code, name] = option.textContent.split(' | ');
          return {
            code,
            name,
            url: option.getAttribute('enlace'),
            internal_id: option.value
          };
        });
    });

    await setCache(cacheKey, options);
    return options;
  } catch (error) {
    console.error('Error in getBusLines:', error);
    throw error;
  } finally {
    await browser.close();
  }
}


/**
 * Fetches the next bus arrival time at a specific stop for a given line number.
 *
 * @param {number|string} line_number - The bus line number.
 * @param {number|string} stop_code - The code of the bus stop.
 * @returns {Promise<number>} - The number of minutes until the next bus arrives.
 * @throws {Error} - Throws an error if the stop is not found or if the bus time cannot be retrieved.
 */
export async function getBusTimeAtStop(line_number, stop_code) {
  
  // Parameter initialization
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1; // Months are zero-based
  const year = now.getFullYear();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const { security, stops } = await getLineStops(line_number.toString());
  const stop = stops.find(s => s.code === stop_code);

  if (!stop) {
    throw new Error(`Stop with ID ${stop_code} not found`);
  }

  // Fetch the DBUS AJAX endpoint
  const response = await fetch(DBUS_AJAX_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
        action: 'calcula_parada',
        security: security, // Dynamically fetched security code
        linea: line_number.toString(),
        parada: stop.internal_id,
        dia: day.toString().padStart(2, '0'),
        mes: month.toString().padStart(2, '0'),
        year: year.toString(),
        hora: hour.toString().padStart(2, '0'),
        minuto: minute.toString().padStart(2, '0')
    })
  });

  // Parsing the response
  const result = await response.text();
  const dom = new JSDOM(result);
  const doc = dom.window.document;
  const nextBusTimes = [];

  const listItems = Array.from(doc.querySelectorAll('#prox_lle ul li')).map(item => item.textContent.trim());
  const requestedLine = listItems.find(item => item.includes(`Linea ${line_number}:`));
  if (!requestedLine) {
    throw new Error('Bus time not found');
  }
  const match = requestedLine.match(/(\d+)\s*min/);
  if (match) {
    return parseInt(match[1], 10);
  }
  throw new Error('Bus time not found');
}