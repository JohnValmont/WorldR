import fs from 'fs';

const p = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let c = fs.readFileSync(p, 'utf-8');

const r1 = `              )}

              {/* Leaderboard / Regional Market Share */}
              {leaderboardData && leaderboardData.segments && leaderboardData.segments.length > 0 && (
                <PanelBox>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[13px] font-bold text-zinc-100 m-0">Regional Market Share</h3>
                    <select
                      value={selectedLeaderboardRegion}
                      onChange={e => setSelectedLeaderboardRegion(e.target.value)}
                      className="rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-terminal-amber/60 transition-colors cursor-pointer"
                    >
                      {leaderboardData.segments.map((seg: any) => (
                        <option key={seg.segmentId} value={seg.segmentId}>{seg.marketName}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const selectedSegment = leaderboardData.segments.find((s: any) => s.segmentId === selectedLeaderboardRegion) || leaderboardData.segments[0];
                    const pieData = selectedSegment?.companies || [];
                    
                    if (pieData.length === 0) {
                      return <div className="text-zinc-500 text-xs italic text-center p-4">No sales data for this region last month.</div>;
                    }
                    
                    return (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pieData}
                              dataKey="marketShare"
                              nameKey="companyName"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={(entry) => \`\${entry.companyName} (\${(entry.marketShare * 100).toFixed(1)}%)\`}
                            >
                              {pieData.map((entry: any, index: number) => (
                                <Cell key={\`cell-\${index}\`} fill={['#36d399', '#6ea8fe', '#d4af37', '#b85555', '#a855f7', '#f97316'][index % 6]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: number) => [\`\${(value * 100).toFixed(1)}%\`, 'Market Share']}
                              contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #2a2a2a' }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </PanelBox>
              )}
            
            </>
          )}
        </div>
      )}


      {/* ────────────────────────────────────────────────────────────────────────
          MARKET INTELLIGENCE TAB`;

const targetAnchor = `              )}
            
            </>
          )}
        </div>
      )}


      {/* ────────────────────────────────────────────────────────────────────────
          MARKET INTELLIGENCE TAB`;


if (c.includes(targetAnchor)) {
  const parts = c.split(targetAnchor);
  c = parts[0] + r1 + parts[1];
  fs.writeFileSync(p, c, 'utf-8');
  console.log("Success with exact string split");
} else {
  console.log("Anchor not found again");
}
