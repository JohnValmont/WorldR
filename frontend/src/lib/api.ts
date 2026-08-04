import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  // If no explicit URL is set, use the relative path so Next.js rewrites proxy it correctly
  if (!envUrl || envUrl.trim() === '') return '/api/v1';
  return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/$/, '')}/api/v1`;
};
const API_BASE = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});

// ── Token storage helpers ──────────────────────────────────────────────────
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('worldr_access_token');
}
export function setAccessToken(token: string): void {
  localStorage.setItem('worldr_access_token', token);
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('worldr_refresh_token');
}
export function setRefreshToken(token: string): void {
  localStorage.setItem('worldr_refresh_token', token);
}
export function clearTokens(): void {
  localStorage.removeItem('worldr_access_token');
  localStorage.removeItem('worldr_refresh_token');
}

// ── Request interceptor: inject Bearer token ─────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ─────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(p => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = '/landing/onboarding.html?action=login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        setAccessToken(data.accessToken);
        
        if (typeof window !== 'undefined') {
          const zustandStr = localStorage.getItem('worldr-auth');
          if (zustandStr) {
            try {
              const authStore = JSON.parse(zustandStr);
              if (authStore.state) {
                authStore.state.accessToken = data.accessToken;
                localStorage.setItem('worldr-auth', JSON.stringify(authStore));
              }
            } catch (e) {}
          }
        }
        
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/landing/onboarding.html?action=login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Typed API methods ─────────────────────────────────────────────────────

// Auth Only
export const authApi = {
  register: (data: { email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  guestLogin: () => api.post('/auth/guest-login'),
  verifyEmail: (email: string, otp: string) =>
    api.post('/auth/verify-email', { email, otp }),
  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),
  me: () => api.get('/auth/me'),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) =>
    api.post('/auth/reset-password', data)
};

// Characters
export const characterApi = {
  getMe: () => api.get('/characters/me'),
  deleteMe: () => api.delete('/characters/me'),
  create: (data: { name: string; motherland_country_id: string; home_state_id?: string; currency_id: string }) =>
    api.post('/characters', data),
  recalculateNetWorth: () => api.post('/characters/me/recalculate-net-worth')
};

// Companies
export const companyApi = {
  getMy: () => api.get('/companies/my'),
  getById: (id: string) => api.get(`/companies/${id}`),
  create: (data: { name: string; country_id: string; headquarters_state_id: string; industry_id: string; subsector_id?: string | null; legal_structure_id: string; currency_id: string; starting_capital: number }) =>
    api.post('/companies', data),
  injectCapital: (id: string, amount: number) =>
    api.post(`/companies/${id}/inject-capital`, { amount }),
  issueShares: (id: string, sharesToIssue: number, pricePerShare: number) =>
    api.post(`/companies/${id}/issue-shares`, { sharesToIssue, pricePerShare }),
  withdrawCapital: (id: string, amount: number) =>
    api.post(`/companies/${id}/withdraw-capital`, { amount }),
  updateFinances: (id: string, data: any) =>
    api.patch(`/companies/${id}/finances`, data),
  // Legal structures
  getStructures: () => api.get('/companies/structures').then(res => res.data),
  convertStructure: (id: string, legalStructureId: string) =>
    api.post(`/companies/${id}/convert-structure`, { legal_structure_id: legalStructureId }).then(res => res.data),
  setDividendPolicy: (id: string, payoutPercent: number) =>
    api.put(`/companies/${id}/dividend-policy`, { payout_percent: payoutPercent }).then(res => res.data),
  getCapTable: (id: string) => api.get(`/companies/${id}/cap-table`).then(res => res.data),
  declareBankruptcy: (id: string) => api.post(`/companies/${id}/declare-bankruptcy`).then(res => res.data)
};

// Exchange — player-only share market (public corporations)
export const exchangeApi = {
  getListings: () => api.get('/exchange/listings').then(res => res.data),
  getOrderBook: (companyId: string) => api.get(`/exchange/${companyId}/book`).then(res => res.data),
  getTrades: (companyId: string) => api.get(`/exchange/${companyId}/trades`).then(res => res.data),
  placeOrder: (companyId: string, data: { side: 'buy' | 'sell'; price: number; quantity: number; purchaserCompanyId?: string }) =>
    api.post(`/exchange/${companyId}/orders`, data).then(res => res.data),
  cancelOrder: (orderId: string) => api.delete(`/exchange/orders/${orderId}`).then(res => res.data),
  getMyOrders: () => api.get('/exchange/my-orders').then(res => res.data),
  getMyPortfolio: () => api.get('/exchange/portfolio').then(res => res.data),
  getPriceHistory: (companyId: string) => api.get(`/exchange/${companyId}/history`).then(res => res.data),

  // ── DRX index + quote detail (OHLC / earnings) ──
  getDrxIndex: () => api.get('/exchange/drx-index').then(res => res.data),
  getCompanyDetail: (companyId: string) => api.get(`/exchange/company/${companyId}`).then(res => res.data),
  getOhlc: (companyId: string, months = 24) => api.get(`/exchange/company/${companyId}/ohlc?months=${months}`).then(res => res.data),
  getEarnings: (companyId: string, months = 12) => api.get(`/exchange/company/${companyId}/earnings?months=${months}`).then(res => res.data),

  // ── IPO pipeline + book-building ──
  getPipeline: () => api.get('/exchange/ipo/pipeline').then(res => res.data),
  getEligibility: (companyId: string) => api.get(`/exchange/ipo/${companyId}/eligibility`).then(res => res.data),
  getCompanyIpo: (companyId: string) => api.get(`/exchange/ipo/${companyId}`).then(res => res.data),
  fileIpo: (companyId: string, data: { priceMin: number; priceMax: number; floatPercent: number; useOfProceeds: string; lockupMonths: number }) =>
    api.post(`/exchange/ipo/${companyId}/file`, data).then(res => res.data),
  withdrawIpo: (companyId: string) => api.post(`/exchange/ipo/${companyId}/withdraw`).then(res => res.data),
  submitIoi: (ipoId: string, data: { pricePerShare: number; quantity: number; biddingCompanyId?: string }) =>
    api.post(`/exchange/ipo/${ipoId}/ioi`, data).then(res => res.data),
  cancelIoi: (ioiId: string) => api.delete(`/exchange/ipo/ioi/${ioiId}`).then(res => res.data),

  // ── Quick IPO (simple sell-block listing, alternative to formal IPO filing) ──
  ipoLaunch: (companyId: string, data: { price_per_share: number; quantity: number }) =>
    api.post(`/exchange/${companyId}/ipo`, data).then(res => res.data),

  // ── Distressed Asset Market ──
  getDistressed: () => api.get('/exchange/distressed').then(res => res.data),
  acquireDistressed: (companyId: string, acquiringCompanyId?: string) =>
    api.post(`/exchange/distressed/${companyId}/acquire`, { acquiringCompanyId }).then(res => res.data),

  // ── Acquisition Auctions ──
  getAuctions: () => api.get('/exchange/acquisitions').then(res => res.data),
  getMyBids: () => api.get('/exchange/acquisitions/my-bids').then(res => res.data),
  placeBid: (auctionId: string, amount: number, fundingSources?: any, postAcquisitionStatus?: string) =>
    api.post(`/exchange/acquisitions/${auctionId}/bid`, { amount, fundingSources, postAcquisitionStatus }).then(res => res.data),
  };

// Investments — P2P loans and private equity placements
export const investmentsApi = {
  // Loans
  getLoanOffers: () => api.get('/investments/loan-offers').then(res => res.data),
  createLoanOffer: (data: { max_amount: number; monthly_interest_rate: number; term_months: number; purpose?: string; target_character_id?: string }) =>
    api.post('/investments/loan-offers', data).then(res => res.data),
  cancelLoanOffer: (id: string) => api.delete(`/investments/loan-offers/${id}`).then(res => res.data),
  acceptLoanOffer: (id: string, amount: number) =>
    api.post(`/investments/loan-offers/${id}/accept`, { amount }).then(res => res.data),
  getMyLoans: () => api.get('/investments/my-loans').then(res => res.data),
  repayLoanEarly: (id: string) => api.post(`/investments/loans/${id}/repay`).then(res => res.data),
  // Private equity placements
  getPlacements: () => api.get('/investments/placements').then(res => res.data),
  createPlacement: (p: { company_id: string; shares: number; min_purchase_shares?: number; price_per_share: number; target_character_id?: string }) => api.post('/investments/placements', p).then(res => res.data),
  cancelPlacement: (id: string) => api.delete(`/investments/placements/${id}`).then(res => res.data),
  acceptPlacement: (id: string, shares?: number) => api.post(`/investments/placements/${id}/accept`, { shares }).then(res => res.data),
  getMyPlacements: () => api.get('/investments/my-placements').then(res => res.data)
  };

// Registry
export const registryApi = {
  getCompanies: () => api.get(`/registry/companies?t=${Date.now()}`),
  getCompany: (id: string) => api.get(`/registry/companies/${id}?t=${Date.now()}`)
};

// Politics
export const politicsApi = {
  getState: () => api.get(`/politics/state?t=${Date.now()}`).then(res => res.data),
  getCycle: (stateId?: string) => api.get(`/politics/cycle${stateId ? `?stateId=${stateId}&t=${Date.now()}` : `?t=${Date.now()}`}`).then(res => res.data),
  getParties: (stateId?: string) => api.get(`/politics/parties${stateId ? `?stateId=${stateId}&t=${Date.now()}` : `?t=${Date.now()}`}`).then(res => res.data),
  foundParty: (payload: { name: string; abbreviation: string; doctrine_id: string; tenet_id: string | null; slogan?: string; colorHex?: string; crisis?: string; ideologyAxes?: any; policies?: any; founders?: string[] }, stateId?: string) =>
    api.post('/politics/parties', { ...payload, stateId }).then(res => res.data),
  joinParty: (id: string) => api.post(`/politics/parties/${id}/join`).then(res => res.data),
  leaveParty: (id: string) => api.post(`/politics/parties/${id}/leave`).then(res => res.data),
  dissolveParty: (id: string) => api.post(`/politics/parties/${id}/dissolve`).then(res => res.data),
  transferLeadership: (id: string, targetCharacterId: string) => api.post(`/politics/parties/${id}/transfer`, { targetCharacterId }).then(res => res.data),
  updatePlatform: (id: string, platform: any) => api.put(`/politics/parties/${id}/platform`, { platform }).then(res => res.data),
  declareCandidacy: (constituencyId: string, stateId?: string) => api.post('/politics/candidacy', { constituencyId, stateId }).then(res => res.data),
  getConstituencies: (stateId?: string) => api.get(`/politics/constituencies${stateId ? `?stateId=${stateId}` : ''}`).then(res => res.data),
  setDoctrine: (id: string, doctrine_id: string, tenet_id: string | null, platform: any) => api.patch(`/politics/parties/${id}/doctrine`, { doctrine_id, tenet_id, platform }).then(res => res.data),
  setTenet: (id: string, tenet_id: string | null) => api.patch(`/politics/parties/${id}/tenet`, { tenet_id }).then(res => res.data),
  queueCampaignAction: (data: any, stateId?: string) => api.post('/politics/campaign/actions', { ...data, stateId }).then(res => res.data),
  getPolls: (stateId?: string) => api.get(`/politics/polls${stateId ? `?stateId=${stateId}` : ''}`).then(res => res.data),
  getCouncil: (stateId?: string) => api.get(`/politics/council${stateId ? `?stateId=${stateId}` : ''}`).then(res => res.data),
  getLedger: (limit: number = 10, stateId?: string, global?: boolean) => api.get(`/politics/ledger?limit=${limit}${stateId ? `&stateId=${stateId}` : ''}${global ? '&global=true' : ''}`).then(res => res.data),
  getFormingCoalition: (stateId?: string) => api.get(`/politics/formation/coalition${stateId ? `?stateId=${stateId}` : ''}`).then(res => res.data),
  manageCoalition: (action: string, targetPartyId: string, stateId?: string) => api.post(`/politics/formation/coalition${stateId ? `?stateId=${stateId}` : ''}`, { action, targetPartyId }).then(res => res.data),

  // Phase 5A: Bills & Lobby
  getBills: (stateId?: string) => api.get(`/politics/bills${stateId ? `?stateId=${stateId}` : ''}`).then(res => res.data),
  proposeBill: (type: string, params: any, stateId?: string) => api.post(`/politics/bills${stateId ? `?stateId=${stateId}` : ''}`, { type, params }).then(res => res.data),
  voteBill: (id: string, vote: string) => api.post(`/politics/bills/${id}/vote`, { vote }).then(res => res.data),
  donateToParty: (partyId: string, amount: number) => api.post('/politics/lobby/donate', { partyId, amount }).then(res => res.data),
  petitionParty: (data: { partyId: string, companyId: string, policyCategory: string, desiredOption: string, offeredFunds: number }) => api.post('/politics/lobby/petition', data).then(res => res.data),
  respondToPetition: (id: string, action: 'accept' | 'reject') => api.post(`/politics/lobby/petitions/${id}/respond`, { action }).then(res => res.data),
  getMyPetitions: () => api.get('/politics/lobby/petitions').then(res => res.data),

  // Phase 5B: Tenders
  getTenders: (stateId?: string) => api.get(`/politics/tenders${stateId ? `?stateId=${stateId}` : ''}`).then(res => res.data),
  postTender: (data: any, stateId?: string) => api.post('/politics/tenders', { ...data, stateId }).then(res => res.data),
  bidTender: (id: string, data: any) => api.post(`/politics/tenders/${id}/bid`, data).then(res => res.data),

  // AP System
  getMyAp: (): Promise<{ current_ap: number; ap_cap: number }> =>
    api.get(`/politics/ap?t=${Date.now()}`).then(res => res.data),
  doGeneralAction: (type: string, params?: any, stateId?: string) =>
    api.post('/politics/general-action', { type, params, stateId }).then(res => res.data),
  recruitNpc: (stateId?: string) =>
    api.post('/politics/recruit', { stateId }).then(res => res.data),

  // Political Capital System
  getMyPc: (): Promise<{ current_pc: number; pc_cap: number }> =>
    api.get(`/politics/pc?t=${Date.now()}`).then(res => res.data),
  spendPc: (action: string, factionId?: string) =>
    api.post('/politics/pc/spend', { action, faction_id: factionId }).then(res => res.data),

  // Faction System
  getPartyFactions: (partyId: string): Promise<{ party_id: string; cohesion: number; factions: any[] }> =>
    api.get(`/politics/parties/${partyId}/factions?t=${Date.now()}`).then(res => res.data),

  // Coalition Agreement
  getCoalitionAgreement: (stateId?: string): Promise<{ coalition: any; agreement: any; partners?: any[] }> =>
    api.get(`/politics/coalition/agreement${stateId ? `?stateId=${stateId}` : ''}`).then(res => res.data),

  // Scandal System
  getMyScandals: (): Promise<{ scandals: any[] }> =>
    api.get(`/politics/scandals?t=${Date.now()}`).then(res => res.data),
  actOnScandal: (scandalId: string, intervention: string) =>
    api.post(`/politics/scandals/${scandalId}/intervene`, { intervention }).then(res => res.data),

  // Campaign Command Object (Phase 5)
  getMyCampaign: (): Promise<{ campaign: any; cycle: any }> =>
    api.get(`/politics/campaign?t=${Date.now()}`).then(res => res.data),
  setCampaignStrategy: (strategy: string) =>
    api.post('/politics/campaign/strategy', { strategy }).then(res => res.data),
  allocateCampaignBudget: (amount: number) =>
    api.post('/politics/campaign/budget', { amount }).then(res => res.data),

  // Interest Groups (Phase 6)
  getMyInterestGroups: (): Promise<{ groups: any[] }> =>
    api.get(`/politics/interest-groups?t=${Date.now()}`).then(res => res.data),
  doOutreach: (groupId: string, commitment?: { axis: string; direction: 'raise' | 'lower'; target_value: number }) =>
    api.post(`/politics/interest-groups/${groupId}/outreach`, { commitment }).then(res => res.data),
  doRallySupport: (groupId: string) =>
    api.post(`/politics/interest-groups/${groupId}/rally`).then(res => res.data),

  // Media Ecosystem (Phase 7)
  getMyMedia: (): Promise<{ outlets: any[] }> =>
    api.get(`/politics/media?t=${Date.now()}`).then(res => res.data),
  getNewsFeed: (): Promise<{ stories: any[] }> =>
    api.get(`/politics/news?t=${Date.now()}`).then(res => res.data),
  doExclusive: (outletId: string) =>
    api.post(`/politics/media/${outletId}/exclusive`).then(res => res.data),
  doPressConference: () =>
    api.post('/politics/media/press-conference').then(res => res.data),
  doExclusiveInterview: () =>
    api.post('/politics/media/exclusive-interview').then(res => res.data),


  // Legacy System (Phase 8)
  getLegacy: (characterId: string = 'me') =>
    api.get(`/politics/legacy/${characterId}?t=${Date.now()}`).then(res => res.data),
};




// Logistics
export const logisticsApi = {
  getProcurement: () => api.get('/logistics/procurement'),
  getCompanyLogistics: (companyId: string) => api.get(`/logistics/company/${companyId}?t=${Date.now()}`),
  hireStaff: (companyId: string, role: string) => api.post(`/logistics/company/${companyId}/staff/hire`, { role }),
  fireStaff: (companyId: string, role: string) => api.post(`/logistics/company/${companyId}/staff/fire`, { role }),
  purchaseVehicle: (companyId: string, catalogVehicleId: string) => api.post(`/logistics/company/${companyId}/vehicles/purchase`, { catalogVehicleId }),
  performMaintenance: (companyId: string, vehicleId: string, level: 'basic'|'full') => api.post(`/logistics/company/${companyId}/vehicles/${vehicleId}/maintenance`, { level }),
  leaseFacility: (companyId: string, catalogFacilityId: string, stateId?: string) => api.post(`/logistics/company/${companyId}/facilities/lease`, { catalogFacilityId, stateId }),
  assignOperation: (companyId: string, vehicleId: string, poolId: string) => api.post(`/logistics/company/${companyId}/operations/assign`, { vehicleId, poolId }),
  processTest: (companyId: string) => api.post(`/logistics/company/${companyId}/operations/process-test`),
  assignVehicleToContract: (companyId: string, contractId: string, vehicleId: string) => api.post(`/logistics/company/${companyId}/contracts/${contractId}/assign`, { vehicleId }),
  acceptDirectContract: (companyId: string, contractId: string, contract: any, vehicleId: string) => api.post(`/logistics/company/${companyId}/contracts/${contractId}/accept`, { contract, vehicleId }),
  resolveContract: (companyId: string, contractId: string, result: 'completed'|'failed') => api.post(`/logistics/company/${companyId}/contracts/${contractId}/resolve`, { result })
};

// Manufacturing
export const manufacturingApi = {
  getBootstrap: () => api.get('/manufacturing/bootstrap'),
  getCompanyData: (companyId: string) => api.get(`/companies/${companyId}/manufacturing/data?t=${Date.now()}`),
  procureComponents: (companyId: string, data: { component_id: string, units: number }) => api.post(`/companies/${companyId}/manufacturing/components/procure`, data),
  purchaseLicense: (companyId: string, data: { targetStateId: string }) => api.post(`/companies/${companyId}/manufacturing/licenses`, data),
  purchaseLand: (companyId: string, data: { stateId: string; acres: number; name: string }) => api.post(`/companies/${companyId}/manufacturing/land`, data),
  sellLand: (companyId: string, landPlotId: string) => api.delete(`/companies/${companyId}/manufacturing/land/${landPlotId}`),
  constructFactory: (companyId: string, data: { landPlotId: string; factoryTypeId: string; name: string }) => api.post(`/companies/${companyId}/manufacturing/factories/construct`, data),
  scrapFactory: (companyId: string, factoryId: string) => api.delete(`/companies/${companyId}/manufacturing/factories/${factoryId}`),
  constructProductionLine: (companyId: string, factoryId: string) => api.post(`/companies/${companyId}/manufacturing/factories/${factoryId}/production-lines/construct`),
  scrapProductionLine: (companyId: string, lineId: string) => api.delete(`/companies/${companyId}/manufacturing/production/lines/${lineId}`),
  createModel: (companyId: string, data: any) => api.post(`/companies/${companyId}/manufacturing/models`, data),
  createFacelift: (companyId: string, modelId: string, data: any) => api.post(`/companies/${companyId}/manufacturing/models/${modelId}/facelift`, data),
  discontinueModel: (companyId: string, modelId: string) => api.post(`/companies/${companyId}/manufacturing/models/${modelId}/discontinue`),
  getModelSnapshots: (companyId: string) => api.get(`/companies/${companyId}/manufacturing/models/snapshots?t=${Date.now()}`),
  launchModel: (companyId: string, modelId: string) => api.post(`/companies/${companyId}/manufacturing/models/${modelId}/launch`),
  updateModelPrice: (companyId: string, modelId: string, salePrice: number) => api.patch(`/companies/${companyId}/manufacturing/models/${modelId}/price`, { salePrice }),
  saveProductionPlan: (companyId: string, data: { lineId: string, modelId: string | null, qualitySetting: string, targetUnitsPerArc: number }) => api.post(`/companies/${companyId}/manufacturing/production/save-plan`, data),
  pauseProductionLine: (companyId: string, lineId: string) => api.patch(`/companies/${companyId}/manufacturing/production/lines/${lineId}/pause`),
  resumeProductionLine: (companyId: string, lineId: string) => api.patch(`/companies/${companyId}/manufacturing/production/lines/${lineId}/resume`),
  hireStaff: (companyId: string, role: string, quantity: number = 1) => api.post(`/companies/${companyId}/manufacturing/staff/hire`, { role, quantity }),
  fireStaff: (companyId: string, role: string, quantity: number = 1) => api.post(`/companies/${companyId}/manufacturing/staff/fire`, { role, quantity }),
  startEngineeringProgramme: (companyId: string, programmeId: string) => api.post(`/companies/${companyId}/manufacturing/programmes/start`, { programmeId }),
  startFactoryExpansion: (companyId: string, factoryId: string) => api.post(`/companies/${companyId}/manufacturing/factories/${factoryId}/expand`),
  recoverFactoryCondition: (companyId: string, factoryId: string) => api.post(`/companies/${companyId}/manufacturing/factories/${factoryId}/recover-condition`),
  toggleFactoryAutoRecovery: (companyId: string, factoryId: string) => api.post(`/companies/${companyId}/manufacturing/factories/${factoryId}/toggle-auto-recovery`),
  processArcAdmin: (companyId: string) => api.post(`/admin/manufacturing/process-company/${companyId}`),
  // Market & Sales
  getMarkets: (companyId: string) => api.get(`/companies/${companyId}/manufacturing/markets?t=${Date.now()}`),
  setAllocation: (companyId: string, data: { vehicleModelId: string, regionMarketId: string, unitsAllocated: number, marketingTier?: string }) => api.post(`/companies/${companyId}/manufacturing/markets/allocate`, data),
  removeAllocation: (companyId: string, allocId: string) => api.delete(`/companies/${companyId}/manufacturing/markets/allocations/${allocId}`),
  setMarketingTier: (companyId: string, marketId: string, data: { vehicleModelId: string, marketingTier: string }) => api.patch(`/companies/${companyId}/manufacturing/markets/${marketId}/marketing`, data),
  // Phase 3: Engineering Report & Knowledge
  getEngineeringReport: (companyId: string, modelId: string) => api.get(`/companies/${companyId}/manufacturing/models/${modelId}/engineering-report`),
  getCompanyKnowledge: (companyId: string) => api.get(`/companies/${companyId}/manufacturing/knowledge`),
  triggerCSOAllocation: (companyId: string) => api.post(`/companies/${companyId}/manufacturing/cso/allocate`),
  triggerCMOOptimization: (companyId: string) => api.post(`/companies/${companyId}/manufacturing/cmo/optimize`),
};

// Chat — global in-game chat
export interface ChatMessage {
  id: number;
  character_id: string;
  character_name: string;
  target_character_id?: string;
  target_character_name?: string;
  channel: string;
  body: string;
  created_at: string;
}

export const chatApi = {
  getMessages: (channel: string = 'world', after?: number): Promise<{ messages: ChatMessage[] }> =>
    api.get(`/chat/messages?channel=${channel}${after ? `&after=${after}` : ''}`).then(res => res.data),
  sendMessage: (body: string, channel: string = 'world', target_character_id?: string): Promise<{ message: ChatMessage }> =>
    api.post('/chat/messages', { body, channel, target_character_id }).then(res => res.data)
};

// World — public world feed
export interface WorldClock {
  world_instance_id: string;
  current_year: number;
  current_month: number;
  current_day: number;
  real_seconds_per_month: number;
  month_started_at: string | null;
  next_arc_close_at: string | null;
  pol_current_year?: number;
  pol_current_month?: number;
  pol_real_seconds_per_month?: number;
  pol_month_started_at?: string | null;
  pol_next_arc_close_at?: string | null;
  status: 'active' | 'paused';
  updated_at: string;
  server_time?: string;
}

export const worldApi = {
  getClock: (): Promise<WorldClock> => api.get('/world/clock').then(res => res.data),
  getOperators: () => api.get('/world/operators').then(res => res.data),
  getMarketLeaderboard: () => api.get('/world/market-leaderboard').then(res => res.data),
  getGlobalLeaderboards: () => api.get('/world/global-leaderboards').then(res => res.data),
  // Admin tick controls
  forceTick: () => api.post('/world/tick').then(res => res.data),
  forcePoliticsTick: () => api.post('/world/politics-tick').then(res => res.data),
  pauseClock: () => api.post('/world/clock/pause').then(res => res.data),
  resumeClock: () => api.post('/world/clock/resume').then(res => res.data),
  setClockSpeed: (secondsPerMonth: number) => api.patch('/world/clock/speed', { seconds_per_month: secondsPerMonth }).then(res => res.data),
};

