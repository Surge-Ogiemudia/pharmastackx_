import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'Surge-Ogiemudia';
const REPO = 'pharmastackx_';

async function listAllFiles() {
    if (!TOKEN) throw new Error("GITHUB_TOKEN missing");

    const github = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/vnd.github.v3+json'
        }
    });

    try {
        const { data } = await github.get(`/repos/${OWNER}/${REPO}/contents`);
        console.log("Root Files on GitHub:");
        data.forEach((f: any) => {
            console.log(`- ${f.name} (${f.type})`);
        });

        // Security check for .env.local
        const hasEnv = data.some((f: any) => f.name === '.env.local');
        if (hasEnv) {
            console.log("⚠️ WARNING: Found .env.local on GitHub! Attempting a security wipe...");
            const { data: envFile } = await github.get(`/repos/${OWNER}/${REPO}/contents/.env.local`);
            await github.delete(`/repos/${OWNER}/${REPO}/contents/.env.local`, {
                data: {
                    message: "security: Remove .env.local secrets",
                    sha: envFile.sha
                }
            });
            console.log("✅ SECURITY: .env.local has been DELETED from the repository.");
        } else {
            console.log("✅ SECURITY: No sensitive .env files detected.");
        }
    } catch (err: any) {
        console.error("🔥 Error:", err.response?.status, err.response?.data || err.message);
    }
}

listAllFiles();
