import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import cacheService from './cacheService.js';

const DBUS_BASE_URL = 'https://dbus.eus/';
const DBUS_AJAX_URL = 'https://dbus.eus/wp-admin/admin-ajax.php';

class ScraperService {
    constructor() {
        this.browserConfig = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        };
    }

    async getBrowser() {
        return await puppeteer.launch(this.browserConfig);
    }

    async acceptCookies(page) {
        try {
            await page.waitForSelector('.cmplz-btn.cmplz-accept', { timeout: 5000 });
            await page.click('.cmplz-btn.cmplz-accept');
        } catch (error) {
            console.warn('Unable to accept cookies:', error.message);
        }
    }

    async getBusLines() {
        const cacheKey = 'bus_lines';
        const cachedData = await cacheService.get(cacheKey);

        if (cachedData) {
            return cachedData;
        }

        const browser = await this.getBrowser();

        try {
            const page = await browser.newPage();
            await page.goto(DBUS_BASE_URL);

            await this.acceptCookies(page);
            await page.reload();
            await page.waitForSelector('#desplegable-lineas');

            const options = await page.evaluate(() => {
                const select = document.querySelector('#desplegable-lineas');
                return Array.from(select.options)
                    .filter(option => option.textContent.includes('|'))
                    .map(option => {
                        const [code, name] = option.textContent.split(' | ');
                        return {
                            code: code ? code.trim() : '',
                            name: name ? name.trim() : '',
                            url: option.getAttribute('enlace'),
                            internal_id: option.value
                        };
                    });
            });

            await cacheService.set(cacheKey, options);
            return options;
        } finally {
            await browser.close();
        }
    }

    async getLineStops(lineCode) {
        const cacheKey = `line_stops_${lineCode}`;
        const cachedData = await cacheService.get(cacheKey);

        if (cachedData) {
            return cachedData;
        }

        const browser = await this.getBrowser();

        try {
            const busLines = await this.getBusLines();
            const lineData = busLines.find(busLine => 
                busLine.code.toString() === lineCode.toString()
            );

            if (!lineData) {
                throw new Error(`Line with code ${lineCode} not found`);
            }

            const page = await browser.newPage();
            await page.goto(lineData.url);

            await this.acceptCookies(page);
            await page.reload();
            await page.waitForSelector('#select_paradas_1');

            const securityCode = await page.evaluate(() => {
                const scriptTags = Array.from(document.querySelectorAll('script'));
                
                for (const script of scriptTags) {
                    if (script.textContent.includes('security')) {
                        const match = script.textContent.match(/security:\s*'(\w+)'/);
                        if (match) {
                            return match[1];
                        }
                    }
                }
                return null;
            });

            const stops = await page.evaluate(() => {
                const select = document.querySelector('#select_paradas_1');
                return Array.from(select.options)
                    .filter(option => option.textContent.includes('|'))
                    .map(option => {
                        const [code, name] = option.textContent.split(' | ');
                        return {
                            code: code ? code.trim() : '',
                            name: name ? name.trim() : '',
                            internal_id: option.value
                        };
                    });
            });

            const result = { security: securityCode, stops };
            await cacheService.set(cacheKey, result);
            return result;
        } finally {
            await browser.close();
        }
    }

    async getBusTimeAtStop(lineNumber, stopCode) {
        const now = new Date();
        const day = now.getDate();
        const month = now.getMonth() + 1; // Months are zero-based
        const year = now.getFullYear();
        const hour = now.getHours();
        const minute = now.getMinutes();

        const { security, stops } = await this.getLineStops(lineNumber.toString());
        const stop = stops.find(s => s.code === stopCode);

        if (!stop) {
            throw new Error(`Stop with ID ${stopCode} not found`);
        }

        const response = await fetch(DBUS_AJAX_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'calcula_parada',
                security: security,
                linea: lineNumber.toString(),
                parada: stop.internal_id,
                dia: day.toString().padStart(2, '0'),
                mes: month.toString().padStart(2, '0'),
                year: year.toString(),
                hora: hour.toString().padStart(2, '0'),
                minuto: minute.toString().padStart(2, '0')
            })
        });

        const result = await response.text();
        const dom = new JSDOM(result);
        const doc = dom.window.document;

        const listItems = Array.from(doc.querySelectorAll('#prox_lle ul li'))
            .map(item => item.textContent.trim());
        
        const requestedLine = listItems.find(item => 
            item.includes(`Linea ${lineNumber}:`)
        );

        if (!requestedLine) {
            throw new Error('Bus time not found');
        }

        // Match both formats: "HH:MM" and "X min"
        const timeMatch = requestedLine.match(/(\d{2}:\d{2})/);
        const minutesMatch = requestedLine.match(/(\d+)\s*min/);

        if (timeMatch) {
            // Calculate how much time is left until the bus arrives
            const [hours, minutes] = timeMatch[1].split(':').map(Number);
            const busTime = new Date(year, month - 1, day, hours, minutes);
            const timeDiff = busTime - now;
            const minutesDiff = Math.floor(timeDiff / 60000);
            return minutesDiff;
        } else if (minutesMatch) {
            return parseInt(minutesMatch[1], 10);
        }

        throw new Error('Bus time not found');
    }
}

export default new ScraperService();