const mongoose = require('mongoose');
const URI = 'mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0';

const KEYWORD_GROUPS = [
  {
    category: 'Contraceptive Kits',
    patterns: [
      'postinor', 'postpill', 'levonorgestrel', 'plan b', 'lydia', 'norlevo',
      'microgynon', 'yasmin', 'diane', 'marvelon', 'nordette', 'exluton',
      'depo provera', 'depo-provera', 'sayana', 'durex', 'condom', 'contraceptive', 'fiesta', 'moods', 'flex'
    ]
  },
  {
    category: 'Supplements',
    patterns: [
      'pregnacare', 'elevit', 'obimin', 'wellwoman', 'folic', 'folvite',
      'fe-folic', 'feroglobin', 'astymin', 'prenatal', 'maternal', 'iron',
      'sangobion', 'chela-fer', 'orofer', 'maltofer', 'evening primrose', 'primrose',
      'inositol', 'vitex', 'menopace'
    ]
  },
  {
    category: 'Reproductive Health',
    patterns: [
      'pregnancy test', 'pregnancy strip', 'pregnancy cassette', 'hcg', 'ovulation',
      'clotrimazole', 'mycoten', 'canesten', 'candistat', 'gyno-daktarin',
      'gynodaktarin', 'miconazole', 'fluconazole', 'diflucan', 'flucamed',
      'zocon', 'metronidazole', 'flagyl', 'tinidazole', 'clindamycin', 'vaginal'
    ]
  },
  {
    category: 'Pain Relief',
    patterns: [
      'mefenamic', 'ponstan', 'dysman', 'buscopan', 'cataflam', 'hyoscine'
    ]
  },
  {
    category: 'Skincare',
    patterns: [
      'intimate wash', 'vagisil', 'femfresh', 'sebamed', 'betadine feminine',
      'sanitary pad', 'panty liner', 'menstrual', 'tampon', 'k-y jelly', 'ky jelly',
      'lubricant', 'bio-oil', 'bio oil', 'stretch mark', 'lansinoh', 'breast pad'
    ]
  },
  {
    category: 'Antibiotic',
    patterns: [
      'nitrofurantoin', 'macrobid', 'macrodantin', 'urispas', 'flavoxate', 'cranberry', 'azo', 'uristat', 'ural'
    ]
  }
];

async function main() {
  await mongoose.connect(URI);
  const Partner = mongoose.connection.collection('partners');
  const Product = mongoose.connection.collection('products');

  const partner = await Partner.findOne({ slug: 'bubblegum' });
  const items = await Product.find({ _id: { $in: partner.curatedProductIds } }).toArray();
  console.log(`Assigning categories for ${items.length} curated products...`);

  let updatedCount = 0;
  for (const item of items) {
    const text = `${(item.itemName || '').toLowerCase()} ${(item.activeIngredient || '').toLowerCase()}`;
    let matchedCategory = null;

    for (const g of KEYWORD_GROUPS) {
      if (g.patterns.some(p => text.includes(p))) {
        matchedCategory = g.category;
        break;
      }
    }

    if (!matchedCategory) {
      matchedCategory = 'Reproductive Health'; // Default fallback for Bubblegum
    }

    await Product.updateOne(
      { _id: item._id },
      { $set: { category: matchedCategory } }
    );
    updatedCount++;
  }

  console.log(`Successfully assigned clean categories to ${updatedCount} products!`);

  // Verify new distribution
  const updatedItems = await Product.find({ _id: { $in: partner.curatedProductIds } }).toArray();
  const cats = {};
  updatedItems.forEach(i => {
    cats[i.category] = (cats[i.category] || 0) + 1;
  });
  console.log('New Category Distribution on Storefront:', cats);

  await mongoose.disconnect();
}

main().catch(console.error);
