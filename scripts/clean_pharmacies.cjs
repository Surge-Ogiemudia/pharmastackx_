const xlsx = require('xlsx');
const fs = require('fs');

const inputPath = 'C:\\Users\\HP\\Desktop\\dataset_crawler-google-places_2026-09-16_15-00-30-703.xlsx';
const outputPathJSON = 'C:\\Users\\HP\\Desktop\\clean_lagos_pharmacies.json';
const outputPathCSV = 'C:\\Users\\HP\\Desktop\\clean_lagos_pharmacies.csv';

console.log(`Reading Excel file: ${inputPath}...`);
const workbook = xlsx.readFile(inputPath);
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

console.log(`Total raw records: ${data.length}`);

// Valid categories (converted to lowercase for case-insensitive check)
const validCategories = ['pharmacy', 'drug store', 'chemist', 'health and beauty shop'];

const cleanedData = data
  .filter(row => {
    // 1. Must have a category
    if (!row.categoryName) return false;
    
    const cat = row.categoryName.toLowerCase();
    
    // 2. Filter out non-retail categories
    const isRetail = validCategories.some(validCat => cat.includes(validCat));
    if (!isRetail) return false;

    // 3. Must have a phone number to call
    if (!row.phone && !row.phoneUnformatted) return false;

    // 4. Must have coordinates
    if (!row['location/lat'] && !row['location.lat'] && !row.lat) return false;

    return true;
  })
  .map(row => {
    // Standardize object keys
    return {
      name: row.title || row['Place name'] || '',
      category: row.categoryName || '',
      phone: row.phone || row.phoneUnformatted || '',
      address: `${row.street || ''}, ${row.city || ''}`.replace(/^, /, '').trim(),
      city: row.city || 'Lagos',
      lat: row['location/lat'] || row['location.lat'] || row.lat,
      lng: row['location/lng'] || row['location.lng'] || row.lng,
      url: row.url || ''
    };
  });

console.log(`Cleaned records (Retail pharmacies with phone & GPS): ${cleanedData.length}`);

// Save to JSON
fs.writeFileSync(outputPathJSON, JSON.stringify(cleanedData, null, 2), 'utf-8');
console.log(`Saved JSON to: ${outputPathJSON}`);

// Save to CSV
if (cleanedData.length > 0) {
    const csvHeader = Object.keys(cleanedData[0]).join(',') + '\n';
    const csvRows = cleanedData.map(row => {
        return Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    fs.writeFileSync(outputPathCSV, csvHeader + csvRows, 'utf-8');
    console.log(`Saved CSV to: ${outputPathCSV}`);
}
