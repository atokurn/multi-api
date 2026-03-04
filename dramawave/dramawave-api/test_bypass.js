import * as dramawaveService from './src/services/dramawaveService.js';

async function testBypass() {
    try {
        console.log("Testing DramaWave VIP Bypass Integration...");

        const seriesId = "aWz8URbqCm";
        const episode = 15; // Known VIP episode

        console.log(`\nFetching DramaWave Episode ${episode} for ${seriesId}...`);
        const result = await dramawaveService.playEpisodeByIndex(seriesId, episode);

        console.log("\nResult:");
        console.log(JSON.stringify(result, null, 2));

        if (result.success && result.data.source.includes('bypass')) {
            console.log("\n✅ BYPASS WORKING CORRECTLY! Stream was retrieved via FreeReels.");
        } else if (result.success) {
            console.log("\n✔️ Episode fetched, but it wasn't locked to begin with.");
        } else {
            console.log("\n❌ Bypass failed. Episode remains locked or an error occurred.");
        }
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testBypass();
