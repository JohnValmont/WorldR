import fs from 'fs';

const p = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let c = fs.readFileSync(p, 'utf-8');

const target1 = `  useEffect(() => {
    if (deskTab === 'design' || deskTab === 'production' || deskTab === 'factory') {
      loadBootstrap();
    }
    if (deskTab === 'market' || deskTab === 'sales') {
      loadMarketData();
    }
  }, [deskTab, loadBootstrap, loadMarketData]);`;

const replacement1 = `  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await worldApi.getMarketLeaderboard();
      setLeaderboardData(res);
      if (res.segments && res.segments.length > 0 && !selectedLeaderboardRegion) {
        setSelectedLeaderboardRegion(res.segments[0].segmentId);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedLeaderboardRegion]);

  useEffect(() => {
    if (deskTab === 'design' || deskTab === 'production' || deskTab === 'factory') {
      loadBootstrap();
    }
    if (deskTab === 'market' || deskTab === 'sales') {
      loadMarketData();
    }
    if (deskTab === 'sales') {
      loadLeaderboard();
    }
  }, [deskTab, loadBootstrap, loadMarketData, loadLeaderboard]);`;

if (c.includes(target1)) {
  c = c.replace(target1, replacement1);
  fs.writeFileSync(p, c, 'utf-8');
  console.log("Success");
} else {
  console.log("Target not found");
}
