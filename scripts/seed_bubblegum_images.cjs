const mongoose = require('mongoose');

const uri = 'mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0';

const verifiedImages = {
  postinor: "https://d3ckuu7lxvlwp2.cloudfront.net/products_alt_img/10950660906166f994eccddproduct_alt.webp",
  postpill: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K97H0BZRQ1VBFQG43WVHE4M7.png",
  gynopill: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K97H0BZRQ1VBFQG43WVHE4M7.png",
  microgynon: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01KEVT19MY457WGJQWMBS8VXEM.jpeg",
  depo_provera: "https://airmedng.com/wp-content/uploads/2024/10/ADAY-KIT.jpg",
  lydia_iud: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K97H0BZRQ1VBFQG43WVHE4M7.png",
  
  buscopan: "https://d3ckuu7lxvlwp2.cloudfront.net/products/183114433660a4f06621362product.jpg",
  mefenamic: "https://hubpharmafrica.com/wp-content/uploads/2024/10/Ponstan-Capsule-250mg-x-50Mefenamic-Acid.jpg",
  nospamin: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K8TTVZDQNERH6W5JSWGFEKP6.jpg",
  
  pregnacare_original: "https://www.vitabiotics.com/cdn/shop/files/Pregnacare_Original_1028x1028_b9a8a51a-2cc1-4ee6-beb7-836f4379e2d0.png",
  pregnacare_plus: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K94Y3J77743FP7VKK0QS3T3Y.png",
  wellwoman_original: "https://d3ckuu7lxvlwp2.cloudfront.net/products/168580671064662d64a9439product.webp",
  wellwoman_max: "https://d3ckuu7lxvlwp2.cloudfront.net/products/814883238627bd6c77c3abproduct.webp",
  menopace: "https://airmedng.com/wp-content/uploads/2024/10/MENOPACE-ORIGINAL-X-30-CAPLETS.jpg",
  feroglobin_cap: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01HFP82ZZSEYKR8AM53YRJVD0R.jpg",
  feroglobin_liq: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01K950RBQ8SQME3YVM803DDQYQ.png",
  astymin_cap: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01HFVHRGQCF4W6PR58WY9S1JST.webp",
  astymin_syr: "https://d3ckuu7lxvlwp2.cloudfront.net/products/UT49Mi9Y1fkt51DhNgeGMFmIxIYJPgSaOfMWCyv3.png",
  folic_acid: "https://d3ckuu7lxvlwp2.cloudfront.net/products/52291590362d86f8e1f260product.webp",
  evening_primrose: "https://airmedng.com/wp-content/uploads/2024/02/epo-x90-300x300.jpg",
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
  other_condom: "https://healthplusnigeria.com/cdn/shop/files/laldoh6glbbvhijich52.webp",
  
  bio_oil: "https://airmedng.com/wp-content/uploads/2025/06/Bio-Oil-60ml.jpeg",
  ky_jelly: "https://d3ckuu7lxvlwp2.cloudfront.net/products/74335830561d5994c93413product.webp",
  sanitary_pad: "https://airmedng.com/wp-content/uploads/2025/06/SOFTCARE-SANITARY-PAD.jpg",
  tampon: "https://d3ckuu7lxvlwp2.cloudfront.net/products/01HFV3B8APM4MRXCKCTH54QCHW.jpg",
  
  nitrofurantoin: "https://airmedng.com/wp-content/uploads/2025/06/NITROFURANTOIN-TAB-100MG-X10-22.jpeg",
  cranberry: "https://airmedng.com/wp-content/uploads/2024/11/Naturesfield-Cranberry-1.webp",
};

function assignProductImage(name, activeIngredient) {
  const norm = ((name || '') + ' ' + (activeIngredient || '')).toLowerCase();
  
  if (norm.includes('postinor')) return verifiedImages.postinor;
  if (norm.includes('postpill') || norm.includes('post-pill') || norm.includes('post pill')) return verifiedImages.postpill;
  if (norm.includes('gynopill') || norm.includes('levonorgestrel')) return verifiedImages.gynopill;
  if (norm.includes('microgynon')) return verifiedImages.microgynon;
  if (norm.includes('depo') || norm.includes('provera')) return verifiedImages.depo_provera;
  if (norm.includes('lydia') || norm.includes('copper t')) return verifiedImages.lydia_iud;
  
  if (norm.includes('buscopan') || norm.includes('hyoscine') || norm.includes('shree copan')) return verifiedImages.buscopan;
  if (norm.includes('mefenamic') || norm.includes('mefdol') || norm.includes('fenamex') || norm.includes('hostan') || norm.includes('ponstan')) return verifiedImages.mefenamic;
  if (norm.includes('nospamin')) return verifiedImages.nospamin;
  
  if (norm.includes('pregnacare')) {
    if (norm.includes('plus') || norm.includes('max') || norm.includes('omega')) return verifiedImages.pregnacare_plus;
    return verifiedImages.pregnacare_original;
  }
  if (norm.includes('wellwoman')) {
    if (norm.includes('max') || norm.includes('plus') || norm.includes('50+') || norm.includes('70+')) return verifiedImages.wellwoman_max;
    return verifiedImages.wellwoman_original;
  }
  if (norm.includes('menopace')) return verifiedImages.menopace;
  if (norm.includes('feroglobin')) {
    if (norm.includes('syrup') || norm.includes('suspension') || norm.includes('drops') || norm.includes('liquid')) return verifiedImages.feroglobin_liq;
    return verifiedImages.feroglobin_cap;
  }
  if (norm.includes('astymin')) {
    if (norm.includes('syrup') || norm.includes('tonic') || norm.includes('drops')) return verifiedImages.astymin_syr;
    return verifiedImages.astymin_cap;
  }
  if (norm.includes('folic') || norm.includes('hb 12')) return verifiedImages.folic_acid;
  if (norm.includes('primrose') || norm.includes('epostar') || norm.includes('primosa')) return verifiedImages.evening_primrose;
  if (norm.includes('inositol') || norm.includes('ovofolic') || norm.includes('recovara')) return verifiedImages.inositol;
  
  if (norm.includes('canesten')) return verifiedImages.canesten;
  if (norm.includes('mycoten') || norm.includes('clotrimazole') || norm.includes('candid') || norm.includes('cotlen')) {
    if (norm.includes('vag') || norm.includes('insert') || norm.includes('tab') || norm.includes('pessary')) return verifiedImages.mycoten_vag;
    return verifiedImages.mycoten_cream;
  }
  if (norm.includes('gyno-daktarin') || norm.includes('vagine')) return verifiedImages.mycoten_cream;
  if (norm.includes('diflucan')) return verifiedImages.diflucan;
  if (norm.includes('fluconazole') || norm.includes('flucamed') || norm.includes('eden') || norm.includes('kesflucan') || norm.includes('celozol') || norm.includes('donyflu') || norm.includes('cotozal')) return verifiedImages.fluconazole;
  
  if (norm.includes('ovulation')) return verifiedImages.ovulation_kit;
  if (norm.includes('pregnancy') || norm.includes('hcg') || norm.includes('know-it') || norm.includes('labacon') || norm.includes('agary') || norm.includes('precise') || norm.includes('expert') || norm.includes('global')) return verifiedImages.pregnancy_strip;
  
  if (norm.includes('durex')) {
    if (norm.includes('lubricant')) return verifiedImages.ky_jelly;
    return verifiedImages.durex;
  }
  if (norm.includes('fiesta')) return verifiedImages.fiesta;
  if (norm.includes('kiss condom') || norm.includes('kiss')) return verifiedImages.kiss_condom;
  if (norm.includes('gold circle')) return verifiedImages.gold_circle;
  if (norm.includes('condom') || norm.includes('rough rider') || norm.includes('skin 2 skin') || norm.includes('moods') || norm.includes('sensi') || norm.includes('skyn') || norm.includes('fire') || norm.includes('flex')) return verifiedImages.other_condom;
  
  if (norm.includes('bio-oil') || norm.includes('bio oil')) return verifiedImages.bio_oil;
  if (norm.includes('ky jelly') || norm.includes('k-y') || norm.includes('lubricant')) return verifiedImages.ky_jelly;
  if (norm.includes('tampon') || norm.includes('tampax')) return verifiedImages.tampon;
  if (norm.includes('pad') || norm.includes('panty liner') || norm.includes('softcare') || norm.includes('virony') || norm.includes('delepad') || norm.includes('norland') || norm.includes('aya') || norm.includes('angel zip')) return verifiedImages.sanitary_pad;
  
  if (norm.includes('cranberry')) return verifiedImages.cranberry;
  if (norm.includes('nitrofurantoin')) return verifiedImages.nitrofurantoin;
  
  return verifiedImages.postinor; // Graceful safe fallback
}

async function seed() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const partner = await db.collection('partners').findOne({ slug: 'bubblegum' });
  if (!partner) {
    throw new Error('Partner bubblegum not found!');
  }

  console.log(`Found partner "${partner.name}". Curated products count: ${partner.curatedProductIds.length}`);

  const products = await db.collection('products').find({ _id: { $in: partner.curatedProductIds } }).toArray();
  console.log(`Loaded ${products.length} products from database.`);

  const curatedCatalog = [];
  const customProductImages = {};

  let updatedProductCount = 0;

  for (const p of products) {
    const assignedImage = assignProductImage(p.itemName, p.activeIngredient);
    const prodIdStr = p._id.toString();

    // 1. Update Product document
    await db.collection('products').updateOne(
      { _id: p._id },
      { $set: { imageUrl: assignedImage } }
    );
    updatedProductCount++;

    // 2. Build Partner curatedCatalog entry
    curatedCatalog.push({
      productId: p._id,
      imageUrl: assignedImage,
      markup: partner.productMarkups && partner.productMarkups[prodIdStr] !== undefined
        ? partner.productMarkups[prodIdStr]
        : null,
    });

    // 3. Build Partner customProductImages entry
    customProductImages[prodIdStr] = assignedImage;
  }

  console.log(`Updated imageUrl on ${updatedProductCount} Product documents in MongoDB.`);

  // Update Partner document
  const partnerUpdateRes = await db.collection('partners').updateOne(
    { slug: 'bubblegum' },
    { 
      $set: { 
        curatedCatalog: curatedCatalog,
        customProductImages: customProductImages
      } 
    }
  );

  console.log(`Updated Partner document: matched ${partnerUpdateRes.matchedCount}, modified ${partnerUpdateRes.modifiedCount}`);

  // Verification step
  const verifyProducts = await db.collection('products').find({ _id: { $in: partner.curatedProductIds } }).toArray();
  const missingImg = verifyProducts.filter(p => !p.imageUrl || p.imageUrl.trim() === '');
  console.log(`Verification: ${verifyProducts.length} curated products checked. Missing image count: ${missingImg.length}`);

  const updatedPartner = await db.collection('partners').findOne({ slug: 'bubblegum' });
  console.log(`Partner curatedCatalog items: ${updatedPartner.curatedCatalog ? updatedPartner.curatedCatalog.length : 0}`);
  console.log(`Partner customProductImages keys: ${updatedPartner.customProductImages ? Object.keys(updatedPartner.customProductImages).length : 0}`);

  console.log('Seeding completed successfully!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
