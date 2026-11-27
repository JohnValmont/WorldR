'use client';
import React, { useState, useEffect } from 'react';
import { Landmark, ShieldCheck, TrendingUp, Wallet, Activity, ChevronLeft, Target, Building2, User, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';
import LoanSchedule, { BankLoan } from './LoanSchedule';

const COLORS = ['#4B6382', '#E8B84B', '#4FB286', '#8F3D3D', '#D9625A', '#868994'];

export default function BankPortal({ bank, company, playerCash, personalDossier, corporateDossier, institutionData, loadError, loans, loansError, onBack, getRatingColor, onTakeLoan, isSubmitting: parentIsSubmitting, myCompanies, onSelectCompany }: any) {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'apply' | 'debt'>('portfolio');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [loanTenor, setLoanTenor] = useState<number>(36);
  const [loanPurpose, setLoanPurpose] = useState<string>('expansion');
  const [amortizationType, setAmortizationType] = useState<string>('amortizing');
  
  const [isUnderwriting, setIsUnderwriting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [underwritingResult, setUnderwritingResult] = useState<any>(null);

  // Hardcode base rate for now, fallback to generic if undefined
  const baseRate = institutionData?.baseLendingRate || 0.05;

  const handleFacilitySelect = (type: string, defaultAmount: number) => {
    setSelectedFacility(type);
    setLoanAmount(defaultAmount);
    setWizardStep(2);
  };

  const handleSimulateUnderwriting = () => {
    setIsUnderwriting(true);
    setWizardStep(3);
    
    // Simulate AI Underwriting Delay (3 seconds)
    setTimeout(() => {
      setIsUnderwriting(false);
      // Construct a mock matrix response based on their real dossier
      const dossier = corporateDossier;
      if (!dossier) return;

      const ltvScore = dossier.metrics.ltv < 0.5 ? 95 : dossier.metrics.ltv < 0.85 ? 85 : dossier.metrics.ltv < 1.0 ? 70 : 40;
      const dscrScore = dossier.metrics.dscr > 2.0 ? 90 : dossier.metrics.dscr > 1.25 ? 75 : 50;
      const liqScore = dossier.metrics.capacity > loanAmount ? 90 : 60;
      
      const overall = (ltvScore * 0.3) + (dscrScore * 0.25) + (liqScore * 0.2) + (88 * 0.15) + (80 * 0.10);
      
      let status = 'APPROVED';
      let premium = overall > 85 ? 0.005 : overall > 70 ? 0.015 : 0.03; 
      
      if (ltvScore < 50 || dscrScore < 50) {
        status = 'DENIED';
      }

      setUnderwritingResult({
        matrix: [
          { criteria: 'Asset Coverage (LTV)', data: `${(dossier.metrics.ltv * 100).toFixed(1)}%`, score: ltvScore, weight: '30%', total: (ltvScore * 0.3).toFixed(1), tip: 'Loan-to-Value. Lower is better. Max 100%.' },
          { criteria: 'Debt Service (DSCR)', data: `${(dossier.metrics.dscr).toFixed(2)}x`, score: dscrScore, weight: '25%', total: (dscrScore * 0.25).toFixed(1), tip: 'Debt Service Coverage Ratio. Must be > 1.0x.' },
          { criteria: 'Portfolio Liquidity', data: `$${(dossier.metrics.capacity/1000000).toFixed(1)}M`, score: liqScore, weight: '20%', total: (liqScore * 0.2).toFixed(1), tip: 'Current cash versus requested loan amount.' },
          { criteria: 'Op. Margin Trend', data: '+4.2% YoY', score: 88, weight: '15%', total: (88 * 0.15).toFixed(1), tip: 'Historical operating margin stability.' },
          { criteria: 'Industry Risk', data: `${dossier.metrics.conditions} (Stable)`, score: 80, weight: '10%', total: (80 * 0.10).toFixed(1), tip: 'Macroeconomic sector risk.' }
        ],
        overall: overall.toFixed(1),
        status,
        premium
      });
    }, 3000);
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/banks/loan/${company.id}/take`, { 
        facilityType: selectedFacility, 
        principalAmount: loanAmount,
        term: loanTenor,
        amortizationType,
        purpose: loanPurpose
      });
      alert(`Loan Secured! Monthly Payment: $${res.data.monthlyPayment}`);
      onBack(); // Refresh by going back
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
      setIsSubmitting(false);
    }
  };

  const renderPortfolioSnapshot = () => {
    if (!company) {
      return (
        <div className="w-full bg-[#13161E] border border-zinc-800 rounded-lg p-10 flex flex-col items-center justify-center min-h-[300px]">
          <ShieldCheck size={48} className="text-zinc-600 mb-4" />
          <h2 className="text-xl font-serif text-zinc-100 mb-2">No Corporate Profile Found</h2>
          <p className="text-zinc-500 text-center max-w-md">You must own an active company to access the Corporate Treasury Portal.</p>
        </div>
      );
    }

    const d = corporateDossier?.metrics;
    if (!d) return <div>Loading portfolio...</div>;

    const actualCash = Math.max(0, d.capacity);
    const actualFixedAssets = Math.max(0, d.totalAssets - d.capacity);
    const totalDisplayAssets = actualCash + actualFixedAssets || 1;

    const pieData = [
      { name: 'Operating Cash', value: actualCash },
      { name: 'Fixed Assets', value: actualFixedAssets }
    ].filter(v => v.value > 0);

    return (
      <div className="w-full animate-slide-in space-y-6">
        <div className="bg-[#13161E] border border-zinc-800 rounded-lg overflow-hidden">
          <div className="border-b border-zinc-800 p-4 bg-[#1B1F29] flex items-center justify-between">
            <h3 className=" text-xs uppercase tracking-widest text-[#E8B84B]">Your Corporate Relationship</h3>
            <span className="text-[10px] text-zinc-500">Since: Y4 | Manager: Elena Voss</span>
          </div>
          <div className="p-6 grid grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 mb-1">TOTAL FACILITIES</div>
              <div className="text-xl font-serif font-bold text-zinc-100">${(d.totalLiabilities || 0).toLocaleString('en-US')}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-500 mb-1">ASSETS (COLLATERAL)</div>
              <div className="text-xl font-serif font-bold text-[#4FB286]">${(d.totalAssets || 0).toLocaleString('en-US')}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-500 mb-1">EQUITY (BOOK VALUE)</div>
              <div className="text-xl font-serif font-bold text-zinc-100">${(d.equity || 0).toLocaleString('en-US')}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-500 mb-1">CASH FLOW (TTM)</div>
              <div className="text-xl font-serif font-bold text-zinc-100">+${(d.mockNetIncome || 0).toLocaleString('en-US')}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#13161E] border border-zinc-800 rounded-lg p-6">
            <h4 className=" text-xs uppercase tracking-widest text-zinc-400 mb-4 border-b border-zinc-800 pb-2">Asset Diversification</h4>
            <div className="flex items-center h-40">
              <div className="w-1/2 h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1E1B14', border: '1px solid #262B36', fontSize: '11px', color: '#ECEAE4' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center text-xs font-mono">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-zinc-400">{entry.name}</span>
                    </span>
                    <span className="text-zinc-200">{Math.round((entry.value / totalDisplayAssets) * 100)}%</span>
                  </div>
                ))}
                <div className="pt-4 mt-4 border-t border-zinc-800 flex justify-between items-center text-xs font-mono text-zinc-500">
                  <span>Collateral Coverage (LTV):</span>
                  <span className={d.ltv > 0.8 ? 'text-[#D9625A]' : 'text-zinc-300'}>{(d.ltv * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#13161E] border border-zinc-800 rounded-lg p-6">
            <h4 className=" text-xs uppercase tracking-widest text-zinc-400 mb-4 border-b border-zinc-800 pb-2">Revenue Trend (Underwriting View)</h4>
            <div className="h-40 flex flex-col items-center justify-center text-center">
              <TrendingUp size={32} className="text-zinc-600 mb-2" />
              <div className="text-xs text-zinc-500">12m Trend: Stable / Positive</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderApplicationWizard = () => {
    return (
      <div className="w-full bg-[#13161E] border border-zinc-800 rounded-lg p-6 animate-slide-in min-h-[500px]">
        {/* WIZARD HEADER */}
        <div className="border-b border-zinc-800 pb-4 mb-6 flex justify-between items-center">
          <h3 className="font-serif text-xl text-[#ECEAE4]">Credit Application</h3>
          <div className="flex gap-4 font-mono text-xs text-zinc-500">
            <span className={wizardStep === 1 ? 'text-[#E8B84B]' : ''}>1. FACILITY</span>
            <span>&gt;</span>
            <span className={wizardStep === 2 ? 'text-[#E8B84B]' : ''}>2. TERMS</span>
            <span>&gt;</span>
            <span className={wizardStep === 3 ? 'text-[#E8B84B]' : ''}>3. UNDERWRITING</span>
          </div>
        </div>

        {/* STEP 1 */}
        {wizardStep === 1 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-4">Select Capital Type</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-[#1B1F29] border border-zinc-800 p-6 rounded hover:border-[#4B6382] transition-colors cursor-pointer" onClick={() => handleFacilitySelect('revolver', 2000000)}>
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="text-[#4B6382]" size={20} />
                  <span className="font-bold text-sm text-[#ECEAE4]">Revolving Credit Facility</span>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-mono"><span className="text-zinc-500">Max:</span><span className="text-zinc-300">$5,000,000</span></div>
                  <div className="flex justify-between text-xs font-mono"><span className="text-zinc-500">Rate:</span><span className="text-zinc-300">Base + 3.50%</span></div>
                </div>
                <button className="w-full py-2 bg-[#4B6382]/10 text-[#4B6382] border border-[#4B6382] rounded text-xs font-mono">SELECT</button>
              </div>

              <div className="bg-[#1B1F29] border border-zinc-800 p-6 rounded hover:border-[#E8B84B] transition-colors cursor-pointer" onClick={() => handleFacilitySelect('term', 5000000)}>
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="text-[#E8B84B]" size={20} />
                  <span className="font-bold text-sm text-[#ECEAE4]">Term Loan (CapEx)</span>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-mono"><span className="text-zinc-500">Max:</span><span className="text-zinc-300">$10,000,000</span></div>
                  <div className="flex justify-between text-xs font-mono"><span className="text-zinc-500">Rate:</span><span className="text-zinc-300">Fixed 7.25%</span></div>
                </div>
                <button className="w-full py-2 bg-[#E8B84B]/10 text-[#E8B84B] border border-[#E8B84B] rounded text-xs font-mono">SELECT</button>
              </div>

              <div className="bg-[#1B1F29] border border-zinc-800 p-6 rounded hover:border-[#4FB286] transition-colors cursor-pointer" onClick={() => handleFacilitySelect('trade', 1000000)}>
                <div className="flex items-center gap-3 mb-4">
                  <Wallet className="text-[#4FB286]" size={20} />
                  <span className="font-bold text-sm text-[#ECEAE4]">Trade Finance</span>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-mono"><span className="text-zinc-500">Max:</span><span className="text-zinc-300">$2,000,000</span></div>
                  <div className="flex justify-between text-xs font-mono"><span className="text-zinc-500">Rate:</span><span className="text-zinc-300">Base + 2.00%</span></div>
                </div>
                <button className="w-full py-2 bg-[#4FB286]/10 text-[#4FB286] border border-[#4FB286] rounded text-xs font-mono">SELECT</button>
              </div>

            </div>
          </div>
        )}

        {/* STEP 2 */}
        {wizardStep === 2 && (
          <div className="animate-fade-in space-y-8">
            <div className="bg-[#1B1F29] border border-zinc-800 rounded p-6">
              <h4 className=" text-xs uppercase tracking-widest text-zinc-400 mb-6 border-b border-zinc-800 pb-2">Desired Terms</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 mb-2">AMOUNT ($)</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#0B0D12] border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono outline-none focus:border-[#E8B84B]"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value.replace(/,/g, '')))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 mb-2">TENOR (MONTHS)</label>
                  <select 
                    className="w-full bg-[#0B0D12] border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono outline-none focus:border-[#E8B84B]"
                    value={loanTenor}
                    onChange={(e) => setLoanTenor(Number(e.target.value))}
                  >
                    <option value={12}>12 Months</option>
                    <option value={24}>24 Months</option>
                    <option value={36}>36 Months</option>
                    <option value={48}>48 Months</option>
                    <option value={60}>60 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 mb-2">PURPOSE</label>
                  <select 
                    className="w-full bg-[#0B0D12] border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono outline-none focus:border-[#E8B84B]"
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                  >
                    <option value="expansion">Expansion</option>
                    <option value="refinance">Refinance</option>
                    <option value="working_capital">Working Capital</option>
                    <option value="equipment">Equipment Purchase</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-mono text-zinc-500 mb-2">AMORTIZATION SCHEDULE</label>
                <select 
                  className="w-full bg-[#0B0D12] border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono outline-none focus:border-[#E8B84B]"
                  value={amortizationType}
                  onChange={(e) => setAmortizationType(e.target.value)}
                >
                  <option value="amortizing">Standard Monthly Amortization (P+I)</option>
                  <option value="balloon">Interest Only / Balloon Payment at Maturity</option>
                </select>
              </div>

              <div className="bg-[#E8B84B]/10 border border-[#E8B84B]/30 p-4 rounded flex gap-3 text-sm text-[#E8B84B]">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p><strong>System Suggestion:</strong> Based on your portfolio cash flow, a {loanTenor}-month tenor with {amortizationType === 'balloon' ? 'a balloon payment increases DSCR risk and may lower your approval chances.' : 'standard amortization lowers your DSCR risk.'}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setWizardStep(1)} className="px-6 py-2 bg-[#1B1F29] border border-zinc-700 text-zinc-300 font-mono text-xs rounded hover:bg-zinc-800">BACK</button>
              <button onClick={handleSimulateUnderwriting} className="px-6 py-2 bg-[#E8B84B] text-black font-bold font-mono text-xs rounded hover:bg-[#D5AE55]">RUN UNDERWRITING</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {wizardStep === 3 && (
          <div className="animate-fade-in">
            {isUnderwriting ? (
              <div className="flex flex-col items-center justify-center min-h-[300px]">
                <Activity size={32} className="text-[#E8B84B] animate-pulse mb-4" />
                <div className="font-mono text-sm text-zinc-300">Processing... Portfolio analyzed against Drennia National Standards.</div>
              </div>
            ) : underwritingResult && (
              <div className="space-y-6">
                <div className="bg-[#1B1F29] border border-zinc-800 rounded overflow-hidden">
                  <div className="border-b border-zinc-800 p-3 bg-[#1E1B14]">
                    <h4 className=" text-xs uppercase tracking-widest text-[#E8B84B]">AI Underwriter Decision Matrix</h4>
                  </div>
                  <table className="w-full text-left text-sm font-mono">
                    <thead className="bg-[#0B0D12] text-zinc-500 text-[10px]">
                      <tr>
                        <th className="px-4 py-2 font-normal">CRITERIA</th>
                        <th className="px-4 py-2 font-normal">YOUR DATA</th>
                        <th className="px-4 py-2 font-normal">SCORE</th>
                        <th className="px-4 py-2 font-normal">WEIGHT</th>
                        <th className="px-4 py-2 font-normal">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {underwritingResult.matrix.map((row: any, i: number) => {
                        let colorClass = 'text-zinc-300';
                        if (row.score >= 80) colorClass = 'text-[#4FB286]';
                        else if (row.score >= 50) colorClass = 'text-[#E8B84B]';
                        else colorClass = 'text-[#D9625A]';
                        
                        return (
                          <tr key={i} className="hover:bg-zinc-800/20 group" title={row.tip}>
                            <td className="px-4 py-3 text-zinc-300">{row.criteria}</td>
                            <td className="px-4 py-3 text-white font-bold">{row.data}</td>
                            <td className={`px-4 py-3 font-bold ${colorClass}`}>{row.score}</td>
                            <td className="px-4 py-3 text-zinc-500">{row.weight}</td>
                            <td className="px-4 py-3 font-bold text-[#E8B84B]">{row.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-[#1E1B14] border-t border-zinc-800">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-[10px] text-zinc-500">OVERALL PORTFOLIO GRADE</td>
                        <td className="px-4 py-3 font-bold text-white text-base">{underwritingResult.overall} / 100</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className={`p-4 rounded border ${underwritingResult.status === 'APPROVED' ? 'bg-[#4FB286]/10 border-[#4FB286]/30 text-[#4FB286]' : 'bg-[#D9625A]/10 border-[#D9625A]/30 text-[#D9625A]'}`}>
                  <div className="flex items-start gap-3">
                    {underwritingResult.status === 'APPROVED' ? <CheckCircle2 size={24} className="shrink-0 mt-0.5" /> : <AlertTriangle size={24} className="shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold text-sm mb-1">RECOMMENDATION: {underwritingResult.status}</div>
                      <div className="text-xs opacity-80">
                        {underwritingResult.status === 'APPROVED' 
                          ? `Risk Premium: +${(underwritingResult.premium * 100).toFixed(2)}% over Base Rate.` 
                          : 'Your portfolio does not meet the minimum LTV or DSCR covenants required for this facility.'}
                      </div>
                    </div>
                  </div>
                </div>

                {company?.industry_id === 'manufacturing' && (
                  <div className="flex gap-2 items-center text-xs font-mono text-zinc-400 bg-zinc-800/20 p-3 rounded border border-zinc-800/50">
                    <ShieldCheck size={14} className="text-zinc-500" />
                    <span><strong>State Mandate Clause:</strong> As a manufacturing firm, you receive a sovereign rate discount (-1.00%) for National Employment contributions.</span>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button onClick={() => setWizardStep(2)} className="px-6 py-2 bg-[#1B1F29] border border-zinc-700 text-zinc-300 font-mono text-xs rounded hover:bg-zinc-800">BACK</button>
                  <div className="flex gap-4">
                    {underwritingResult.status === 'APPROVED' && Number(underwritingResult.overall) > 85 && (
                      <button className="px-6 py-2 bg-[#4B6382]/10 border border-[#4B6382] text-[#4B6382] font-mono text-xs rounded hover:bg-[#4B6382]/30 transition-colors">NEGOTIATE TERMS</button>
                    )}
                    <button 
                      disabled={underwritingResult.status !== 'APPROVED' || isSubmitting}
                      onClick={handleFinalSubmit}
                      className="px-6 py-2 bg-[#E8B84B] text-black font-bold font-mono text-xs rounded hover:bg-[#D5AE55] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'DISBURSING...' : 'ACCEPT TERMS & PROCEED'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDebtSchedule = () => {
    // Real loans at this bank (GET /banks/loans), personal and company.
    const atThisBank: BankLoan[] = (loans || []).filter((l: BankLoan) => l.bankId === bank.id);
    return (
      <div className="w-full animate-slide-in space-y-4">
        <h3 className="font-serif text-xl text-ink">Active debt</h3>
        {loansError ? (
          <p role="alert" className="bg-surface border border-line rounded-card p-6 text-sm text-bad">{loansError}</p>
        ) : (
          <LoanSchedule
            loans={atThisBank}
            showLender={false}
            emptyMessage="Loans you take from this bank appear here, with what is left to pay, the monthly payment and when each one ends."
            emptyAction={{ label: 'Apply for credit', onClick: () => setActiveTab('apply') }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-slide-in p-6 md:p-8 max-w-6xl mx-auto w-full">
      {/* Top Navigation Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-zinc-800 pb-6 mb-6">
        <div className="flex items-center min-w-0">
          <button type="button" onClick={onBack} aria-label="Back to banking institutions" className="mr-4 p-2 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-zinc-100 flex items-center justify-center border border-zinc-700">
            <ChevronLeft size={16} />
          </button>
          <div className="w-10 h-10 rounded border border-zinc-800 flex items-center justify-center mr-4 bg-[#0B0D12]" style={{ color: bank.color }}>
            <Landmark size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="font-serif text-2xl font-bold text-zinc-100 m-0 leading-tight tracking-wide uppercase">
                {bank.name}
              </h2>
              <span className="bg-info/10 text-info border border-info/30 px-2 py-0.5 rounded text-[10px] font-mono tracking-widest font-bold">GOVERNMENT-OWNED</span>
              <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded text-[10px] font-mono tracking-widest">RATING: {corporateDossier?.ratingTier || 'N/A'}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2">
              <div className="text-[11px] uppercase tracking-[0.1em] text-zinc-500">
                Base Rate: <span className="text-zinc-200">{(baseRate * 100).toFixed(1)}%</span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-zinc-500">
                Liquidity Pool: <span className="text-zinc-200">${((institutionData?.availableLiquidity || 0)/1000000000).toFixed(2)}B</span>
              </div>
            </div>
          </div>
        </div>
        
          <div className="flex bg-[#13161E] p-1 rounded-md border border-zinc-800 mt-4 lg:mt-0">
            <button onClick={() => setActiveTab('portfolio')} className={`px-4 py-1.5 text-[11px] tracking-widest uppercase rounded transition-colors ${activeTab === 'portfolio' ? 'bg-[#262B36] text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>PORTFOLIO</button>
            <button onClick={() => setActiveTab('apply')} className={`px-4 py-1.5 text-[11px] tracking-widest uppercase rounded transition-colors ${activeTab === 'apply' ? 'bg-[#262B36] text-[#E8B84B] shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>APPLY FOR CREDIT</button>
            <button onClick={() => setActiveTab('debt')} className={`px-4 py-1.5 text-[11px] tracking-widest uppercase rounded transition-colors ${activeTab === 'debt' ? 'bg-[#262B36] text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>ACTIVE DEBT</button>
          </div>
        </div>

        {/* Liquidity Pool Gauge */}
        <div className="bg-[#13161E] border border-zinc-800 p-3 rounded flex items-center gap-4 mb-6" title={`National Liquidity Pool: $${((institutionData?.availableLiquidity || 0)/1000000000).toFixed(2)}B remaining. High demand increases rates.`}>
          <div className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">LIQUIDITY POOL</div>
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${((institutionData?.availableLiquidity || 0)/(institutionData?.totalAssets || 1)) < 0.3 ? 'bg-[#D9625A]' : 'bg-[#4FB286]'}`}
              style={{ width: `${((institutionData?.availableLiquidity || 0)/(institutionData?.totalAssets || 1)) * 100}%` }}
            />
          </div>
          <div className="text-[10px] font-mono font-bold text-zinc-300">{(((institutionData?.availableLiquidity || 0)/(institutionData?.totalAssets || 1)) * 100).toFixed(1)}% AVAILABLE</div>
        </div>
      <div className="flex-1 overflow-y-auto pb-10">
        {activeTab === 'portfolio' && renderPortfolioSnapshot()}
        {activeTab === 'apply' && renderApplicationWizard()}
        {activeTab === 'debt' && renderDebtSchedule()}
      </div>

      {/* Audit Trail Footer */}
      <div className="text-center mt-auto pt-6 border-t border-zinc-800/50">
        <div className="text-[10px] text-zinc-600 tracking-widest uppercase flex items-center justify-center gap-2">
          <ShieldCheck size={10} />
          <span>Last reviewed by Drennia Financial Authority • LIVE SYSTEM</span>
        </div>
      </div>
    </div>
  );
}
