import axios from 'axios';
import { generateAesKey, rsaEncrypt, aesEncrypt, aesDecrypt } from '../utils/crypto.js';

const BASE_URL = 'https://playsverse.com/api';
const CLIENT_ID = '8aaa2824912e16e799e82203b89668df';
const TENANT_ID = '000000';

export const callDramaNovaApi = async (path, method, data = {}, query = {}, token = null) => {
    const aesKey = generateAesKey();
    const encryptedKey = rsaEncrypt(aesKey);

    const headers = {
        'clientId': CLIENT_ID,
        'encrypt-key': encryptedKey,
        'content-language': 'en',
        'tenant-id': TENANT_ID
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let requestBody = undefined;
    if (method === 'POST' || method === 'PUT') {
        // Retrofit + GsonConverterFactory serializes @Body String as JSON string
        // So the body is: "base64encrypteddata" (with JSON quotes)
        headers['content-type'] = 'application/json';
        const jsonStr = JSON.stringify(data);
        const encrypted = aesEncrypt(jsonStr, aesKey);
        // Wrap in JSON quotes like Gson does for String body
        requestBody = JSON.stringify(encrypted);
    }

    try {
        const response = await axios({
            method: method,
            url: `${BASE_URL}${path}`,
            headers: headers,
            params: query,
            data: requestBody || '',
            responseType: 'text' // get raw text so we can decrypt
        });

        let responseData = response.data;
        if (typeof responseData === 'string' && responseData.length > 0) {
            try {
                // Check if it's plain json or encrypted base64
                if (responseData.startsWith('{')) {
                    console.log("[Proxy] Received plaintext JSON from server");
                    return JSON.parse(responseData);
                }
                console.log("[Proxy] Received encrypted payload from server, decrypting...");
                const decryptedStr = aesDecrypt(responseData, aesKey);
                return JSON.parse(decryptedStr);
            } catch (decErr) {
                console.error("Failed to decrypt return value:", decErr);
                return responseData;
            }
        }
        return responseData;
    } catch (error) {
        console.error("Upstream API Error:", error.response?.data || error.message);
        throw error;
    }
}
