const fs = require('fs');
const content = fs.readFileSync('medflix-student.html', 'utf8');
const match = content.match(/\[SUPPRIM.\]/);
console.log(match ? match[0] : 'not found');
