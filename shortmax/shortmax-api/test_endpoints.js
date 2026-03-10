import axios from 'axios';

const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}`;

async function testEndpoint(name, url) {
    console.log(`\n======================================`);
    console.log(`Testing: ${name}`);
    console.log(`URL: ${url}`);
    console.log(`======================================`);

    try {
        const response = await axios.get(url);
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2).substring(0, 1000)}...`); // Truncate long responses
        return response.data;
    } catch (error) {
        console.error(`Error testing ${name}:`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(error.message);
        }
        return null;
    }
}

async function runTests() {
    console.log(`Starting ShortMax API tests on ${BASE_URL}...`);

    // 1. Health Check
    await testEndpoint('Health Check', `${BASE_URL}/api/health`);

    // 2. Search
    const searchKeyword = 'love';
    await testEndpoint('Search', `${BASE_URL}/api/search?q=${searchKeyword}`);

    // 3. Ranking
    const rankingData = await testEndpoint('Ranking', `${BASE_URL}/api/ranking`);

    let dramaCode = null;

    // Try to get a valid drama code from ranking
    if (rankingData && rankingData.data && rankingData.data.length > 0) {
        dramaCode = rankingData.data[0].code;
        console.log(`\n[Info] Extracted drama code from ranking: ${dramaCode}`);
    } else {
        console.log(`\n[Warning] Could not extract drama code from ranking. Using fallback...`);
        dramaCode = 'some_fallback_code'; // Normally you'd want a real code
    }

    if (dramaCode) {
        // 4. Detail
        await testEndpoint('Detail', `${BASE_URL}/api/detail/${dramaCode}`);

        // 5. Chapters
        await testEndpoint('Chapters', `${BASE_URL}/api/chapters/${dramaCode}`);

        // 6. Play
        await testEndpoint('Play (Index 1)', `${BASE_URL}/api/play/${dramaCode}/1`);
    } else {
        console.log(`\n[Skip] Skipping Detail, Chapters, and Play endpoints due to missing drama code.`);
    }

    console.log(`\n======================================`);
    console.log(`Tests completed.`);
    console.log(`======================================\n`);
}

// Give server a moment to start if run concurrently
setTimeout(runTests, 1000);
