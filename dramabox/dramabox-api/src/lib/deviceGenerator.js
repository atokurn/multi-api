/**
 * ========================================
 * Device Generator
 * ========================================
 * 
 * Generate device identifiers untuk autentikasi DramaBox API.
 * 
 * DramaBox memerlukan:
 * - deviceId: UUID v4 format
 * - androidId: Hex string (opsional)
 */

import crypto from 'crypto';

/**
 * Generate UUID v4
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * 
 * @returns {string} UUID v4
 */
export const generateDeviceId = () => {
    return crypto.randomUUID();
};

/**
 * Generate Android ID (fake)
 * Format: hex string dengan prefix ffffffff
 * 
 * @returns {string} Fake Android ID
 */
export const generateAndroidId = () => {
    // Generate 24 random bytes dan convert ke hex
    const randomBytes = crypto.randomBytes(24).toString('hex');
    return `ffffffff${randomBytes}`;
};

/**
 * Generate complete device info
 * @returns {Object} Device info object
 */
export const generateDeviceInfo = () => {
    return {
        deviceId: generateDeviceId(),
        androidId: generateAndroidId(),
        // Device metadata (simulasi device Android)
        model: 'Redmi Note 8',
        manufacturer: 'XIAOMI',
        brand: 'Xiaomi',
        osVersion: '14'
    };
};

export default {
    generateDeviceId,
    generateAndroidId,
    generateDeviceInfo
};
