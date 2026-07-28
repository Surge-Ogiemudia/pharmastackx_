const XLSX = require('xlsx');
const fs = require('fs');

const filePath = `C:\\Users\\HP\\Desktop\\Sales and Inventory Management and Information System  Macrosales.xlsx`;

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet names:', workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\nSheet '${sheetName}' has ${data.length} rows.`);
    if (data.length > 0) {
      console.log('Sample rows:');
      data.slice(0, 10).forEach((r, idx) => console.log(`Row ${idx}:`, r));
    }
  }
} catch (e) {
  console.error('Error reading Excel with SheetJS:', e.message);
}
