const fs = require('fs');
let ts = fs.readFileSync('src/app/admin/extension/page.tsx', 'utf8');

ts = ts.replace(/Branch: \{s\.pharmacyId\}/g, 'Branch: {pharmacyMap.get(s.pharmacyId) || s.pharmacyId}');

fs.writeFileSync('src/app/admin/extension/page.tsx', ts);
console.log("Updated s.pharmacyId");
