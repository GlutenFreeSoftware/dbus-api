import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 1 day

/**
 * Ensures that the cache directory exists.
 * If the directory does not exist, it will be created.
 *
 * @returns {Promise<void>} A promise that resolves when the cache directory is ensured.
 * @throws {Error} If there is an error accessing or creating the cache directory.
 */
async function ensureCacheDir() {
    try {
        await fs.access(CACHE_DIR);
    } catch (err) {
        await fs.mkdir(CACHE_DIR);
    }
}

/**
 * Asynchronously constructs the file path for a cache file based on the provided key.
 *
 * @param {string} key - The key used to identify the cache file.
 * @returns {Promise<string>} - A promise that resolves to the constructed file path.
 */
async function getCacheFilePath(key) {
    return path.join(CACHE_DIR, `${key}.json`);
}

/**
 * Checks if the cache file is still valid based on its last modified time.
 *
 * @param {string} filePath - The path to the cache file.
 * @returns {Promise<boolean>} - A promise that resolves to true if the cache is valid, otherwise false.
 */
async function isCacheValid(filePath) {
    try {
        const stats = await fs.stat(filePath);
        const now = new Date().getTime();
        return (now - stats.mtimeMs) < CACHE_EXPIRY;
    } catch (err) {
        return false;
    }
}

/**
 * Retrieves the cached data for the given key if the cache is valid.
 *
 * @param {string} key - The key to identify the cached data.
 * @returns {Promise<Object|null>} - A promise that resolves to the cached data as an object if the cache is valid, or null if the cache is invalid or does not exist.
 */
async function getCache(key) {
    const filePath = await getCacheFilePath(key);
    if (await isCacheValid(filePath)) {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    }
    return null;
}

/**
 * Asynchronously sets the cache for a given key with the provided data.
 *
 * @param {string} key - The key to identify the cache entry.
 * @param {Object} data - The data to be cached.
 * @returns {Promise<void>} A promise that resolves when the cache is set.
 */
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