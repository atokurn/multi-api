import { getClient } from './src/lib/dramawaveClient.js';
import * as dramawaveService from './src/services/dramawaveService.js';

async function testUnlock() {
    try {
        console.log("1. Ensuring authenticated state...");
        await dramawaveService.ensureAuthenticated();
        const client = getClient();

        console.log("2. Finding a drama from trending...");
        const foryou = await client.get('/foryou/feed', { page: 1, limit: 1 });
        const dramaInfo = foryou.data.container.episode_info;
        const seriesId = dramaInfo.series_id;
        console.log(`Found drama: ${seriesId} (${dramaInfo.series_name}) - Ep ${dramaInfo.index}`);

        console.log("3. Fetching info_v2 to get locked episode IDs...");
        const info = await client.get('/drama/info_v2', { series_id: seriesId, scene: 'for_you' });
        const eps = info.data.info.episode_list;

        const lockedEp = eps.find(e => e.free === false || e.unlock === true);
        if (!lockedEp) {
            console.log("Could not find a locked episode to test. Aborting.");
            return;
        }

        console.log(`Found Locked Ep: Index ${lockedEp.index}, ID ${lockedEp.id}, Name: ${lockedEp.name}`);

        console.log("\n4. Attempting to hit /drama/unlock_episode...");
        // Payload based on f5.r analysis
        const payload = {
            series_id: seriesId,
            episode_id: lockedEp.id, // maps to seriesKey in f5.r
            auto_unlock: 0,
            check_auto_unlock: 0,
            diamond_auto_unlock: 0,
            check_diamond_auto_unlock: 0
        };

        console.log("Sending payload:", payload);
        const unlockResponse = await client.post('/drama/unlock_episode', payload)
            .catch(err => {
                console.log("HTTP Error:", err.message);
                if (err.response) console.log("Response data:", JSON.stringify(err.response.data));
                return null;
            });

        if (unlockResponse) {
            console.log("\nUnlock success! Response:");
            console.log(JSON.stringify(unlockResponse, null, 2));

            if (unlockResponse.data && unlockResponse.data.video_url) {
                console.log("!!! WE GOT VIDEO URL !!!");
                console.log(unlockResponse.data.video_url);
            }
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
}

testUnlock();
