/**
 * ========================================
 * ByteDance Signature Generator
 * ========================================
 * 
 * JavaScript implementation of ByteDance security signatures:
 * - X-Gorgon: Request hash signature
 * - X-Khronos: Timestamp
 * - X-Ladon: Encrypted data signature
 * - X-SS-STUB: MD5 of request body
 * 
 * Based on reverse-engineered algorithms from:
 * https://github.com/ssovit/x-gorogn-khronos-argus-ladon
 * 
 * Note: X-Argus requires additional crypto libraries (Simon cipher, SM3, Protobuf)
 * and is more complex. This implementation covers the simpler signatures.
 */

import crypto from 'crypto';

/**
 * X-Gorgon Generator
 * Generates X-Gorgon and X-Khronos headers for ByteDance API requests
 */
class XGorgon {
    constructor() {
        this.length = 20;
        // Fixed encryption key bytes
        this.hexStr = [30, 64, 224, 217, 147, 69, 0, 180];
    }

    /**
     * Generate encryption table
     */
    _encryption() {
        let tmp = '';
        const hexZu = [];

        for (let i = 0; i < 256; i++) {
            hexZu.push(i);
        }

        for (let i = 0; i < 256; i++) {
            let A;
            if (i === 0) {
                A = 0;
            } else if (tmp !== '') {
                A = tmp;
            } else {
                A = hexZu[i - 1];
            }

            const B = this.hexStr[i % 8];

            if (A === 85) {
                if (i !== 1) {
                    if (tmp !== 85) {
                        A = 0;
                    }
                }
            }

            let C = A + i + B;
            while (C >= 256) {
                C = C - 256;
            }

            if (C < i) {
                tmp = C;
            } else {
                tmp = '';
            }

            const D = hexZu[C];
            hexZu[i] = D;
        }

        return hexZu;
    }

    /**
     * Initialize transformation
     */
    _initialize(input, hexZu) {
        const tmpAdd = [];
        const tmpHex = [...hexZu];

        for (let i = 0; i < this.length; i++) {
            const A = input[i];
            let B;
            if (tmpAdd.length === 0) {
                B = 0;
            } else {
                B = tmpAdd[tmpAdd.length - 1];
            }

            let C = hexZu[i + 1] + B;
            while (C >= 256) {
                C = C - 256;
            }

            tmpAdd.push(C);
            const D = tmpHex[C];
            tmpHex[i + 1] = D;

            let E = D + D;
            while (E >= 256) {
                E = E - 256;
            }

            const F = tmpHex[E];
            const G = A ^ F;
            input[i] = G;
        }

        return input;
    }

    /**
     * Reverse nibbles
     */
    _reverse(num) {
        let tmpString = num.toString(16);
        if (tmpString.length < 2) {
            tmpString = '0' + tmpString;
        }
        return parseInt(tmpString[1] + tmpString[0], 16);
    }

    /**
     * Reverse bits
     */
    _RBIT(num) {
        let result = '';
        let tmpString = num.toString(2);
        while (tmpString.length < 8) {
            tmpString = '0' + tmpString;
        }
        for (let i = 0; i < 8; i++) {
            result = result + tmpString[7 - i];
        }
        return parseInt(result, 2);
    }

    /**
     * Convert number to 2-digit hex string
     */
    _hex2string(num) {
        let tmpString = num.toString(16);
        if (tmpString.length < 2) {
            tmpString = '0' + tmpString;
        }
        return tmpString;
    }

    /**
     * Handle transformation
     */
    _handle(input) {
        for (let i = 0; i < this.length; i++) {
            const A = input[i];
            const B = this._reverse(A);
            const C = input[(i + 1) % this.length];
            const D = B ^ C;
            const E = this._RBIT(D);
            const F = E ^ this.length;
            let G = ~F;
            while (G < 0) {
                G += 4294967296;
            }
            const H = parseInt(G.toString(16).slice(-2), 16);
            input[i] = H;
        }
        return input;
    }

    /**
     * Main signature generation
     */
    _main(gorgon) {
        let result = '';
        const processed = this._handle(this._initialize(gorgon, this._encryption()));
        for (const item of processed) {
            result = result + this._hex2string(item);
        }

        return `0404${this._hex2string(this.hexStr[7])}${this._hex2string(this.hexStr[3])}${this._hex2string(this.hexStr[1])}${this._hex2string(this.hexStr[6])}${result}`;
    }

    /**
     * Calculate X-Gorgon and X-Khronos
     * 
     * @param {string} params - URL query string (without ?)
     * @param {object} headers - Request headers (must include 'cookie' and optionally 'x-ss-stub')
     * @returns {object} { 'X-Gorgon': string, 'X-Khronos': string }
     */
    calculate(params, headers = {}) {
        const gorgon = [];
        const headers2 = {};

        // Get timestamp as hex
        const khronos = Math.floor(Date.now() / 1000).toString(16);

        // MD5 of URL params
        const urlMd5 = crypto.createHash('md5').update(params).digest('hex');
        for (let i = 0; i < 4; i++) {
            gorgon.push(parseInt(urlMd5.slice(2 * i, 2 * i + 2), 16));
        }

        // Normalize headers to lowercase
        for (const [k, v] of Object.entries(headers)) {
            headers2[k.toLowerCase()] = v;
        }

        // X-SS-STUB (MD5 of request body)
        if (headers2['x-ss-stub']) {
            const dataMd5 = headers2['x-ss-stub'];
            for (let i = 0; i < 4; i++) {
                gorgon.push(parseInt(dataMd5.slice(2 * i, 2 * i + 2), 16));
            }
        } else {
            for (let i = 0; i < 4; i++) {
                gorgon.push(0);
            }
        }

        // Cookie MD5
        if (headers2['cookie']) {
            const cookieMd5 = crypto.createHash('md5').update(headers2['cookie']).digest('hex');
            for (let i = 0; i < 4; i++) {
                gorgon.push(parseInt(cookieMd5.slice(2 * i, 2 * i + 2), 16));
            }
        } else {
            for (let i = 0; i < 4; i++) {
                gorgon.push(0);
            }
        }

        // Padding
        for (let i = 0; i < 4; i++) {
            gorgon.push(0);
        }

        // Timestamp bytes
        for (let i = 0; i < 4; i++) {
            gorgon.push(parseInt(khronos.slice(2 * i, 2 * i + 2), 16));
        }

        return {
            'X-Gorgon': this._main(gorgon),
            'X-Khronos': parseInt(khronos, 16).toString()
        };
    }
}

/**
 * X-SS-STUB Generator
 * Generates MD5 hash of request body for X-SS-STUB header
 */
function generateStub(body) {
    if (!body) return '';
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHash('md5').update(bodyStr).digest('hex').toUpperCase();
}

/**
 * X-Ladon Generator (Simplified)
 * 
 * Note: Full X-Ladon requires complex encryption.
 * This is a placeholder that generates a valid-looking signature.
 * For production use, the full algorithm would be needed.
 */
function generateLadon(timestamp, licenseId = 1611921764, aid = 645713) {
    // Simplified version - in production, this needs the full encryption
    const data = `${timestamp}-${licenseId}-${aid}`;
    const keygen = crypto.randomBytes(4).toString('hex') + aid.toString();
    const md5hex = crypto.createHash('md5').update(keygen).digest('hex');

    // This is a placeholder - real implementation needs the full encryption
    console.warn('[Signature] X-Ladon generation is simplified - may not work for all endpoints');
    return Buffer.from(md5hex + data).toString('base64');
}

/**
 * Generate all ByteDance security headers
 * 
 * @param {string} queryString - URL query parameters (without leading ?)
 * @param {string|object} body - Request body (for POST requests)
 * @param {string} cookie - Cookie header value
 * @param {object} options - Additional options (aid, licenseId)
 * @returns {object} Object containing all security headers
 */
function generateSecurityHeaders(queryString, body = null, cookie = '', options = {}) {
    const { aid = 645713, licenseId = 1611921764 } = options;

    const headers = {};

    // Generate X-SS-STUB if body provided
    let xssStub = '';
    if (body) {
        xssStub = generateStub(body);
        headers['X-SS-STUB'] = xssStub;
    }

    // Generate X-Gorgon and X-Khronos
    const xgorgon = new XGorgon();
    const gorgonHeaders = xgorgon.calculate(queryString, {
        'x-ss-stub': xssStub,
        'cookie': cookie
    });

    headers['X-Gorgon'] = gorgonHeaders['X-Gorgon'];
    headers['X-Khronos'] = gorgonHeaders['X-Khronos'];

    // Generate X-Ladon (simplified)
    headers['X-Ladon'] = generateLadon(parseInt(gorgonHeaders['X-Khronos']), licenseId, aid);

    // X-SS-DP is just the app ID
    headers['X-SS-DP'] = aid.toString();

    return headers;
}

export {
    XGorgon,
    generateStub,
    generateLadon,
    generateSecurityHeaders
};
