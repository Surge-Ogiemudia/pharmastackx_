import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TOKEN = process.env.GITHUB_TOKEN;

async function checkUser() {
    if (!TOKEN) throw new Error("GITHUB_TOKEN missing");

    const github = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/vnd.github.v3+json'
        }
    });

    try {
        const { data } = await github.get('/user');
        console.log("Authenticated User:", data.login);
        const { data: repos } = await github.get('/user/repos');
        console.log("Accessible Repos:", repos.map((r: any) => r.full_name));
    } catch (err: any) {
        console.error("🔥 Error:", err.response?.status, err.response?.data || err.message);
    }
}

checkUser();
