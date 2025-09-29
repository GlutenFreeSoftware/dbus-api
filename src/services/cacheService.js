import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/environment.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CacheService {
    constructor() {
        this.cacheDir = path.join(__dirname, '../../cache');
        this.cacheExpiry = config.cacheExpiry;
        this.initialized = false;
        this.initPromise = null;
        this.ensureCacheDir();
    }

    async ensureCacheDir() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = (async () => {
            try {
                await fs.access(this.cacheDir);
                logger.debug('Cache directory exists', { dir: this.cacheDir });
            } catch (err) {
                logger.info('Creating cache directory', { dir: this.cacheDir });
                await fs.mkdir(this.cacheDir, { recursive: true });
            }
            this.initialized = true;
        })();
        
        return this.initPromise;
    }

    async waitForInit() {
        if (!this.initialized) {
            await this.ensureCacheDir();
        }
    }

    getCacheFilePath(key) {
        return path.join(this.cacheDir, `${key}.json`);
    }

    async isCacheValid(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const now = Date.now();
            const isValid = (now - stats.mtimeMs) < this.cacheExpiry;
            return isValid;
        } catch (err) {
            return false;
        }
    }

    async get(key) {
        await this.waitForInit();
        const start = Date.now();
        const filePath = this.getCacheFilePath(key);
        
        try {
            if (await this.isCacheValid(filePath)) {
                const data = await fs.readFile(filePath, 'utf-8');
                const parsedData = JSON.parse(data);
                const duration = Date.now() - start;
                
                logger.cacheOperation('get', key, true, { 
                    duration,
                    size: data.length 
                });
                
                return parsedData;
            } else {
                logger.cacheOperation('get', key, false, { 
                    duration: Date.now() - start,
                    reason: 'expired or missing'
                });
                return null;
            }
        } catch (error) {
            logger.error('Cache get operation failed', error, { 
                key, 
                filePath,
                duration: Date.now() - start
            });
            return null;
        }
    }

    async set(key, data) {
        await this.waitForInit();
        const start = Date.now();
        const filePath = this.getCacheFilePath(key);
        
        try {
            const jsonData = JSON.stringify(data, null, 2);
            
            // Ensure cache directory exists right before writing
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            
            await fs.writeFile(filePath, jsonData, 'utf-8');
            
            const duration = Date.now() - start;
            logger.cacheOperation('set', key, null, { 
                duration,
                size: jsonData.length,
                dataType: Array.isArray(data) ? 'array' : typeof data
            });
        } catch (error) {
            logger.error('Cache set operation failed', error, { 
                key, 
                filePath,
                duration: Date.now() - start
            });
            throw error;
        }
    }

    async invalidate(key) {
        await this.waitForInit();
        const start = Date.now();
        const filePath = this.getCacheFilePath(key);
        
        try {
            await fs.unlink(filePath);
            logger.cacheOperation('invalidate', key, null, { 
                duration: Date.now() - start,
                success: true
            });
        } catch (err) {
            // File doesn't exist, which is fine for invalidation
            logger.cacheOperation('invalidate', key, null, { 
                duration: Date.now() - start,
                success: false,
                reason: 'file not found'
            });
        }
    }

    async clear() {
        await this.waitForInit();
        const start = Date.now();
        
        try {
            const files = await fs.readdir(this.cacheDir);
            await Promise.all(
                files.map(file => fs.unlink(path.join(this.cacheDir, file)))
            );
            
            logger.info('Cache cleared successfully', { 
                filesRemoved: files.length,
                duration: Date.now() - start
            });
        } catch (err) {
            logger.error('Failed to clear cache', err, { 
                duration: Date.now() - start
            });
        }
    }
}

export default new CacheService();