import { MetadataRoute } from 'next';
import { dbConnect } from '@/lib/mongoConnect';
import Post from '@/models/Post';

const BASE_URL = 'https://pharmastackx.com';

export const revalidate = 3600; // regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    await dbConnect();
    const posts = await Post.find({ status: 'published' }).select('slug updatedAt').lean();

    const articleEntries: MetadataRoute.Sitemap = posts.map((post: any) => ({
        url: `${BASE_URL}/pulse/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    return [
        { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
        { url: `${BASE_URL}/pulse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        ...articleEntries,
    ];
}
