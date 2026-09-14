const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://pharmastakx_db_user:Osafuwame007%24@cluster0.tpkohgb.mongodb.net/test?appName=Cluster0';

// Search keywords mapped to sub-categories for Bubblegum Health
const KEYWORD_GROUPS = [
  // 1. Emergency Contraception & Birth Control
  {
    category: 'Contraceptive Kits',
    patterns: [
      'postinor', 'postpill', 'levonorgestrel', 'plan b', 'lydia', 'norlevo',
      'microgynon', 'yasmin', 'diane-35', 'diane 35', 'marvelon', 'nordette',
      'exluton', 'depo-provera', 'depo provera', 'sayana press', 'sayana',
      'durex', 'moods condom', 'fiesta condom', 'rough rider', 'skyn', 'condom',
      'emergency contraceptive'
    ]
  },
  // 2. Pregnancy & Ovulation Tests
  {
    category: 'Reproductive Health',
    patterns: [
      'pregnancy test', 'pregnancy strip', 'pregnancy cassette', 'hcg test',
      'ovulation test', 'ovulation strip', 'fertility test', 'clearblue', 'one step pregnancy'
    ]
  },
  // 3. Maternal, Prenatal & Women\'s Vitamins
  {
    category: 'Supplements',
    patterns: [
      'pregnacare', 'elevit', 'obimin', 'wellwoman', 'folic acid', 'folvite',
      'fe-folic', 'feroglobin', 'astymin', 'prenatal', 'maternal', 'iron plus',
      'sangobion', 'chela-fer', 'orofer', 'maltofer', 'evening primrose', 'myo-inositol',
      'inositol', 'vitex', 'menopace'
    ]
  },
  // 4. Feminine Hygiene & Intimate Care
  {
    category: 'Skincare',
    patterns: [
      'intimate wash', 'vagisil', 'femfresh', 'sebamed intimate', 'betadine feminine',
      'sanitary pad', 'panty liner', 'menstrual cup', 'tampon', 'k-y jelly', 'ky jelly',
      'durex play', 'vaginal gel', 'intimate gel', 'lubricant gel', 'bio-oil', 'bio oil',
      'stretch mark', 'lansinoh', 'breast pad', 'nursing pad'
    ]
  },
  // 5. Vaginal Thrush, Yeast & Infection Care
  {
    category: 'Reproductive Health',
    patterns: [
      'clotrimazole pessary', 'mycoten', 'canesten', 'candistat', 'gyno-daktarin',
      'gynodaktarin', 'miconazole pessary', 'fluconazole', 'diflucan', 'flucamed',
      'zocon', 'metronidazole pessary', 'clindamycin ovule', 'clindamycin vaginal'
    ]
  },
  // 6. Menstrual Pain Relief (Dysmenorrhea)
  {
    category: 'Pain Relief',
    patterns: [
      'mefenamic', 'ponstan', 'dysman', 'buscopan plus', 'buscopan', 'cataflam 50',
      'hyoscine butylbromide'
    ]
  },
  // 7. Urinary Tract Health (UTI)
  {
    category: 'Antibiotic',
    patterns: [
      'nitrofurantoin', 'macrobid', 'macrodantin', 'urispas', 'flavoxate',
      'cranberry extract', 'azo cranberry', 'uristat', 'ural effervescent'
    ]
  }
];

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\(\)\[\],-]/g, ' ')
    .replace(/\b(tabs|tablets|tab|caps|capsules|cap|pack|mg|ml|gm|g|pessary|pessaries)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const Product = mongoose.connection.collection('products');
  const Partner = mongoose.connection.collection('partners');

  // Verify partner exists
  const partner = await Partner.findOne({ slug: 'bubblegum' });
  if (!partner) {
    console.error('Partner "bubblegum" not found in database!');
    process.exit(1);
  }
  console.log(`Found partner: ${partner.name} (${partner.slug})`);
  console.log(`Current curated products count: ${(partner.curatedProductIds || []).length}`);

  // Construct regex pattern
  const allPatterns = KEYWORD_GROUPS.flatMap(g => g.patterns);
  const regex = new RegExp(allPatterns.join('|'), 'i');

  // Query database: valid amount > 0 and amount < 500000 (realistic prices)
  console.log('Querying products database for women’s reproductive health & wellness...');
  const candidates = await Product.find({
    amount: { $gte: 100, $lte: 150000 },
    businessName: { 
      $nin: [
        'Pharmacy Pharmacy',
        'Central Pharmacy',
        'Stackx Pharmacy',
        'utah pharmacy',
        'Pi Pharmacy',
        'Mantle pharmacy'
      ] 
    },
    $or: [
      { itemName: { $regex: regex } },
      { activeIngredient: { $regex: regex } }
    ]
  }).project({
    _id: 1,
    itemName: 1,
    activeIngredient: 1,
    category: 1,
    amount: 1,
    quantity: 1,
    isPublished: 1,
    businessName: 1
  }).toArray();

  console.log(`Found ${candidates.length} raw candidate products from verified pharmacies matching keywords.`);

  // Group and deduplicate
  const seenNormalized = new Map();
  const selectedProducts = [];

  const topPharmacies = ['Medlife Pharmacy', 'Feel New Pharmacy', 'Divine Life Gate Pharmacy', 'Ernosa Pharmacy', 'KOP Pharmacy and supermarket'];

  // Sort candidates by priority: top real pharmacies first, in-stock first, published first
  candidates.sort((a, b) => {
    const aTop = topPharmacies.includes(a.businessName) ? 1 : 0;
    const bTop = topPharmacies.includes(b.businessName) ? 1 : 0;
    if (bTop !== aTop) return bTop - aTop;

    const aStock = (a.quantity || 0) > 0 ? 1 : 0;
    const bStock = (b.quantity || 0) > 0 ? 1 : 0;
    if (bStock !== aStock) return bStock - aStock;

    if (a.isPublished && !b.isPublished) return -1;
    if (!a.isPublished && b.isPublished) return 1;
    return 0;
  });

  for (const item of candidates) {
    // Determine which category group it best matches
    const nameLower = (item.itemName || '').toLowerCase();
    const ingLower = (item.activeIngredient || '').toLowerCase();
    const text = `${nameLower} ${ingLower}`;

    // Skip irrelevant false positives
    if (
      text.includes('veterinary') || 
      text.includes('dog') || 
      text.includes('cat') || 
      text.includes('poultry') ||
      text.includes('feed')
    ) {
      continue;
    }

    // Match keyword group
    let matchedGroup = null;
    for (const group of KEYWORD_GROUPS) {
      if (group.patterns.some(p => text.includes(p))) {
        matchedGroup = group;
        break;
      }
    }

    if (!matchedGroup) continue;

    // Normalize for deduplication
    // Group key is based on primary brand / active ingredient + form
    const key = normalizeTitle(item.itemName).slice(0, 25);

    if (!seenNormalized.has(key)) {
      seenNormalized.set(key, item);
      selectedProducts.push({
        id: item._id,
        name: item.itemName,
        ingredient: item.activeIngredient,
        category: matchedGroup.category,
        amount: item.amount,
        quantity: item.quantity,
        businessName: item.businessName
      });
    }
  }

  console.log(`\nSelected ${selectedProducts.length} unique, deduplicated products for Bubblegum Health:`);
  
  // Categorize breakdown
  const byCategory = {};
  selectedProducts.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });

  console.log('Category breakdown:', byCategory);

  console.log('\nSample Products Selected:');
  selectedProducts.slice(0, 30).forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.category}] ${p.name} - ₦${p.amount.toLocaleString()} (${p.businessName})`);
  });

  // Apply to Bubblegum partner document
  const idsToCurate = selectedProducts.map(p => p.id);
  
  const updateResult = await Partner.updateOne(
    { slug: 'bubblegum' },
    { $set: { curatedProductIds: idsToCurate } }
  );

  console.log(`\nUpdated Partner document! Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`);
  console.log(`Bubblegum Health now has ${idsToCurate.length} curated products live on their storefront!`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
