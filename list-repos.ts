import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN = process.env.GITHUB_TOKEN;

async function listRepos() {
    if (!TOKEN) throw new Error("GITHUB_TOKEN missing");

    const github = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/vnd.github.v3+json'
        }
    });

    try {
        const { data } = await github.get('/user/repos');
        console.log("Full Repos Data:", JSON.stringify(data[0], null, 2));
    } catch (err: any) {
        console.error("🔥 Error listing repos:", err.response?.status, err.response?.data || err.message);
    }
}

listRepos();
