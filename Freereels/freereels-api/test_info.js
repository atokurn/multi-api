import * as freereelsClient from './src/lib/freereelsClient.js';

async function run() {
    await freereelsClient.anonymousLogin();
    const id = '2QBpMgLRLj';
    console.log(`Fetching info_v2 for ${id}...`);
    try {
        const info = await freereelsClient.get('/drama/info_v2', {
            series_id: id,
            scene: 'for_you'
        });

        console.log('info code:', info.code);
        console.log('data keys:', Object.keys(info.data || {}));
        if (info.data && info.data.info) {
            console.log('data.info keys:', Object.keys(info.data.info));
            const infoObj = info.data.info;
            if (infoObj.episode_list) {
                console.log('episode_list length:', infoObj.episode_list.length);
                const eps = infoObj.episode_list.slice(0, 3);
                for (let i = 0; i < eps.length; i++) {
                    const ep = eps[i];
                    console.log(`Ep ${ep.index || i + 1}: video_url=${ep.video_url ? 'PRESENT' : 'MISSING'}, external_audio=${ep.external_audio_h264_m3u8 ? 'PRESENT' : 'MISSING'}, unlock=${ep.unlock}, free=${ep.free}`);
                }
            } else {
                console.log('- episode_list is MISSING!');
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
