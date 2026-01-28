
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decryptJson } from './src/lib/shortmaxCrypto.js';
import { DEVICE_CONFIG } from './src/lib/shortmaxClient.js';

// RSA Public Key Integers extracted from ze/b.java
const RSA_KEY_INTS = [77, 73, 71, 102, 77, 65, 48, 71, 67, 83, 113, 71, 83, 73, 98, 51, 68, 81, 69, 66, 65, 81, 85, 65, 65, 52, 71, 78, 65, 68, 67, 66, 105, 81, 75, 66, 103, 81, 68, 81, 78, 56, 119, 74, 69, 118, 100, 99, 112, 107, 108, 107, 117, 51, 117, 119, 120, 76, 97, 122, 54, 55, 79, 116, 80, 51, 71, 112, 65, 75, 50, 65, 72, 85, 89, 47, 43, 80, 87, 118, 105, 106, 80, 86, 75, 66, 83, 82, 67, 88, 68, 54, 119, 105, 114, 43, 74, 75, 74, 81, 55, 122, 99, 120, 55, 115, 69, 110, 65, 120, 85, 105, 47, 67, 77, 122, 119, 82, 110, 43, 66, 109, 75, 111, 109, 73, 118, 81, 112, 122, 73, 85, 122, 76, 117, 97, 65, 120, 105, 117, 53, 82, 77, 48, 66, 65, 107, 75, 87, 88, 65, 120, 75, 83, 99, 115, 106, 56, 110, 89, 51, 118, 108, 98, 67, 104, 79, 100, 119, 52, 73, 67, 120, 113, 114, 83, 79, 51, 81, 90, 77, 101, 68, 120, 122, 121, 78, 76, 88, 75, 110, 88, 109, 55, 79, 70, 66, 66, 47, 119, 53, 120, 108, 105, 53, 122, 85, 104, 68, 81, 73, 68, 65, 81, 65, 66];

// Construct RSA Public Key PEM
const rsaKeyCommon = String.fromCharCode(...RSA_KEY_INTS);
// Need to wrap in standard PEM format. The content is already base64 encoded DER (SubjectPublicKeyInfo)
const publicKeyPem = `-----BEGIN PUBLIC KEY-----
${rsaKeyCommon}
-----END PUBLIC KEY-----`;

// Helper to generate 32-char random string for RC4 Key
function generateRc4Key() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate RC4 encryptor for TraceParam (matches ze/d.java)
function rc4(str, key) {
    // We can use the existing 'encrypt' function from shortmaxCrypto which essentially does this
    // but check if it matches the exact hex output requirement.
    // 'encrypt' returns Hex string. ze.d.d returns Hex string.
    return encrypt(str, key); // Pass key explicitly if supported or modify shortmaxCrypto
}

// But wait, shortmaxCrypto.encrypt uses HARDCODED key if not passed?
// I need to check shortmaxCrypto.js
// It currently has a default key. I need to update it or export 'encryptWithKey'.
// For now, I'll copy a simple RC4 impl or rely on the fact that shortmaxCrypto might not export dynamic key support.
// Actually, shortmaxCrypto.js `encrypt(data)` uses `RC4_KEY`.
// I should modify `shortmaxCrypto.js` to accept a key.

// RSA Encrypt function (using crypto)
function rsaEncrypt(data, publicKey) {
    const buffer = Buffer.from(data, 'utf-8');
    const encrypted = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, buffer);
    // Return formatting?
    // ze/e.java uses Cipher "RSA/ECB/PKCS1Padding".
    // And e.a returns hex string? No, ze.b calls e.a then ze.d.b (RC4)?
    // No, wait.
    // ze.b.d calls: h(a(e(str, str2)))?
    // No, ze.b.d() generates ApiRc4RsaKey.
    // It calls `e.a(bytes, bVar.g(), 2)`.
    // `e.a` return string?
    // Let's re-read ze/b.java line 120: `String strA = eVar.a(bytes, bVar.g(), 2);`
    // eVar is ze.e. Let's look at ze.e.a in shortmax-decompiled.
    // I didn't see ze.e content fully.
    // I assumed it returns Hex.
    // Standard practice for sending encrypted keys is Hex or Base64.
    // checking ze/e.java quickly is safet.
    return encrypted.toString('hex').toLowerCase(); // Try hex first.
}

async function registerDevice() {
    console.log('🚀 Registering New Device...');

    // 1. Generate new RC4 Key
    // const rc4Key = generateRc4Key();
    const rc4Key = "XBUAU2eC0gF6VbgJuZx5ipXCFUoN79w0"; // Try using the KNOWN key explicitly first? 
    // If I use the known key, I can skip modifying shortmaxCrypto for now.
    // BUT the known key might be bound to another device on the server?
    // Let's generate a NEW key to be safe and properly register it.
    const myRc4Key = generateRc4Key();
    console.log('🔑 Generated RC4 Key:', myRc4Key);

    // 2. Encrypt RC4 Key with RSA Public Key
    // We need to implement RSA encryption.
    // Using Node's crypto

    let secretKey;
    try {
        const buffer = Buffer.from(myRc4Key, 'utf-8');
        const encrypted = crypto.publicEncrypt({
            key: publicKeyPem,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, buffer);

        // ze.e.java uses Base64.encodeToString(bytes, 2) which is NO_WRAP
        secretKey = encrypted.toString('base64');
    } catch (e) {
        console.error('RSA Encryption failed:', e);
        return;
    }
    console.log('🔒 Encrypted Secret Key (RSA Base64):', secretKey.substring(0, 50) + '...');

    // 3. Prepare initLogin parameters
    const deviceId = DEVICE_CONFIG.deviceId; // Use existing ID first, or generate new one?
    // If we use existing ID, we might conflict if it was registered with different key?
    // Better generate a NEW random device ID for testing.
    const newDeviceId = crypto.randomBytes(16).toString('hex');
    console.log('📱 Device ID:', newDeviceId);

    const seq = uuidv4();
    const androidVersion = "2.14.0"; // Matching DEFAULT_HEADERS

    // 4. Generate TraceParam
    // Logic: RC4(MD5(deviceCode + seq + secretKey + androidVersion), myRc4Key)
    // Concat order: based on ApiInterceptor, it iterates request params.
    // Retrofit @Field order usually matches usage.
    // k.java: deviceCode, seq, secretKey.
    // Verify param order in body?
    // We will construct body object.
    const loginData = {
        deviceCode: newDeviceId,
        seq: seq,
        secretKey: secretKey
    };

    // Assuming I updated shortmaxCrypto.js to export encryptWithKey(text, key)
    // For now I will mock it or copy-paste RC4 logic here to be self-contained script.

    function rc4Encrypt(str, key) {
        const s = [];
        for (let i = 0; i < 256; i++) {
            s[i] = i;
        }
        let j = 0;
        let x;
        for (let i = 0; i < 256; i++) {
            j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
            x = s[i];
            s[i] = s[j];
            s[j] = x;
        }
        let i = 0;
        j = 0;
        let res = '';
        for (let y = 0; y < str.length; y++) {
            i = (i + 1) % 256;
            j = (j + s[i]) % 256;
            x = s[i];
            s[i] = s[j];
            s[j] = x;
            res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
        }

        // Convert to Hex
        let hex = '';
        for (let i = 0; i < res.length; i++) {
            let h = res.charCodeAt(i).toString(16);
            if (h.length < 2) h = '0' + h;
            hex += h;
        }
        return hex;
    }

    const paramsMap = {
        'deviceCode': newDeviceId,
        'seq': seq,
        'secretKey': secretKey
    };

    // Exact order from decompiled code analysis (Retrofit usually preserves declaration order)
    // Declaration: deviceCode, seq, secretKey
    const orders = [
        ['deviceCode', 'seq', 'secretKey'],
        ['deviceCode', 'secretKey', 'seq'],
        ['seq', 'deviceCode', 'secretKey'],
        ['seq', 'secretKey', 'deviceCode'],
        ['secretKey', 'deviceCode', 'seq'],
        ['secretKey', 'seq', 'deviceCode']
    ];

    for (const order of orders) {
        console.log(`\n🔄 Trying TraceParam Order: ${order.join(' + ')}`);
        let valStr = '';
        for (const k of order) valStr += paramsMap[k];

        const concatString = valStr + androidVersion;
        const md5Hash = crypto.createHash('md5').update(concatString).digest('hex');
        const traceParam = rc4Encrypt(md5Hash, myRc4Key);

        try {
            const headers = {
                'User-Agent': 'okhttp/4.12.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json;charset=utf-8',
                'clientPlatform': 'android',
                'channel': 'google_play',
                'environment': 'prod',
                'language': 'id',
                'locale': 'id_ID',
                'timeZone': 'Asia/Jakarta',
                'androidVersion': '2.14.0',
                'model': 'sdk_gphone64_arm64',
                'deviceId': newDeviceId,
                'TraceId': uuidv4(),
                'session_id': uuidv4(),
                'TraceParam': traceParam
            };

            const response = await axios.post('https://api.shorttv.live/app/login/v4/initLogin', loginData, {
                headers: { ...headers, 'Content-Type': 'application/json;charset=utf-8' }
            });
            // console.log('Response:', JSON.stringify(response.data, null, 2));

            if (response.data.data && response.data.data.token) {
                console.log('🎉 SUCCESS! Full Response Data:', JSON.stringify(response.data.data, null, 2));
                console.log('Token:', response.data.data.token);

                // Check for hidden IP or CI data in userResponse
                if (response.data.data.userResponse) {
                    console.log('UserResponse keys:', Object.keys(response.data.data.userResponse));
                }
                console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
                console.log('🔑 RC4 Key:', myRc4Key);
                console.log('📱 DeviceID:', newDeviceId);
                console.log('📦 Working Order:', order);
                break;
            } else {
                console.log('⚠️ Failed:', response.data.message || response.data.status);
            }
        } catch (error) {
            console.log('❌ Request Error:', error.message);
        }
    }
}

registerDevice();
