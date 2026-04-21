import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load .env.local for tokens and secrets
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const REPO = "Surge-Ogiemudia/pharmastackx_";
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = "main";
const MESSAGE = "feat: navigation highlight fix and data privacy enforcement";

const FILES_TO_SYNC = [
    "src/components/ConfirmOrderContent.tsx",
    "src/models/DeliveryAgent.ts",
    "src/models/DeliverySession.ts",
    "src/app/api/admin/delivery-agents/route.ts",
    "src/app/api/notify-delivery-agent/route.ts",
    "src/components/DeliveryAgentsContent.tsx",
    "src/components/AccountContent.tsx",
    "src/lib/mongoConnect.ts",
    "src/app/api/whatsapp/webhook/route.ts",
    "src/lib/whatsapp-classifier.ts",
    "src/app/api/requests/route.ts",
    "src/lib/whatsapp-notifier.ts",
    "src/app/api/notify-pharmacists/route.ts",
    "src/models/GlobalSettings.ts",
    "src/app/api/admin/whatsapp/settings/route.ts",
    "src/app/api/admin/whatsapp/requests/route.ts",
    "src/components/WhatsAppManagement.tsx",
    "src/components/AccountContent.tsx",
    "src/app/api/ai/ask-rx/route.ts",
    "src/app/api/ai/ask-rx/escalate/route.ts",
    "src/app/api/ai/ask-rx/switch-to-ai/route.ts",
    "src/app/api/ai/suggestions/route.ts",
    "src/app/api/ai/scan-rx/route.ts",
    "src/app/api/ai/scan-med/route.ts",
    "src/app/api/stock/enrich-and-upload/route.ts",
    "src/components/OrderRequestsContent.tsx",
    "src/app/MainLayout.tsx",
    "src/lib/track.ts",
    "src/models/AnalyticsEvent.ts",
    "src/models/ExcludedDevice.ts",
    "src/app/api/track/route.ts",
    "src/app/api/admin/analytics/summary/route.ts",
    "src/app/api/admin/analytics/ai-query/route.ts",
    "src/app/api/admin/analytics/excluded-devices/route.ts",
    "src/components/DataCentreContent.tsx",
    "src/middleware.ts",
    "src/app/api/posts/route.ts",
    "src/app/api/products/route.js",
    "src/components/AskRxChat.tsx",
    "src/models/Consultation.ts",
    "src/components/AICommandCentreContent.tsx",
    "src/models/AISettings.ts",
    "src/app/api/admin/ai/settings/route.ts",
    "src/app/api/admin/ai/consultations/route.ts",
    "src/components/RxScanModal.tsx",
    "src/app/auth/page.tsx",
    "src/app/auth/SignupForm.tsx",
    "src/app/api/auth/signup/route.js",
    "src/app/api/account/route.ts",
    "src/app/api/auth/session/route.ts",
    "src/app/page.tsx",
    "src/components/DispatchForm.tsx",
    "src/app/api/requests/[id]/route.ts",
    "src/components/OrdersContent.tsx",
    "src/components/LearningContent.tsx",
    "src/components/PulseContent.tsx",
    "src/components/AboutContent.tsx",
    "src/components/PrivacyContent.tsx",
    "src/components/ReactiveQuoteOverlay.tsx",
    "src/components/BottomNav.tsx",
    "src/components/ReviewRequestContent.tsx",
    "src/lib/whapi.ts",
    "src/models/TopContact.ts",
    "src/models/WhatsAppSession.ts",
    "src/models/Request.js",
    "src/app/api/admin/top-contacts/route.ts",
    "src/components/TopContactsContent.tsx",
    "src/app/api/admin/settings/route.ts",
    "src/components/ManageRequest.tsx",
    "src/app/review-request/[id]/page.tsx",
    "src/components/CartContent.tsx",
    "src/components/DeliveryStatusModal.tsx",
    "src/app/api/delivery-status/route.ts"
];

async function sync() {
    if (!TOKEN) {
        console.error("❌ GITHUB_TOKEN is missing in .env.local");
        return;
    }

    const authHeader = { Authorization: `token ${TOKEN}` };

    try {
        console.log(`📡 Fetching latest commit for ${BRANCH} on ${REPO}...`);
        const { data: refData } = await axios.get(`https://api.github.com/repos/${REPO}/git/refs/heads/${BRANCH}`, { headers: authHeader });
        const lastCommitSha = refData.object.sha;

        console.log(`📄 Reading file contents...`);
        const treeItems = FILES_TO_SYNC.map(file => {
            const filePath = path.resolve(process.cwd(), file);
            return {
                path: file,
                mode: "100644",
                type: "blob",
                content: fs.readFileSync(filePath, 'utf-8')
            };
        });

        console.log(`🌳 Creating new tree...`);
        const { data: treeData } = await axios.post(`https://api.github.com/repos/${REPO}/git/trees`, {
            base_tree: lastCommitSha,
            tree: treeItems
        }, { headers: authHeader });

        console.log(`📝 Creating new commit...`);
        const { data: commitData } = await axios.post(`https://api.github.com/repos/${REPO}/git/commits`, {
            message: MESSAGE,
            tree: treeData.sha,
            parents: [lastCommitSha]
        }, { headers: authHeader });

        console.log(`🚀 Updating branch reference...`);
        await axios.patch(`https://api.github.com/repos/${REPO}/git/refs/heads/${BRANCH}`, {
            sha: commitData.sha
        }, { headers: authHeader });

        console.log(`✅ SYNC SUCCESSFUL! Commit SHA: ${commitData.sha}`);
        console.log(`🔗 Deployment should start on Vercel at: https://vercel.com/`);

    } catch (error: any) {
        console.error("❌ SYNC FAILED!");
        if (error.response) {
            console.error("API Error Status:", error.response.status);
            console.error("API Error Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error Message:", error.message);
        }
    }
}

sync();
