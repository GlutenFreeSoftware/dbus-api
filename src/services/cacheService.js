import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CacheService {
    constructor() {
        this.cacheDir = path.join(__dirname, '../../cache');
        this.cacheExpiry = config.cacheExpiry;
        this.ensureCacheDir();
    }

    async ensureCacheDir() {
        try {
            await fs.access(this.cacheDir);
        } catch (err) {
            await fs.mkdir(this.cacheDir, { recursive: true });
        }
    }

    getCacheFilePath(key) {
        return path.join(this.cacheDir, `${key}.json`);
    }

    async isCacheValid(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const now = Date.now();
            return (now - stats.mtimeMs) < this.cacheExpiry;
        } catch (err) {
            return false;
        }
    }

    async get(key) {
        const filePath = this.getCacheFilePath(key);
        if (await this.isCacheValid(filePath)) {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }
        return null;
    }

    async set(key, data) {
        const filePath = this.getCacheFilePath(key);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }

    async invalidate(key) {
        const filePath = this.getCacheFilePath(key);
        try {
            await fs.unlink(filePath);
        } catch (err) {
            // File doesn't exist, ignore
        }
    }

    async clear() {
        try {
            const files = await fs.readdir(this.cacheDir);
            await Promise.all(
                files.map(file => fs.unlink(path.join(this.cacheDir, file)))
            );
        } catch (err) {
            // Directory doesn't exist or is empty
        }
    }
}

export default new CacheService();