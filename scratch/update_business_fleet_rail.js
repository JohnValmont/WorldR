const fs = require('fs');
const file = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update Right Rail Recommendation in StartBusinessTab
const recommendationRegex = /<div style=\{\{ fontSize: '11px', color: T.ivory, lineHeight: 1.5 \}\}>After filing, your first step should be to visit the Procurement desk to acquire your first operational vehicle.<\/div>/;
const newRecommendation = `<div style={{ fontSize: '11px', color: T.ivory, lineHeight: 1.5 }}>After filing, your first step should be to visit the Procurement desk to acquire your first operational asset: {selectedModel === 'Port Shuttle Operator' || selectedModel === 'Local Courier Operator' ? 'Used Delivery Van' : 'Box Truck'}.</div>`;
code = code.replace(recommendationRegex, newRecommendation);

// Update FleetTab to add Open Procurement button
const fleetProcurementRegex = /<PanelBox>\s*<SectionHeader>Fleet Orders \/ Procurement<\/SectionHeader>\s*<FieldRow label="Player Listings" value="Locked" valueColor=\{T\.faint\} \/>\s*<FieldRow label="NPC Stock" value="Available" valueColor=\{T\.mint\} \/>\s*<\/PanelBox>/;
const newFleetProcurement = `<PanelBox>
              <SectionHeader>Procurement Market</SectionHeader>
              <FieldRow label="Player Listings" value="Locked" valueColor={T.faint} />
              <FieldRow label="NPC Stock" value="Available" valueColor={T.mint} />
              <div style={{ marginTop: '16px' }}>
                <GhostButton onClick={() => setDeskTab('procurement')}>Open Procurement →</GhostButton>
              </div>
            </PanelBox>`;
code = code.replace(fleetProcurementRegex, newFleetProcurement);

// Also remove the vehicle purchase list from FleetTab since it is now in ProcurementTab
// Actually, earlier I didn't remove it from FleetTab. Let's find SectionHeader stamp="PROCURE" in FleetTab and remove it down to Used Market
const fleetProcureToRemoveRegex = /<SectionHeader stamp="PROCURE">Vehicle Procurement Market<\/SectionHeader>[^]*?Player Used Market<\/SectionHeader>[^]*?Used vehicle listings from other players will appear here in Beta\.\s*<\/div>\s*<\/div>/;
code = code.replace(fleetProcureToRemoveRegex, '');

fs.writeFileSync(file, code);
console.log('Update 2 Complete!');
