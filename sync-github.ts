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
        }
    });

    try {
        // 1. Skip Create Repo (Manually created by user)
        console.log(`🚀 Starting sync for repo: ${REPO_NAME}`);

        // 2. Sync Files (Recursive)
        const baseDir = process.cwd();
        const ignoreList = ['.next', 'node_modules', '.git', '.vercel', 'tmp', '.gemini'];
        
        async function uploadDir(dir: string, remotePath: string = '') {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                if (ignoreList.includes(item)) continue;
                
                const fullPath = path.join(dir, item);
                const relPath = path.join(remotePath, item).replace(/\\/g, '/');
                
                if (fs.statSync(fullPath).isDirectory()) {
                    await uploadDir(fullPath, relPath);
                } else {
                    await uploadFile(fullPath, relPath);
                }
            }
        }

        async function uploadFile(localPath: string, remotePath: string) {
            const content = fs.readFileSync(localPath, 'base64');
            try {
                // Get SHA if exists
                let sha;
                try {
                    const { data } = await github.get(`/repos/${OWNER}/${REPO_NAME}/contents/${remotePath}`);
                    sha = data.sha;
                } catch (e) {}

                await github.put(`/repos/${OWNER}/${REPO_NAME}/contents/${remotePath}`, {
                    message: `sync: ${remotePath}`,
                    content,
                    sha
                });
                console.log(`📤 Synced: ${remotePath}`);
            } catch (e: any) {
                console.error(`❌ Failed to sync ${remotePath}:`, e.response?.data || e.message);
            }
        }

        await uploadDir(baseDir);
        console.log("🏁 Sync Complete!");

    } catch (err: any) {
        console.error("🔥 Fatal Error:", err.response?.data || err.message);
    }
}

sync();
