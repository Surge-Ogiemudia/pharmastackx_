const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const uri = 'mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const partner = await mongoose.connection.db.collection('partners').findOne({ slug: 'bubblegum' });
  const products = await mongoose.connection.db.collection('products').find({ _id: { $in: partner.curatedProductIds } }).toArray();

  const names = products.map(p => ({
    id: p._id.toString(),
    name: p.itemName,
    category: p.category,
    activeIngredient: p.activeIngredient,
    imageUrl: p.imageUrl || ''
  }));

  fs.writeFileSync(path.join(__dirname, 'bubblegum_products.json'), JSON.stringify(names, null, 2), 'utf8');
  console.log(`Successfully wrote ${names.length} products to bubblegum_products.json`);

  const map = {};
  names.forEach(p => {
    const norm = (p.name + ' ' + (p.activeIngredient || '')).toLowerCase();
    let key = 'other';
    if (norm.includes('postinor')) key = 'postinor';
    else if (norm.includes('postpill') || norm.includes('post-pill') || norm.includes('post pill')) key = 'postpill';
    else if (norm.includes('gynopill') || norm.includes('levonorgestrel')) key = 'levonorgestrel';
    else if (norm.includes('microgynon')) key = 'microgynon';
    else if (norm.includes('depo') || norm.includes('provera')) key = 'depo-provera';
    else if (norm.includes('durex')) key = 'durex';
    else if (norm.includes('fiesta')) key = 'fiesta';
    else if (norm.includes('kiss condom') || norm.includes('kiss')) key = 'kiss-condom';
    else if (norm.includes('gold circle')) key = 'gold-circle';
    else if (norm.includes('condom') || norm.includes('rough rider') || norm.includes('skin 2 skin') || norm.includes('moods') || norm.includes('sensi') || norm.includes('skyn') || norm.includes('fire') || norm.includes('flex')) key = 'other-condom';
    else if (norm.includes('buscopan') || norm.includes('hyoscine')) key = 'buscopan';
    else if (norm.includes('mefenamic') || norm.includes('mefdol') || norm.includes('fenamex') || norm.includes('hostan') || norm.includes('ponstan')) key = 'mefenamic-acid';
    else if (norm.includes('pregnacare')) key = 'pregnacare';
    else if (norm.includes('wellwoman')) key = 'wellwoman';
    else if (norm.includes('menopace')) key = 'menopace';
    else if (norm.includes('astymin')) key = 'astymin';
    else if (norm.includes('feroglobin')) key = 'feroglobin';
    else if (norm.includes('folic acid')) key = 'folic-acid';
    else if (norm.includes('primrose')) key = 'evening-primrose';
    else if (norm.includes('inositol') || norm.includes('ovofolic')) key = 'inositol';
    else if (norm.includes('mycoten') || norm.includes('clotrimazole') || norm.includes('canesten') || norm.includes('candid') || norm.includes('cotlen')) key = 'clotrimazole-mycoten';
    else if (norm.includes('fluconazole') || norm.includes('diflucan') || norm.includes('flucamed') || norm.includes('eden') || norm.includes('kesflucan') || norm.includes('celozol') || norm.includes('donyflu') || norm.includes('cotozal')) key = 'fluconazole';
    else if (norm.includes('pregnancy') || norm.includes('hcg') || norm.includes('ovulation') || norm.includes('know-it') || norm.includes('labacon') || norm.includes('agary') || norm.includes('precise')) key = 'test-strips';
    else if (norm.includes('sanitary') || norm.includes('pad') || norm.includes('tampon') || norm.includes('tampax') || norm.includes('panty liner') || norm.includes('softcare') || norm.includes('virony') || norm.includes('delepad') || norm.includes('norland') || norm.includes('aya')) key = 'pads-tampons';
    else if (norm.includes('bio oil') || norm.includes('bio-oil')) key = 'bio-oil';
    else if (norm.includes('ky jelly') || norm.includes('k-y') || norm.includes('lubricant')) key = 'lubricant';
    else if (norm.includes('cranberry')) key = 'cranberry';
    else if (norm.includes('nitrofurantoin')) key = 'nitrofurantoin';
    else if (norm.includes('nospamin')) key = 'nospamin';
    else if (norm.includes('paracetamol')) key = 'paracetamol';
    
    map[key] = (map[key] || 0) + 1;
  });
  console.log('Clusters:', map);

  await mongoose.disconnect();
}

run().catch(console.error);
