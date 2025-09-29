import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import cacheService from './cacheService.js';
import logger from '../utils/logger.js';

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
        const start = Date.now();
        try {
            const browser = await puppeteer.launch(this.browserConfig);
            const duration = Date.now() - start;
            logger.debug('Browser launched successfully', { duration });
            return browser;
        } catch (error) {
            logger.error('Failed to launch browser', error, { 
                config: this.browserConfig,
                duration: Date.now() - start
            });
            throw error;
        }
    }

    async acceptCookies(page) {
        const start = Date.now();
        try {
            await page.waitForSelector('.cmplz-btn.cmplz-accept', { timeout: 5000 });
            await page.click('.cmplz-btn.cmplz-accept');
            logger.debug('Cookies accepted successfully', { 
                duration: Date.now() - start 
            });
        } catch (error) {
            logger.warn('Unable to accept cookies', { 
                error: error.message,
                duration: Date.now() - start
            });
        }
    }

    async getSecurityCode() {
        const cacheKey = 'security_code';
        const cachedSecurity = await cacheService.get(cacheKey);

        if (cachedSecurity) {
            logger.debug('Security code retrieved from cache');
            return cachedSecurity;
        }

        // If not cached, we'll fetch it and cache it during getLineStops
        return null;
    }

    async setSecurityCode(securityCode) {
        const cacheKey = 'security_code';
        await cacheService.set(cacheKey, securityCode);
        logger.debug('Security code cached');
    }

    async getBusLines() {
        const cacheKey = 'bus_lines';
        const operationStart = Date.now();
        
        try {
            const cachedData = await cacheService.get(cacheKey);

            if (cachedData) {
                logger.scraperOperation('getBusLines', Date.now() - operationStart, true, null, { 
                    source: 'cache',
                    linesCount: cachedData.length 
                });
                return cachedData;
            }

            logger.debug('Fetching bus lines from DBUS website');
            const response = await fetch(`${DBUS_BASE_URL}es`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();

            // Extract lineas_front from the HTML content
            const match = html.match(/lineas_front=JSON\.parse\('(.+?)'\);/);
            if (!match) {
                throw new Error('Could not find lineas_front data in HTML');
            }

            const jsonString = match[1].replace(/\\\//g, '/').replace(/\\"/g, '"');
            const linesData = JSON.parse(jsonString);
            
            const options = linesData
                .filter(item => item.texto && item.texto.includes('|'))
                .map(item => {
                    // Handle both regular spaces and non-breaking spaces after the pipe
                    const [code, name] = item.texto.split(/\s*\|\s*/);
                    return {
                        code: code ? code.trim() : '',
                        name: name ? name.trim() : '',
                        url: item.enlace,
                        internal_id: item.valor
                    };
                });

            await cacheService.set(cacheKey, options);
            
            const duration = Date.now() - operationStart;
            logger.scraperOperation('getBusLines', duration, true, null, { 
                source: 'web',
                linesCount: options.length,
                htmlSize: html.length
            });
            
            return options;
        } catch (error) {
            const duration = Date.now() - operationStart;
            logger.scraperOperation('getBusLines', duration, false, error, { 
                source: 'web'
            });
            logger.error('Failed to fetch bus lines', error);
            throw error;
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

            // Cache security code separately (global for all lines)
            if (securityCode) {
                await this.setSecurityCode(securityCode);
            }

            // Cache only the stops data (without security code)
            await cacheService.set(cacheKey, stops);
            return stops;
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

        const stops = await this.getLineStops(lineNumber.toString());
        const stop = stops.find(s => s.code === stopCode);

        if (!stop) {
            throw new Error(`Stop with ID ${stopCode} not found`);
        }

        // Get security code from global cache
        let security = await this.getSecurityCode();
        
        // If security code is not cached, we need to fetch it
        if (!security) {
            // This should trigger a fresh scrape that will cache the security code
            await cacheService.invalidate(`line_stops_${lineNumber}`);
            await this.getLineStops(lineNumber.toString());
            security = await this.getSecurityCode();
            
            if (!security) {
                throw new Error('Security code not found');
            }
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