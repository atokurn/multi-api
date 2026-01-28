
import axios from 'axios';

const SAPIMU_BASE_URL = 'https://sapimu.au/dramawave/api/v1';
const SAPIMU_TOKEN = '7a8afe6e16e01f607c82e19f035956e0492163c986f6f9654bfa822a1010a087';

const client = axios.create({
    baseURL: SAPIMU_BASE_URL,
    headers: {
        'Authorization': `Bearer ${SAPIMU_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

async function testSapimu() {
    try {
        console.log('🚀 Testing Sapimu API...');

        // 1. Get Home/Ranking or just a known drama
        // The reference mentioned drama ID 'xuyr3DtXPt'
        const dramaId = 'xuyr3DtXPt';

        console.log(`1️⃣ Fetching details for Drama ID: ${dramaId}`);
        const res = await client.get(`/dramas/${dramaId}?lang=id-ID`);

        if (res.data.code === 200) {
            const info = res.data.data.info;
            console.log(`   ✅ Success! Drama: ${info.name}`);
            console.log(`   Episodes: ${info.episode_count}`);

            if (info.episode_list && info.episode_list.length > 0) {
                const firstEp = info.episode_list[0];
                console.log('   📺 Episode 1:');
                console.log(`      Name: ${firstEp.name}`);
                console.log(`      Video URL: ${firstEp.external_audio_h264_m3u8 || firstEp.m3u8_url}`);
                console.log(`      Unlock: ${firstEp.unlock}`);
            }
        } else {
            console.error('   ❌ API Error:', res.data.message);
        }

    } catch (error) {
        console.error('❌ Request Failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

testSapimu();
