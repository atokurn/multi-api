
import fs from 'fs';
import axios from 'axios';
import { decryptTsBuffer } from './src/lib/shortmaxDecoder.js';

// Need a URL to test. 
// Since we don't have one, this script serves as a template or manual tester.
const VIDEO_URL = process.argv[2];

async function testDecryption() {
    if (!VIDEO_URL) {
        console.log('Usage: node check-decrypt.js <video_ts_url>');
        console.log('Or provide a local file path.');
        return;
    }

    console.log(`🚀 Testing Decryption for: ${VIDEO_URL}`);

    try {
        let buffer;
        if (VIDEO_URL.startsWith('http')) {
            console.log('Downloading...');
            const response = await axios.get(VIDEO_URL, { responseType: 'arraybuffer' });
            buffer = Buffer.from(response.data);
        } else {
            console.log('Reading local file...');
            buffer = fs.readFileSync(VIDEO_URL);
        }

        console.log(`Original Buffer Size: ${buffer.length} bytes`);
        console.log('Header (first 24 bytes):', buffer.subarray(0, 24).toString('utf8'));

        const decrypted = decryptTsBuffer(buffer);

        console.log(`Decrypted Buffer Size: ${decrypted.length} bytes`);

        const outputPath = 'decrypted_segment.ts';
        fs.writeFileSync(outputPath, decrypted);
        console.log(`✅ Decrypted file saved to: ${outputPath}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testDecryption();
