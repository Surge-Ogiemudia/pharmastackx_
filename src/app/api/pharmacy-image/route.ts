
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// A palette of professional and complementary colors
const coolColors = [
    '#006D5B', // Main green
    '#004D40', // Darker green
    '#0288D1', // Blue
    '#5E35B1', // Deep Purple
    '#E91E63', // Pink
    '#C2185B', // Darker Pink
    '#F4511E', // Orange
];

/**
 * Generates a consistent color index from a string.
 * This ensures a pharmacy always gets the same background color.
 */
const stringToColorIndex = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % coolColors.length);
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const businessName = searchParams.get('name') || 'Pharmacy';

        // Use the first word of the business name for the image
        const displayText = businessName.split(' ')[0];

        const width = 300;
        const height = 150;
        const fontSize = 48;

        // Determine background and text colors
        const colorIndex = stringToColorIndex(businessName);
        const backgroundColor = coolColors[colorIndex];
        const textColor = '#FFFFFF';

        // Construct the SVG image as a string
        const svg = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${backgroundColor}" />
          <text
            x="50%"
            y="50%"
            dominant-baseline="middle"
            text-anchor="middle"
            font-family="'-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'"
            font-size="${fontSize}"
            font-weight="bold"
            fill="${textColor}"
            text-transform="capitalize"
          >
            ${displayText}
          </text>
        </svg>
        `;

        // Return the SVG with the correct headers
        return new NextResponse(svg, {
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=31536000, immutable', // Cache aggressively
            },
        });
    } catch (error) {
        console.error("Failed to generate pharmacy image:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
