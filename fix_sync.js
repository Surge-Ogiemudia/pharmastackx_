const fs = require('fs');
let ts = fs.readFileSync('src/app/api/extension/sync-inventory/route.ts', 'utf8');

const replacement = `    const normalizedItems = rows.map((r: any) => {
      if (Array.isArray(r)) {
        return {
          sn: String(r[0] || ''),
          name: String(r[1] || 'Unknown Item'),
          qty: parseNum(r[2]),
          price: parseNum(r[3])
        };
      }
      return {
        sn: String(r.sn || r.id || r.sku || ''),
        name: String(r.name || r.item || r.product || 'Unknown Item'),
        qty: parseNum(r.qty || r.quantity || r.stock),
        price: parseNum(r.price || r.amount || r.cost)
      };
    });`;

ts = ts.replace(/const normalizedItems = rows\.map\(\(r: any\) => \(\{[\s\S]*?\}\)\);/, replacement);

fs.writeFileSync('src/app/api/extension/sync-inventory/route.ts', ts);
console.log("Updated sync-inventory route to handle arrays of arrays");
