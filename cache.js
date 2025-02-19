import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

async function ensureCacheDir() {
    try {
        await fs.access(CACHE_DIR);
    } catch (err) {
        await fs.mkdir(CACHE_DIR);
    }
}

async function getCacheFilePath(key) {
    return path.join(CACHE_DIR, `${key}.json`);
}

async function isCacheValid(filePath) {
    try {
        const stats = await fs.stat(filePath);
        const now = new Date().getTime();
        return (now - stats.mtimeMs) < CACHE_EXPIRY;
    } catch (err) {
        return false;
    }
}

async function getCache(key) {
    const filePath = await getCacheFilePath(key);
    if (await isCacheValid(filePath)) {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    }
    return null;
}

async function setCache(key, data) {
    const filePath = await getCacheFilePath(key);
    await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
}

export {
    getCache,
    setCache,
};

// Ensure the cache directory exists when the module is loaded
ensureCacheDir();