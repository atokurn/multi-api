import { get, post } from './src/lib/freereelsClient.js';
import * as freereelsService from './src/services/freereelsService.js';

async function testUnlock() {
    try {
        console.log("1. Ensuring authenticated state...");
        await freereelsService.ensureAuthenticated();

        console.log("2. Using a known drama ID...");
        const seriesId = "kVh9qtHl4n";
        console.log(`Using drama: ${seriesId}`);

        console.log("3. Fetching info_v2 to get locked episode IDs...");
        const info = await get('/drama/info_v2', { series_id: seriesId, scene: 'for_you' });
        const eps = info.data.info.episode_list;

        // Find the FIRST locked episode (to avoid "don't skip" errors)
        const lockedEp = eps.find(e => e.unlock === false);
        if (!lockedEp) {
            console.log("Could not find a locked episode to test. Aborting.");
            return;
        }

        console.log(`Found Locked Ep: Index ${lockedEp.index}, ID ${lockedEp.id}, Name: ${lockedEp.name}`);

        console.log("\n4. Getting an ad_key from /ad/get...");
        const adGet = await get('/ad/get', { series_id: seriesId, episode_key: lockedEp.id }).catch(e => null);
        let adKey = "dummy_ad_key_123";
        if (adGet && adGet.data) {
            console.log("Got Ad Info:", JSON.stringify(adGet.data, null, 2));
            adKey = adGet.data.ad_key || adKey;
        }

        console.log("\n5. Attempting to hit /ad/finish with key", adKey);
        const adFinishPayload = {
            ad_key: adKey,
            series_id: seriesId,
            episode_key: lockedEp.id
        };

        console.log("Sending payload:", adFinishPayload);
        const adResponse = await post('/ad/finish', adFinishPayload)
            .catch(err => {
                console.log("HTTP Error on /ad/finish:", err.message);
                if (err.response) console.log("Response data:", JSON.stringify(err.response.data));
                return null;
            });

        if (adResponse) {
            console.log("\n/ad/finish success! Response:");
            console.log(JSON.stringify(adResponse, null, 2));

            console.log("\n5. Checking if the episode is now unlocked by attempting /drama/unlock_episode...");
            const unlockPayload = {
                series_id: seriesId,
                episode_id: lockedEp.id,
                auto_unlock: 0,
                check_auto_unlock: 0,
                diamond_auto_unlock: 0,
                check_diamond_auto_unlock: 0
            };
            const unlockResponse = await post('/drama/unlock_episode', unlockPayload).catch(e => {
                console.log("Unlock check failed:", e.response?.data?.message || e.message);
                return null;
            });

            if (unlockResponse) console.log("Unlock Response after Ad Finish:", JSON.stringify(unlockResponse, null, 2));
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
}

testUnlock();
