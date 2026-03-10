
import { getDetail, getChapters, getVideoUrl, getSdkDeviceConfig } from './shortmax-api/src/services/shortmaxService.js';

async function testShortMax() {
    console.log('🚀 Testing ShortMax (Sapimu Proxy) Services...\n');

    try {
        // 0. Get Sdk Device Config
        console.log('0. Get Sdk Device Config');
        const sdkConfig = await getSdkDeviceConfig();
        console.log('SDK Config Response:', JSON.stringify(sdkConfig, null, 2));

        // Use known working code from reference
        const testCode = 'xuyr3DtXPt';

        // 1. Test Detail
        console.log(`\n1️⃣ Testing getDetail for code ${testCode} via Sapimu...`);
        const detail = await getDetail(testCode);

        let realId = testCode;

        if (detail) {
            console.log(`   ✅ Success! Title: ${detail.title}`);
            console.log(`   Episodes: ${detail.episodeCount}`);
            console.log(`   Cover: ${detail.cover}`);
            realId = detail.id;
        } else {
            console.log('   ❌ Failed to get detail. (Check Token?)');
            return;
        }

        // 2. Get Chapters
        console.log(`\n2️⃣ Testing getChapters for ID ${realId}...`);
        const chapters = await getChapters(realId);
        console.log(`   ✅ Success! Got ${chapters.data.length} chapters.`);

        let freeChapter = null;
        let vipChapter = null;

        if (chapters.data.length > 0) {
            freeChapter = chapters.data.find(c => !c.isVip);
            vipChapter = chapters.data.find(c => c.isVip);

            if (freeChapter) {
                console.log(`   Found FREE Chapter: Episode ${freeChapter.index} (ID: ${freeChapter.id})`);
            }
            if (vipChapter) {
                console.log(`   Found VIP Chapter: Episode ${vipChapter.index} (ID: ${vipChapter.id})`);
            }
        }

        // 3. Test Video URL (Free)
        if (freeChapter) {
            console.log(`\n3️⃣ Testing getVideoUrl (Free) for Episode ${freeChapter.index}...`);
            try {
                // Sapimu requires (DramaID, EpisodeIndex)
                const videoData = await getVideoUrl(realId, freeChapter.index);
                console.log(`   ✅ Success! Video URL: ${videoData?.videoUrl ? 'Has URL' : 'No URL'}`);
                if (videoData?.videoUrl) console.log(`   URL: ${videoData.videoUrl}`);
            } catch (e) {
                console.log(`   ❌ Failed: ${e.message}`);
            }
        } else {
            console.log('\n3️⃣ Skip Free Video Test (No free chapter found)');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

testShortMax();
