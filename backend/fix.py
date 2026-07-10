import os

p = r'd:\WorldR\frontend\src\app\drennia\business\ManufacturingDeskTab.tsx'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(r"label={(entry) => \`\${entry.companyName} (\${(entry.marketShare * 100).toFixed(1)}%)\`}", 
              "label={(entry) => `${entry.companyName} (${(entry.marketShare * 100).toFixed(1)}%)`}")

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
