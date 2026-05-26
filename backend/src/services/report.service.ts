import { snapshotRepository } from '../repositories/snapshot.repository';
import { partyRepository } from '../repositories/party.repository';
import { nationRepository } from '../repositories/nation.repository';
import { NotFoundError } from '../utils/errors';

export interface MonthlyReport {
  tick: number;
  nationId: string;
  generatedAt: string;
  economy: {
    gdp: number;
    gdpPrev: number;
    gdpChange: number;
    gdpChangePercent: number;
    unemployment: number;
    unemploymentPrev: number;
    treasury: number;
    treasuryPrev: number;
    debt: number;
    revenue: number;
    spending: number;
    deficit: number;
  };
  prices: {
    cpi: number;
    cpiPrev: number;
    food: number;
    fuel: number;
    housing: number;
  };
  politics: {
    approval: number;
    approvalPrev: number;
    approvalChange: number;
    stability: number;
    stabilityPrev: number;
    governingParty: string | null;
    partyStandings: Array<{ name: string; abbreviation: string; color: string; seats: number; support: number }>;
  };
  alerts: Array<{ severity: 'info' | 'warning' | 'danger'; message: string }>;
  sectors: Array<{ name: string; output: number; growth: number }>;
}

export class ReportService {
  public async getLatestReport(nationId: string): Promise<MonthlyReport | null> {
    const nation = await nationRepository.findById(nationId);
    if (!nation) throw new NotFoundError('Nation not found');

    const snapshots = await snapshotRepository.findByNationId(nationId, 2);
    if (snapshots.length === 0) return null;

    return this.buildReport(nationId, snapshots[0], snapshots[1] || null);
  }

  public async getReportHistory(nationId: string, limit = 12): Promise<MonthlyReport[]> {
    const snapshots = await snapshotRepository.findByNationId(nationId, limit + 1);
    if (snapshots.length === 0) return [];

    const reports: MonthlyReport[] = [];
    for (let i = 0; i < Math.min(snapshots.length - 1, limit); i++) {
      const current = snapshots[i];
      const prev = snapshots[i + 1] || null;
      reports.push(await this.buildReport(nationId, current, prev));
    }

    return reports;
  }

  private async buildReport(
    nationId: string,
    current: any,
    prev: any | null
  ): Promise<MonthlyReport> {
    const parties = await partyRepository.findByNationId(nationId);
    const governingParty = parties.find(p => p.is_governing);

    const currentData = typeof current.snapshot_data === 'string'
      ? JSON.parse(current.snapshot_data)
      : current.snapshot_data;

    const prevData = prev
      ? (typeof prev.snapshot_data === 'string' ? JSON.parse(prev.snapshot_data) : prev.snapshot_data)
      : null;

    const gdp = Number(current.gdp);
    const gdpPrev = prev ? Number(prev.gdp) : gdp;
    const gdpChange = gdp - gdpPrev;
    const gdpChangePercent = gdpPrev > 0 ? (gdpChange / gdpPrev) * 100 : 0;

    const approval = Number(current.approval);
    const approvalPrev = prev ? Number(prev.approval) : approval;
    const approvalChange = approval - approvalPrev;

    const stability = Number(current.stability);
    const stabilityPrev = prev ? Number(prev.stability) : stability;

    const treasury = Number(current.treasury);
    const treasuryPrev = prev ? Number(prev.treasury) : treasury;
    const revenue = Number(current.revenue);
    const spending = Number(current.spending);
    const deficit = spending - revenue;

    const unemployment = Number(current.unemployment_rate);
    const unemploymentPrev = prev ? Number(prev.unemployment_rate) : unemployment;

    const alerts: MonthlyReport['alerts'] = [];

    if (gdpChangePercent < -2) alerts.push({ severity: 'danger', message: `GDP contracted sharply by ${Math.abs(gdpChangePercent).toFixed(1)}%` });
    else if (gdpChangePercent < 0) alerts.push({ severity: 'warning', message: `GDP declined ${Math.abs(gdpChangePercent).toFixed(1)}%` });
    else if (gdpChangePercent > 3) alerts.push({ severity: 'info', message: `Strong GDP growth of +${gdpChangePercent.toFixed(1)}%` });

    if (Number(current.inflation_cpi) > 0.06) alerts.push({ severity: 'danger', message: `High inflation: CPI at ${(Number(current.inflation_cpi) * 100).toFixed(1)}%` });
    else if (Number(current.inflation_cpi) > 0.04) alerts.push({ severity: 'warning', message: `Elevated inflation: CPI at ${(Number(current.inflation_cpi) * 100).toFixed(1)}%` });

    if (unemployment > 0.12) alerts.push({ severity: 'danger', message: `Unemployment at critical ${(unemployment * 100).toFixed(1)}%` });
    else if (unemployment > 0.08) alerts.push({ severity: 'warning', message: `Unemployment elevated at ${(unemployment * 100).toFixed(1)}%` });

    if (approvalChange < -0.05) alerts.push({ severity: 'danger', message: `Approval dropped sharply by ${(Math.abs(approvalChange) * 100).toFixed(1)}pp` });
    else if (approvalChange < -0.02) alerts.push({ severity: 'warning', message: `Approval fell by ${(Math.abs(approvalChange) * 100).toFixed(1)}pp` });

    if (deficit > 50000000) alerts.push({ severity: 'warning', message: `Budget deficit of $${(deficit / 1e6).toFixed(0)}M this month` });

    const sectors = currentData?.sectors?.map((s: any) => ({
      name: s.name,
      output: Number(s.output),
      growth: s.growth ? Number(s.growth) : 0
    })) || [];

    const partyStandings = parties.map(p => ({
      name: p.name,
      abbreviation: p.abbreviation,
      color: p.color,
      seats: p.seats,
      support: Number(p.support_share)
    }));

    return {
      tick: Number(current.tick),
      nationId,
      generatedAt: new Date(current.created_at).toISOString(),
      economy: {
        gdp, gdpPrev, gdpChange, gdpChangePercent: Number(gdpChangePercent.toFixed(2)),
        unemployment, unemploymentPrev,
        treasury, treasuryPrev, debt: Number(current.debt), revenue, spending, deficit
      },
      prices: {
        cpi: Number(current.inflation_cpi),
        cpiPrev: prev ? Number(prev.inflation_cpi) : Number(current.inflation_cpi),
        food: Number(current.inflation_food),
        fuel: Number(current.inflation_fuel),
        housing: Number(current.inflation_housing)
      },
      politics: {
        approval, approvalPrev, approvalChange: Number(approvalChange.toFixed(4)),
        stability, stabilityPrev,
        governingParty: governingParty?.name || null,
        partyStandings
      },
      alerts,
      sectors
    };
  }
}

export const reportService = new ReportService();
