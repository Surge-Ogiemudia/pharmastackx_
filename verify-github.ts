import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'Surge-Ogiemudia';
const REPO = 'pharmastackx_';

async function verifySync() {
    const github = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/vnd.github.v3+json'
        }
    });

    try {
        const { data } = await github.get(`/repos/${OWNER}/${REPO}/contents/src`);
        console.log("✅ 'src' folder found on GitHub! File count:", data.length);
        const webhook = await github.get(`/repos/${OWNER}/${REPO}/contents/src/app/api/whatsapp/webhook/route.ts`);
        console.log("✅ Webhook route found on GitHub!");
    } catch (err: any) {
        console.error("❌ Verification Failed:", err.response?.status, err.response?.data || err.message);
    }
}

verifySync();
