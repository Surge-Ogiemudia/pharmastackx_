const XLSX = require('xlsx');
const axios = require('axios');

const filePath = `C:\\Users\\HP\\Desktop\\Sales and Inventory Management and Information System  Macrosales.xlsx`;

async function run() {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`Total rows in sheet: ${rows.length}`);

  // Header is row 0: ['S/N', 'Description', 'Qty', 'Cost Price (₦)', 'Selling Price  (₦)', ...]
  const updates = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const rawName = String(row[1]).trim();
    if (!rawName || rawName.length < 2) continue;

    // Parse Qty
    let qty = 0;
    if (row[2] !== undefined && row[2] !== null) {
      const parsedQty = parseInt(String(row[2]).replace(/[^0-9-]/g, ''), 10);
      if (!isNaN(parsedQty)) qty = Math.max(0, parsedQty); // Non-negative
    }

    // Parse Selling Price
    let price = 0;
    if (row[4] !== undefined && row[4] !== null) {
      const parsedPrice = parseFloat(String(row[4]).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedPrice)) price = parsedPrice;
    }

    updates.push({
      name: rawName,
      qty: qty,
      price: price
    });
  }

  console.log(`Extracted ${updates.length} valid product items.`);

  // Batch into chunks of 400 items
  const chunkSize = 400;
  const chunks = [];
  for (let i = 0; i < updates.length; i += chunkSize) {
    chunks.push(updates.slice(i, i + chunkSize));
  }

  console.log(`Splitting into ${chunks.length} batches for cloud sync...`);

  let totalPushed = 0;
  for (let b = 0; b < chunks.length; b++) {
    const batch = chunks[b];
    console.log(`Pushing Batch ${b + 1}/${chunks.length} (${batch.length} items)...`);

    try {
      const response = await axios.post('https://www.pharmastackx.com/api/sync', {
        pharmacy_slug: 'medlife',
        pharmacy_name: 'Medlife Pharmacy',
        coordinates: null,
        updates: batch,
        deletes: [],
        sync_tier: 1,
        app_version: '1.3.0'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SYNKK_API_KEY || 'dev-token'}`
        },
        timeout: 45000
      });

      totalPushed += batch.length;
      console.log(`✓ Batch ${b + 1} pushed successfully! Total pushed: ${totalPushed}/${updates.length}`);
    } catch (err) {
      console.error(`❌ Batch ${b + 1} failed:`, err.response?.data || err.message);
    }
  }

  console.log(`\n🎉 SYNC COMPLETE! Successfully pushed ${totalPushed} products to medlife.psx.ng!`);
}

run().catch(e => {
  console.error('Fatal import error:', e);
  process.exit(1);
});
