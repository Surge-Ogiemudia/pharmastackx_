const https = require('https');
const http = require('http');

const urls = {
  postinor: "https://d3ckuu7lxvlwp2.cloudfront.net/products_alt_img/10950660906166f994eccddproduct_alt.webp",
  postpill: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K97H0BZRQ1VBFQG43WVHE4M7.png",
  microgynon: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01KEVT19MY457WGJQWMBS8VXEM.jpeg",
  buscopan: "https://d3ckuu7lxvlwp2.cloudfront.net/products/183114433660a4f06621362product.jpg",
  nospamin: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K8TTVZDQNERH6W5JSWGFEKP6.jpg",
  pregnacare_original: "https://www.vitabiotics.com/cdn/shop/files/Pregnacare_Original_1028x1028_b9a8a51a-2cc1-4ee6-beb7-836f4379e2d0.png",
  wellwoman_original: "https://d3ckuu7lxvlwp2.cloudfront.net/products/168580671064662d64a9439product.webp",
  wellwoman_max: "https://d3ckuu7lxvlwp2.cloudfront.net/products/814883238627bd6c77c3abproduct.webp",
  menopace: "https://airmedng.com/wp-content/uploads/2024/10/MENOPACE-ORIGINAL-X-30-CAPLETS.jpg",
  feroglobin_cap: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01HFP82ZZSEYKR8AM53YRJVD0R.jpg",
  feroglobin_liq: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K950RBQ8SQME3YVM803DDQYQ.png",
  astymin_cap: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01HFVHRGQCF4W6PR58WY9S1JST.webp",
  astymin_syr: "https://d3ckuu7lxvlwp2.cloudfront.net/products/UT49Mi9Y1fkt51DhNgeGMFmIxIYJPgSaOfMWCyv3.png",
  folic_acid: "https://d3ckuu7lxvlwp2.cloudfront.net/products/52291590362d86f8e1f260product.webp",
  primrose: "https://airmedng.com/wp-content/uploads/2024/02/epo-x90-300x300.jpg",
  inositol: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K9D5XYY5HA63JWBR48Z9YYM3.webp",
  mycoten_cream: "https://d3ckuu7lxvlwp2.cloudfront.net/products/QWMhy3Ab7Ub1XeX5EYK0KoHPC4aHNVYblGXLD74r.jpeg",
  mycoten_vag: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01HHYVNA5XZ088NYZ9F7833AAR.jpg",
  canesten: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01JM8AYCYTS4YTZX62SGVMCYJP.webp",
  diflucan: "https://airmedng.com/wp-content/uploads/2024/10/diflucan.jpg",
  fluconazole: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01KW439C3H1VQVZRJCZWNN5T9Z.webp",
  pregnancy_strip: "https://d3ckuu7lxvlwp2.cloudfront.net/products/63569972960feb5f486b3aproduct.webp",
  ovulation_kit: "https://d3ckuu7lxvlwp2.cloudfront.net/products/3195598555f3bed4d28d69product.jpg",
  durex: "https://airmedng.com/wp-content/uploads/2024/10/Durex-Extra-Safe-Condom-X3-1.jpg",
  fiesta: "https://healthplusnigeria.com/cdn/shop/files/laldoh6glbbvhijich52.webp",
  kiss_condom: "https://www-konga-com-res.cloudinary.com/image/upload/f_auto,q_auto,w_800,c_limit/media/catalog/product/E/O/212179_1683395191.jpg",
  gold_circle: "https://www.ikonlinestore.com/wp-content/uploads/2023/06/gold-circle-condom.png",
  bio_oil: "https://airmedng.com/wp-content/uploads/2025/06/Bio-Oil-60ml.jpeg",
  ky_jelly: "https://d3ckuu7lxvlwp2.cloudfront.net/products/74335830561d5994c93413product.webp",
  sanitary_pad: "https://airmedng.com/wp-content/uploads/2025/06/SOFTCARE-SANITARY-PAD.jpg",
  molped_pad: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01HFV3B8APM4MRXCKCTH54QCHW.jpg",
  nitrofurantoin: "https://airmedng.com/wp-content/uploads/2025/06/NITROFURANTOIN-TAB-100MG-X10-22.jpeg",
  cranberry: "https://airmedng.com/wp-content/uploads/2024/11/Naturesfield-Cranberry-1.webp",
  ponstan: "https://hubpharmafrica.com/wp-content/uploads/2024/10/Ponstan-Capsule-250mg-x-50Mefenamic-Acid.jpg"
};

function checkUrl(key, url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
        resolve({ key, url, status: res.statusCode, type: res.headers['content-type'] });
      });
      req.on('error', (err) => resolve({ key, url, status: 'ERROR', error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ key, url, status: 'TIMEOUT' }); });
    } catch (e) {
      resolve({ key, url, status: 'EXCEPTION', error: e.message });
    }
  });
}

async function main() {
  console.log('Testing ' + Object.keys(urls).length + ' URLs...');
  const results = await Promise.all(Object.entries(urls).map(([k, u]) => checkUrl(k, u)));
  results.forEach(r => {
    const ok = r.status >= 200 && r.status < 400;
    console.log(`${ok ? '✓' : '✗'} [${r.status}] ${r.key} : ${r.type || r.error || ''}`);
  });
}

main().catch(console.error);
