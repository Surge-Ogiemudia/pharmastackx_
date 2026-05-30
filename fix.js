const fs = require('fs');

const path = 'src/app/api/cron/daily-social-manager/route.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix subject
code = code.replace("subject: 'Review Tomorrow's Social Post',", "subject: \"Review Tomorrow's Social Post\",");

// Fix text
const badText = "text: 'Hello ' + pharmacy.businessName + ',nnTomorrow's social media post has been drafted. Please log in to review, edit, or approve it.nnBest,nPharmastackX Team'";
const goodText = "text: 'Hello ' + pharmacy.businessName + ',\\n\\nTomorrow\\'s social media post has been drafted. Please log in to review, edit, or approve it.\\n\\nBest,\\nPharmastackX Team'";
code = code.replace(badText, goodText);

fs.writeFileSync(path, code);

// Fix line 99 text which had nn
let code2 = fs.readFileSync(path, 'utf8');
code2 = code2.replace(/nn/g, '\\n\\n').replace(/nPharmastackX/g, '\\nPharmastackX');
fs.writeFileSync(path, code2);
