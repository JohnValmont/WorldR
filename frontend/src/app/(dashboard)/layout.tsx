'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { useNationStore } from '../../store/useNationStore';
import { nationApi, KELDORIA_ID } from '../../lib/api';
import Topbar from '../../components/layout/Topbar';

// Keldoria is the canonical Alpha v0.1 starter nation

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { setNation, setSectors, setLoading } = useNationStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (!user.is_verified) {
      router.push('/verify');
      return;
    }
    if (!user.display_name) {
      router.push('/onboarding/profile');
      return;
    }

    // Load nation state
    const nationId = user.nation_id || KELDORIA_ID;
    setLoading(true);
    nationApi.getState(nationId)
      .then(({ data }) => {
        setNation({
          id: data.nation.id,
          name: data.nation.name,
          treasury: Number(data.nation.treasury),
          debt: Number(data.nation.debt),
          gdp: Number(data.nation.gdp),
          inflationCpi: Number(data.nation.inflation_cpi),
          approval: Number(data.nation.approval),
          stability: Number(data.nation.stability),
          currentTick: Number(data.nation.current_tick),
          region: data.nation.region,
          continent: data.nation.continent,
        });
        setSectors(data.sectors || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  if (!isAuthenticated) return null;

  return (
    <div className="h-screen flex flex-col bg-black">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
