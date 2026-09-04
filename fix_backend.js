const fs = require('fs');
const file = 'C:/Users/HP/Desktop/zipped pharmastackx/src/app/api/extension/dashboard-data/route.ts';
let content = fs.readFileSync(file, 'utf8');

const oldCheck =       const user = await User.findOne({ 
        $or: [
          { slug: { $regex: new RegExp(\^\${pharmacyId}\$\, 'i') } },
          { businessName: { $regex: new RegExp(\^\${pharmacyId}\$\, 'i') } }
        ]
      });;

const newCheck =       // Escape special characters for regex
      const escapeRegex = (string) => string.replace(/[.*+?^]/g, '\\\\$&');
      const escapedId = escapeRegex(pharmacyId);
      
      const user = await User.findOne({ 
        $or: [
          { slug: { $regex: new RegExp(\^\${escapedId}\$\, 'i') } },
          { businessName: { $regex: new RegExp(\^\${escapedId}\$\, 'i') } }
        ]
      });;

content = content.replace(oldCheck, newCheck);
fs.writeFileSync(file, content);
