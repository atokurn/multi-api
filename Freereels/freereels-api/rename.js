import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIRECTORY = __dirname;

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'rename.js') continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.json'))) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Perform replacements
            let newContent = content
                .replace(/dramawave/g, 'freereels')
                .replace(/DramaWave/g, 'FreeReels');

            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

processDirectory(DIRECTORY);
console.log("Renaming complete.");
