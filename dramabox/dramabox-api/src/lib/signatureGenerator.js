/**
 * ========================================
 * DramaBox Signature Generator (VERIFIED)
 * ========================================
 * 
 * Reverse engineered from DramaBox APK v5.4.1
 * Verified against live captured traffic - signatures MATCH!
 * 
 * Signature Algorithm: SHA256WithRSA
 * Input Format: timestamp={ts}{body}{device-id}{android-id}{tn}
 * 
 * Key points:
 * - Private key is obfuscated in APK, decoded here
 * - Input includes FULL tn header value (Bearer + Base64 JWT)
 * - device-id and android-id are header values, not transformed
 */

import crypto from 'crypto';

/**
 * Decode obfuscated string (from k7/C5117O.java)
 * Each character is shifted by -20 (with wrap around)
 */
const decodeObfuscated = (str) => {
    if (!str) return '';
    let result = '';
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 33 || c > 126) { // '!' to '~'
            result += str[i];
        } else {
            let c2 = c - 20;
            if (c2 < 33) {
                result += String.fromCharCode(c2 + 93); // ']' = 93
            } else {
                result += String.fromCharCode(c2);
            }
        }
    }
    return result;
};

// Key parts from APK (k7/C5119dramaboxapp.java)
const KEY_START = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Q4Y5QX5j08HrnbY3irfKdkEllAU2OORnAjlXDyCzcm2Z6ZRrGvtTZUAMelfU5PWS6XGEm3d4kJEKbXi4Crl8o2E/E3YJPk1lQD1d0JTdrvZleETN1ViHZFSQwS3L94Woh0E3TPebaEYq88eExvKu1tDdjSoFjBbgMezySnas5Nc2xF28";

const OBFUSCATED_MIDDLE = `l|d,WL$EI,?xyw+*)^#?U\`[whXlG\`-GZif,.jCxbKkaY"{w*y]_jax^/1iVDdyg(Wbz+z/$xVjCiH0lZf/d|%gZglW)"~J,^~}w"}m(E'eEunz)eyEy\`XGaVF|_(Kw)|awUG"'{{e#%$0E.ffHVU++$giHzdvC0ZLXG|U{aVUUYW{{YVU^x),J'If\`nG|C[\`ZF),xLv(-H'}ZIEyCfke0dZ%aU[V)"V0}mhKvZ]Gw%-^a|m'\`\\f}{(~kzi&zjG+|fXX0$IH#j\`+hfnME"|fa/{.j.xf,"LZ.K^bZy%c.W^/v{x#(J},Ua,ew#.##K(ki)$LX{a-1\\MG/zL&JlEKEw'Hg|D&{EfuKYM[nGKx1V#lFu^V_LjVzw+n%+,Xd`;

const KEY_END = "x52e71nafqfbjXxZuEtpu92oJd6A9mWbd0BZTk72ZHUmDcKcqjfcEH19SWOphMJFYkxU5FRoIEr3/zisyTO4Mt33ZmwELOrY9PdlyAAyed7ZoH+hlTr7c025QROvb2LmqgRiUT56tMECgYEA+jH5m6iMRK6XjiBhSUnlr3DzRybwlQrtIj5sZprWe2my5uYHG3jbViYIO7GtQvMTnDrBCxNhuM6dPrL0cRnbsp/iBMXe3pyjT/aWveBkn4R+UpBsnbtDn28r1MZpCDtr5UNc0TPj4KFJvjnV/e8oGoyYEroECqcw1LqNOGDiLhkCgYEAwaemNePYrXW+MVX/hatfLQ96tpxwf7yuHdENZ2q5AFw73GJWYvC8VY+TcoKPAmeoCUMltI3TrS6K5Q/GoLd5K2BsoJrSxQNQFd3ehWAtdOuPDvQ5rn/2fsvgvc3rOvJh7uNnwEZCI/45WQg+UFWref4PPc+ArNtp9Xj2y7LndwkCgYARojIQeXmhYZjG6JtSugWZLuHGkwUDzChYcIPdW25gdluokG/RzNvQn4+W/XfTryQjr7RpXm1VxCIrCBvYWNU2KrSYV4XUtL+B5ERNj6In6AOrOAifuVITy5cQQQeoD+AT4YKKMBkQfO2gnZzqb8+ox130e+3K/mufoqJPZeyrCQKBgC2fobjwhQvYwYY+DIUharri+rYrBRYTDbJYnh/PNOaw1CmHwXJt5PEDcml3+NlIMn58I1X2U/hpDrAIl3MlxpZBkVYFI8LmlOeR7ereTddN59ZOE4jY/OnCfqA480Jf+FKfoMHby5lPO5OOLaAfjtae1FhrmpUe3EfIx9wVuhKBAoGBAPFzHKQZbGhkqmyPW2ctTEIWLdUHyO37fm8dj1WjN4wjRAI4ohNiKQJRh3QE11E1PzBTl9lZVWT8QtEsSjnrA/tpGr378fcUT7WGBgTmBRaAnv1P1n/Tp0TSvh5XpIhhMuxcitIgrhYMIG3GbP9JNAarxO/qPW6Gi0xWaF7il7Or";

// Cache the private key
let cachedPrivateKey = null;

/**
 * Get the private key in PEM format
 */
const getPrivateKey = () => {
    if (cachedPrivateKey) return cachedPrivateKey;

    const decodedMiddle = decodeObfuscated(OBFUSCATED_MIDDLE);
    const fullKeyBase64 = KEY_START + decodedMiddle + KEY_END;
    const keyDer = Buffer.from(fullKeyBase64, 'base64');

    // Convert to PEM format with proper line breaks
    cachedPrivateKey = '-----BEGIN PRIVATE KEY-----\n' +
        keyDer.toString('base64').match(/.{1,64}/g).join('\n') +
        '\n-----END PRIVATE KEY-----';

    return cachedPrivateKey;
};

/**
 * Generate signature for DramaBox API request
 * 
 * VERIFIED FORMAT (from g7/C4824O.java):
 * input = "timestamp=" + timestamp + body + deviceId + androidId + tnHeader
 * 
 * @param {Object} params - Signature parameters
 * @param {string} params.timestamp - Unix timestamp in milliseconds
 * @param {string} params.body - Request body JSON string
 * @param {string} params.deviceId - Device ID from header (device-id)
 * @param {string} params.androidId - Android ID from header (android-id)
 * @param {string} params.tnHeader - Full tn header value (Bearer + Base64 JWT)
 * @returns {string} Base64-encoded RSA signature
 */
export const generateSignature = (params) => {
    const { timestamp, body = '{}', deviceId = '', androidId = '', tnHeader = '' } = params;

    // Build signature input - EXACT format from APK
    // Format: timestamp={ts}{body}{device-id}{android-id}{tn header}
    let input = `timestamp=${timestamp}`;
    input += body;
    input += deviceId;
    input += androidId;
    input += tnHeader;

    try {
        const privateKey = getPrivateKey();

        // Sign with SHA256-RSA
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(input, 'utf8');
        sign.end();

        const signature = sign.sign(privateKey, 'base64');

        return signature;
    } catch (error) {
        console.error('[SignatureGenerator] Error:', error.message);
        return null;
    }
};

/**
 * Test the signature generation against captured data
 */
export const testSignature = () => {
    console.log('\n=== Testing Signature Generator ===\n');

    // Test with captured recommendBook request
    const sig = generateSignature({
        timestamp: '1766910590637',
        body: '{"isNeedRank":1,"specialColumnId":0,"pageNo":6}',
        deviceId: '4071e87a-08cc-4ee3-9922-0577f83c73b2',
        androidId: '000000002894f5d02894f5d000000000',
        tnHeader: 'Bearer ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnlaV2RwYzNSbGNsUjVjR1VpT2lKVVJVMVFJaXdpZFhObGNrbGtJam96TnpReE1UUXdNVEY5LnZSNWFCelc5V1BkMWxDV0xtRmxBOHY2bnVLT1FnVi1mTEtERGRrVTA3TWs='
    });

    const expectedSig = 'sS5qM1U0TOsJjaXPqEjq/Ls27bFusFYlZGPc0fkMpVlZ+FnMOw/eq9GoixrOHLtOn7rv71m/xhEUpCYzgBGkD2/79IvhpXGNwrnnoSb9dWdnbEEOVvl565C5wW9X73oPNiHl2gW6kJ2Rj9WfmvPGUqS5MRNd9h6xsfOgZng19fDmQv7KE+is7T/Z35uemoFRQ5xh1BfBiN5Jv95IxOeD4oKxnuiE88euY8Op4jOpf6IWbZGN2ccUMIqAFtYk/Fnr1WA4ibk/yzm3oyKhrKD7VzeF/F6GyJkDHGPKLzITYe4tUtnDfSWclNf6M2owtMMt/TijxdTqeksM0ija/zEC3w==';

    console.log('Generated:', sig?.substring(0, 60) + '...');
    console.log('Expected: ', expectedSig.substring(0, 60) + '...');
    console.log('\nMatch:', sig === expectedSig ? '✅ SUCCESS!' : '❌ FAILED');
};

export default {
    generateSignature,
    testSignature,
    getPrivateKey
};
