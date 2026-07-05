const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.sql')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let orig = content;
            
            content = content.replace(/_orbit\b/g, '_year');
            content = content.replace(/_arc\b/g, '_month');
            content = content.replace(/_mark\b/g, '_day');
            
            content = content.replace(/_orbits\b/g, '_years');
            content = content.replace(/_arcs\b/g, '_months');
            content = content.replace(/_marks\b/g, '_days');
            
            content = content.replace(/orbit_started/g, 'year_started');
            content = content.replace(/arc_started/g, 'month_started');
            
            content = content.replace(/\borbit\b/gi, function(match) {
                return match === 'orbit' ? 'year' : match === 'Orbit' ? 'Year' : 'YEAR';
            });
            content = content.replace(/\barc\b/gi, function(match) {
                return match === 'arc' ? 'month' : match === 'Arc' ? 'Month' : 'MONTH';
            });
            content = content.replace(/\bmark\b/gi, function(match) {
                return match === 'mark' ? 'day' : match === 'Mark' ? 'Day' : 'DAY';
            });
            
            if (content !== orig) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    }
}
processDir('D:\\WorldR\\database');
