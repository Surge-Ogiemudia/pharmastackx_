const fs = require('fs');
let ts = fs.readFileSync('src/app/api/extension/pharmacies/route.ts', 'utf8');

const oldMap = `    const formatted = users.map(u => ({
      id: String(u._id),
      name: u.businessName || u.username || u.slug || 'Pharmacy Branch'
    }));`;

const newMap = `    const formatted = users.map(u => ({
      id: String(u._id),
      name: u.businessName || u.username || u.slug || 'Pharmacy Branch'
    }));

    const matchedIds = users.map(u => String(u._id));
    for (const id of allActiveIds) {
      if (!matchedIds.includes(String(id))) {
        formatted.push({
          id: String(id),
          name: \`Live Branch (\${String(id).slice(-6)})\`
        });
      }
    }`;

ts = ts.replace(oldMap, newMap);
fs.writeFileSync('src/app/api/extension/pharmacies/route.ts', ts);
console.log("Updated pharmacies route to include unregistered live branches");
