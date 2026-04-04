import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'Surge-Oglemudia';
const REPO = 'pharmastackx';

async function testUpload() {
    const github = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/vnd.github.v3+json'
        }
    });

    try {
        console.log(`🚀 Attempting upload to: /repos/${OWNER}/${REPO}/contents/TEST_FILE.txt`);
        const res = await github.put(`/repos/${OWNER}/${REPO}/contents/TEST_FILE.txt`, {
            message: "test upload",
            content: Buffer.from("Hello Antigravity").toString('base64')
        });
        console.log("✅ Success:", res.status);
    } catch (err: any) {
        console.error("❌ Failed:", err.response?.status, err.response?.data || err.message);
    }
}

testUpload();
