const fs = require('fs');
const code = fs.readFileSync('frontend/src/app/drennia/business/ManufacturingDeskTab.tsx', 'utf8');

const lines = code.split('\n');
console.log(`Analyzing ${lines.length} lines...`);

// Look for state setters called directly in render (without arrow functions in onClick)
// Look for useEffects missing dependencies
// Look for typos in strings

const findStraySetters = () => {
    lines.forEach((line, i) => {
        if (line.match(/onClick=\{set[A-Z][a-zA-Z0-9]*\(/)) {
            console.log(`Possible immediate state setter line ${i+1}: ${line.trim()}`);
        }
    });
};

const findTypos = () => {
    const commonTypos = [
        'teh', 'adress', 'acheive', 'definetly', 'seperate', 'succes', 'occurred', 'manifacturing', 
        'effeciency', 'reputaion', 'performence', 'relability', 'vechicle', 'maintainance', 'cancle', 'comfirm'
    ];
    lines.forEach((line, i) => {
        const lower = line.toLowerCase();
        commonTypos.forEach(t => {
            if (lower.includes(t)) {
                console.log(`Possible typo "${t}" on line ${i+1}: ${line.trim()}`);
            }
        });
    });
};

const findWrongVariables = () => {
    lines.forEach((line, i) => {
        if (line.match(/className="[^"]*class=/)) {
            console.log(`class= in className line ${i+1}: ${line.trim()}`);
        }
    });
};

findStraySetters();
findTypos();
findWrongVariables();

