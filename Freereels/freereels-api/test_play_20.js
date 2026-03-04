import { get, post, anonymousLogin, setDeviceConfig } from './src/lib/freereelsClient.js';
import * as freereelsService from './src/services/freereelsService.js';

async function testPlay20Episodes() {
    try {
        console.log("1. Authenticating...");
        await freereelsService.ensureAuthenticated();

        console.log("\n2. Finding a drama with > 20 episodes...");
        const seriesId = "3P2JjRW2rq";
        const info = await freereelsService.getDetail(seriesId);

        console.log(`\nSelected Drama: ${info.title} (ID: ${seriesId})`);
        console.log(`Total Episodes: ${info.total_episodes}`);

        console.log(`\n3. Testing play endpoint for episodes 1 to 20...`);
        let lockedCount = 0;
        let unlockedCount = 0;

        for (let i = 1; i <= 20; i++) {
            console.log(`\n--- Fetching Episode ${i} ---`);
            try {
                const playInfo = await freereelsService.playEpisodeByIndex(seriesId, i);

                if (playInfo.success) {
                    console.log(`[SUCCESS] Episode ${i}: Stream URL found`);
                    // console.log(`Quality 720p: ${playInfo.url}`);
                    unlockedCount++;
                } else {
                    console.log(`[LOCKED] Episode ${i}: ${playInfo.message}`);
                    lockedCount++;
                }
            } catch (err) {
                console.log(`[ERROR] Episode ${i} failed:`, err.message);
            }

            // Wait 1 second between requests to avoid rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`\n--- Summary ---`);
        console.log(`Total Unlocked: ${unlockedCount}`);
        console.log(`Total Locked: ${lockedCount}`);

    } catch (err) {
        console.error("Test execution failed:", err);
    }
}

testPlay20Episodes();
