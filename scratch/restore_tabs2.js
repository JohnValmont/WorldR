const fs = require('fs');
const orig = fs.readFileSync('d:/WorldR/scratch/mfg_original.tsx', 'utf8');

const destructureStr = `  const {
    company, mfgData, playerCash, characterName, onRefresh, isAdmin,
    deskTab, setDeskTab, notification, setNotification, bootstrapData, setBootstrapData,
    modelName, setModelName, dClass, setDClass, dPlatform, setDPlatform, dEngine, setDEngine,
    dDrivetrain, setDDrivetrain, dInterior, setDInterior, dSafety, setDSafety, dQuality, setDQuality,
    dSegment, setDSegment, dSalePrice, setDSalePrice, dEngineeringPackage, setDEngineeringPackage,
    designTab, setDesignTab, designSaving, setDesignSaving, defaultPriorities, dPriorities, setDPriorities,
    dBudgetAlloc, setDBudgetAlloc, designWizardStep, setDesignWizardStep, prioritySum, initBudgetAlloc,
    showDesignModal, setShowDesignModal, selectedModelId, setSelectedModelId, fullEngReport, setFullEngReport,
    engReportLoading, setEngReportLoading, launchingModelId, setLaunchingModelId, faceliftSourceModelId, setFaceliftSourceModelId,
    showDiscontinueConfirm, setShowDiscontinueConfirm, discontinuingModelId, setDiscontinuingModelId,
    showCompareModal, setShowCompareModal, compareModel1, setCompareModel1, compareModel2, setCompareModel2,
    editingLineId, setEditingLineId, planModelId, setPlanModelId, planTarget, setPlanTarget, planQuality, setPlanQuality,
    priceEdits, setPriceEdits, savingPrice, setSavingPrice, marketData, setMarketData, marketLoading, setMarketLoading,
    allocationForm, setAllocationForm, ledgerFilter, setLedgerFilter, selectedArcReportId, setSelectedArcReportId,
    showExpandConfirm, setShowExpandConfirm, expandingFactoryId, setExpandingFactoryId, showNotif,
    currencySymbol, autoConfig, statesForCountry, fm, resolveState,
    EXPANSION_COST, EXPANSION_DURATION, EXP_CAPACITY, EXP_MAX_LINES, EXP_WORKERS, EXP_LEASE, EXP_MAINT,
    BASE_DEV_COST, FACELIFT_COST, MKT_COSTS, STORAGE_COST_PER_UNIT, loadBootstrap, loadMarketData,
    inventoryValue, handleSaveDesign, handleLaunchModel, handleDiscontinueModel,
    SectionHeader, PanelBox, FieldRow, GoldButton, GhostButton, ScoreBadge, StatusDot, StatCard,
    finances, activeModels, calcLiveEngineering, calcLiveScores, marketSegments, brandResults,
    formatWorldDate, formatWorldDateShort, factories, productionLines, models, inventory, latestReport, allReports, staff, ledger, records, homeMarket, staffRoles, research, modelSnapshots, totalStaff, totalWagesPerArc, totalWorkers, supervisorCount, inspectorCount, salesManagerCount, engineerCount, liveScore, plannedUnits, recWorkers, activeLinesCount, activeMarketCount, activeLines, hasFactory, hasModel, hasActivePlan, leaseCostPerArc, maintCostPerArc, Badge, EmptyState
  } = useManufacturing();`;

const imports = `import React from 'react';
import { useManufacturing } from './ManufacturingContext';
import { Activity, BarChart3, Factory, FlaskConical, DollarSign, LayoutDashboard, PieChart, ScrollText, ShoppingCart, Users, ChevronRight, X, AlertTriangle, Check, ArrowRight, Zap, Target, Gauge, Shield, Search, TrendingUp, AlertCircle, Wrench, Package, Truck, Info, Settings, Plus, Play, Pause, Trash2, ArrowUpRight, ArrowDownRight, CircleDollarSign, CheckCircle2, ChevronDown, CheckCircle, Brain, Factory as FactoryIcon, RotateCcw, LineChart, Hash, Scale, GraduationCap } from 'lucide-react';
import { manufacturingApi } from '@/lib/api';
import {
  Card, Button, StatCard, DataRow, EmptyState as UIEmptyState, Badge as UIBadge, StatusDot as UIStatusDot, SectionHeading, Tabs, ProgressBar
} from '@/components/ui';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line
} from 'recharts';
import { T } from '../../../lib/theme';
`;

function getJSX(startStr, endStr) {
  let s = orig.indexOf(startStr);
  let e = orig.indexOf(endStr, s);
  let content = orig.substring(s + startStr.length, e).trim();
  // We need to trim the trailing spaces and closing brackets from ternary
  if (content.endsWith(') :')) content = content.substring(0, content.length - 3).trim();
  return content;
}

const factoryHandlers = `  const handleLeaseFactory = async (factoryTypeId: string) => {
    try {
      await manufacturingApi.leaseFactory(company.id, factoryTypeId);
      showNotif('Factory leased. Production lines created.', true);
      onRefresh();
      setDeskTab('factory');
    } catch (err: any) {
      showNotif(err?.response?.data?.error || err?.response?.data?.message || 'Failed to lease factory.', false);
    }
  };

  const handleStartExpansion = async (factoryId: string) => {
    try {
      await manufacturingApi.startFactoryExpansion(company.id, factoryId);
      showNotif(\`Workshop expansion started. \${fm(EXPANSION_COST)} deducted. Construction completes in \${EXPANSION_DURATION} Month\${EXPANSION_DURATION > 1 ? 's' : ''}.\`, true);
      setShowExpandConfirm(false);
      setExpandingFactoryId(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to start expansion.', false);
      setShowExpandConfirm(false);
    }
  };`;

const procHandlers = `  const [procuringComponent, setProcuringComponent] = React.useState<{ id: string, name: string, units: number, cost: number } | null>(null);

  const handleProcureComponent = async (componentId: string, units: number) => {
    try {
      await manufacturingApi.procureComponents(company.id, { component_id: componentId, units });
      showNotif('Components procured.', true);
      setProcuringComponent(null);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to procure.', false);
    }
  };`;

const adminHandlers = `  const handleProcessAdmin = async () => {
    try {
      const res = await manufacturingApi.processArcAdmin(company.id);
      showNotif(\`Month processed: Net \${fm(res.data.netProfit)}\`, true);
      onRefresh();
    } catch (err: any) {
      showNotif(err?.response?.data?.message || 'Failed to process month.', false);
    }
  };`;

function write(name, jsx, handlers) {
  let fileContent = imports + "\nexport default function " + name + "() {\n" + destructureStr + "\n\n" + handlers + "\n\n  return (\n    <>\n      " + jsx + "\n    </>\n  );\n}\n";
  fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/' + name + '.tsx', fileContent);
}

const fJSX = getJSX(`deskTab === 'factory' ? (`, `) : deskTab === 'design'`);
write('FactoryTab', fJSX, factoryHandlers);

const pJSX = getJSX(`deskTab === 'procurement' ? (`, `) : deskTab === 'production'`);
// Fix ProcurementPanel onChange typo we discovered earlier
const pJSX_fixed = pJSX.replace('{ ...units: parseInt(e.target.value) || 0 }', '{ ...procuringComponent!, units: parseInt(e.target.value) || 0 }');
write('ProcurementPanel', pJSX_fixed, procHandlers);

const oJSX = getJSX(`deskTab === 'overview' ? (`, `) : deskTab === 'factory'`);
write('ManufacturingOverview', oJSX, adminHandlers);

console.log('Restored fully!');
