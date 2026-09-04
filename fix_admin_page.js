const fs = require('fs');
let ts = fs.readFileSync('src/app/admin/extension/page.tsx', 'utf8');

// 1. Create pharmacyMap inside the render function
const beforeRender = `  const pmsInfo = data.pmsInfo;`;
const afterRender = `  const pmsInfo = data.pmsInfo;
  
  const pharmacyMap = new Map();
  pharmacies.forEach(p => pharmacyMap.set(p.id, p.name));`;
ts = ts.replace(beforeRender, afterRender);

// 2. Replace {inv.pharmacyId} with pharmacy map lookup
ts = ts.replace(/\{inv\.pharmacyId\}/g, '{pharmacyMap.get(inv.pharmacyId) || inv.pharmacyId}');

// 3. Replace {sale.pharmacyId} with pharmacy map lookup
ts = ts.replace(/\{sale\.pharmacyId\}/g, '{pharmacyMap.get(sale.pharmacyId) || sale.pharmacyId}');

fs.writeFileSync('src/app/admin/extension/page.tsx', ts);
console.log("Updated page.tsx to display pharmacy names");
