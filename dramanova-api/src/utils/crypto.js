import crypto from 'crypto';

// Keys from DramaConstant.java
const DRAMA_PRIVATE_KEY_B64 = "MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAmc3CuPiGL/LcIIm7zryCEIbl1SPzBkr75E2VMtxegyZ1lYRD+7TZGAPkvIsBcaMs6Nsy0L78n2qh+lIZMpLH8wIDAQABAkEAk82Mhz0tlv6IVCyIcw/s3f0E+WLmtPFyR9/WtV3Y5aaejUkU60JpX4m5xNR2VaqOLTZAYjW8Wy0aXr3zYIhhQQIhAMfqR9oFdYw1J9SsNc+CrhugAvKTi0+BF6VoL6psWhvbAiEAxPPNTmrkmrXwdm/pQQu3UOQmc2vCZ5tiKpW10CgJi8kCIFGkL6utxw93Ncj4exE/gPLvKcT+1Emnoox+O9kRXss5AiAMtYLJDaLEzPrAWcZeeSgSIzbL+ecokmFKSDDcRske6QIgSMkHedwND1olF8vlKsJUGK3BcdtM8w4Xq7BpSBwsloE=";
const DRAMA_PUBLIC_KEY_B64 = "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKoR8mX0rGKLqzcWmOzbfj64K8ZIgOdHnzkXSOVOZbFu/TJhZ7rFAN+eaGkl3C4buccQd/EjEsj9ir7ijT7h96MCAwEAAQ==";

// Format keys for Node.js
const privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${DRAMA_PRIVATE_KEY_B64.match(/.{1,64}/g).join('\n')}\n-----END RSA PRIVATE KEY-----`;
const publicKey = `-----BEGIN PUBLIC KEY-----\n${DRAMA_PUBLIC_KEY_B64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

export const rsaDecrypt = (encryptedB64) => {
    try {
        const buffer = Buffer.from(encryptedB64, 'base64');
        const decrypted = crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, buffer);
        return decrypted.toString('utf8');
    } catch (e) {
        console.error("RSA Decryption failed", e.message);
        throw e;
    }
};

export const rsaEncrypt = (text) => {
    try {
        const buffer = Buffer.from(text, 'utf8');
        const encrypted = crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, buffer);
        return encrypted.toString('base64');
    } catch (e) {
        console.error("RSA Encryption failed", e.message);
        throw e;
    }
};

export const aesDecrypt = (encryptedB64, aesKeyB64) => {
    try {
        // APK does: Base64.decode(str2, 2) to get key bytes
        const keyBuffer = Buffer.from(aesKeyB64, 'base64');
        const decipher = crypto.createDecipheriv('aes-128-ecb', keyBuffer, null);
        let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("AES Decryption failed", e.message);
        throw e;
    }
};

export const aesEncrypt = (text, aesKeyB64) => {
    try {
        // APK does: Base64.decode(str2, 2) to get key bytes
        const keyBuffer = Buffer.from(aesKeyB64, 'base64');
        const cipher = crypto.createCipheriv('aes-128-ecb', keyBuffer, null);
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    } catch (e) {
        console.error("AES Encryption failed", e.message);
        throw e;
    }
};

export const generateAesKey = () => {
    // APK does: Base64.encodeToString(UUID...substring(0,16).getBytes(), NO_WRAP)
    // So the key is a Base64 string of 16 UTF-8 chars
    const raw16 = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    return Buffer.from(raw16, 'utf8').toString('base64');
};
