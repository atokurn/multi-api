import { callDramaNovaApi } from './src/services/dramanova.js';

async function run() {
    try {
        console.log("Calling API...");
        const result = await callDramaNovaApi('/drama/list', 'GET', {}, {}, null);
        console.log("Result TYPE:", typeof result);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
