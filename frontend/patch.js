const fs = require('fs');

const formatMoney = (value) => {
  if (!value) return '\\';
  const num = Number(value);
  if (num >= 1e9) return '\\$' + (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return '\\$' + (num / 1e6).toFixed(1) + 'M';
  return '\\$' + num.toLocaleString();
};

const newCards = \
      {/* Top 10 Most Popular Cars */}
      <Card kicker="Top 10 Most Popular Cars (Drennia)" icon={Star}>
        {!leaderboards?.popularCars ? (
          <div className="text-zinc-500 text-[11px] py-4">Loading...</div>
        ) : leaderboards.popularCars.length === 0 ? (
          <EmptyState icon={Star} message="No cars sold in Drennia this month." className="py-2" />
        ) : (
          <div className="flex flex-col gap-1.5 mt-2">
            {leaderboards.popularCars.map((car: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-zinc-900/50 p-2 border border-zinc-800 rounded">
                <div className="flex items-center gap-3">
                  <div className="text-[10px] text-zinc-500 font-mono w-4">#{idx + 1}</div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-zinc-200">{car.model_name}</span>
                    <span className="text-[10px] text-zinc-500">{car.company_name}</span>
                  </div>
                </div>
                <div className="text-[12px] text-terminal-amber font-mono">
                  {Number(car.total_sold).toLocaleString()} sold
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Global Leaderboards */}
      <Card kicker="Global Leaderboards" icon={TrendingUp}>
        <div className="flex gap-2 mb-3">
          <button 
            onClick={() => setLeaderboardTab('wealth')}
            className={\\\lex-1 py-1.5 text-[10px] uppercase font-mono border rounded \\\\\\}
          >
            Richest Players
          </button>
          <button 
            onClick={() => setLeaderboardTab('marketCap')}
            className={\\\lex-1 py-1.5 text-[10px] uppercase font-mono border rounded \\\\\\}
          >
            Highest Valued
          </button>
        </div>
        
        <div className="flex flex-col gap-1.5">
          {leaderboardTab === 'wealth' && (
            !leaderboards?.richestPlayers ? (
              <div className="text-zinc-500 text-[11px] py-4">Loading...</div>
            ) : leaderboards.richestPlayers.length === 0 ? (
              <EmptyState icon={User} message="No players found." className="py-2" />
            ) : (
              leaderboards.richestPlayers.map((player: any, idx: number) => (
                <div key={idx} className={\\\lex items-center justify-between p-2 border rounded \\\\\\}>
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] text-zinc-500 font-mono w-4">#{idx + 1}</div>
                    <span className={\\\	ext-[12px] font-bold \\\\\\}>{player.full_name}</span>
                  </div>
                  <div className="text-[12px] font-mono text-zinc-300">
                    {formatMoney(player.net_worth)}
                  </div>
                </div>
              ))
            )
          )}
          
          {leaderboardTab === 'marketCap' && (
            !leaderboards?.topCompanies ? (
              <div className="text-zinc-500 text-[11px] py-4">Loading...</div>
            ) : leaderboards.topCompanies.length === 0 ? (
              <EmptyState icon={Briefcase} message="No companies found." className="py-2" />
            ) : (
              leaderboards.topCompanies.map((comp: any, idx: number) => (
                <div key={idx} className={\\\lex items-center justify-between p-2 border rounded \\\\\\}>
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] text-zinc-500 font-mono w-4">#{idx + 1}</div>
                    <span className={\\\	ext-[12px] font-bold \\\\\\}>{comp.name}</span>
                  </div>
                  <div className="text-[12px] font-mono text-zinc-300">
                    {formatMoney(comp.company_value)}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </Card>
\;

let content = fs.readFileSync('src/app/drennia/chronicle/page.tsx', 'utf8');

// Insert formatMoney inside ChroniclePage component
content = content.replace('const radarData = [', 'const formatMoney = (value: any) => { if (!value) return \"\"; const num = Number(value); if (num >= 1e9) return \"$\" + (num / 1e9).toFixed(1) + \"B\"; if (num >= 1e6) return \"$\" + (num / 1e6).toFixed(1) + \"M\"; return \"$\" + num.toLocaleString(); };\\n  const radarData = [');

// Insert new cards right before <>... </>
content = content.replace('    </>\\n  );\\n\\n  return (', newCards + '\\n    </>\\n  );\\n\\n  return (');

fs.writeFileSync('src/app/drennia/chronicle/page.tsx', content);
