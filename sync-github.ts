import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN = process.env.GITHUB_TOKEN;
const REPO_NAME = 'pharmastackx_';
const OWNER = 'Surge-Ogiemudia'; // Verified login

async function sync() {
    if (!TOKEN) throw new Error("GITHUB_TOKEN missing");

    const github = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/vnd.github.v3+json'
        },
        timeout: 10000
    });

    try {
        console.log(`🚀 Starting TRIGGER sync for repo: ${REPO_NAME}`);

        async function uploadDir(localDir: string, remoteDir: string = '') {
            const items = fs.readdirSync(localDir);
            const ignoreList = ['.next', 'node_modules', '.git', '.vercel', 'tmp', '.gemini', '.env.local'];

            for (const item of items) {
                if (ignoreList.includes(item)) continue;
                const localPath = path.join(localDir, item);
                const remotePath = remoteDir ? `${remoteDir}/${item}` : item;

                if (fs.statSync(localPath).isDirectory()) {
                    await uploadDir(localPath, remotePath);
                } else {
                    const content = fs.readFileSync(localPath);
                    let sha: string | undefined;
                    try {
                        const { data } = await github.get(`/repos/${OWNER}/${REPO_NAME}/contents/${remotePath}`);
                        sha = data.sha;
                    } catch (e) {}

                    await github.put(`/repos/${OWNER}/${REPO_NAME}/contents/${remotePath}`, {
                        message: `sync: ${remotePath}`,
                        content: content.toString('base64'),
                        sha
                    });
                    console.log(`📤 Synced: ${remotePath}`);
                }
            }
        }

        await uploadDir(process.cwd());
        console.log("🏁 Sync Complete! Vercel is now building.");
    } catch (e: any) {
        console.error("❌ Failed to sync:", e.response?.data || e.message);
    }
}

sync();
