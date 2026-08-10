import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.github.com/repos/Surge-Ogiemudia/synkk-downloads/releases/latest', {
      headers: {
        'User-Agent': 'PharmaStackX-Web',
        'Accept': 'application/vnd.github.v3+json'
      },
      next: { revalidate: 60 } // Cache latest release lookup for 60 seconds
    });

    if (res.ok) {
      const data = await res.json();
      const exeAsset = data.assets?.find((a: any) => a.name.endsWith('.exe'));
      if (exeAsset?.browser_download_url) {
        return NextResponse.redirect(exeAsset.browser_download_url);
      }
    }
  } catch (error) {
    console.error('Failed to resolve latest terminal release:', error);
  }

  // Fallback to latest releases page if API lookup fails
  return NextResponse.redirect('https://github.com/Surge-Ogiemudia/synkk-downloads/releases/latest');
}
