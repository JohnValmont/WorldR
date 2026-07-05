const fs = require('fs');
const path = require('path');

function checkDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
        const fullPath = path.join(dir, f.name);
        if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.next') {
            checkDir(fullPath);
        } else if (f.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                const match = line.match(/import\s+.*from\s+['"]([^'"]+)['"]/);
                if (match) {
                    let importPath = match[1];
                    if (importPath.startsWith('.')) {
                        let targetPath = path.resolve(dir, importPath);
                        if (!fs.existsSync(targetPath) && !fs.existsSync(targetPath + '.ts') && !fs.existsSync(targetPath + '.tsx') && !fs.existsSync(targetPath + '/index.ts') && !fs.existsSync(targetPath + '/index.tsx')) {
                            console.log(`Potential import mismatch in ${fullPath}:${i+1} - ${importPath}`);
                        }
                    }
                }
            });
        }
    }
}
checkDir('D:\\WorldR\\frontend\\src');
