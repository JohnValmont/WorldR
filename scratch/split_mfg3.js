const fs = require('fs');
const path = require('path');

const dir = 'd:\\\\WorldR\\\\frontend\\\\src\\\\app\\\\drennia\\\\business';
const inFile = path.join(dir, 'ManufacturingDeskTab.tsx');
let code = fs.readFileSync(inFile, 'utf8');

const tabs = [
  { key: 'overview', name: 'ManufacturingOverview' },
  { key: 'factory', name: 'FactoryTab' },
  { key: 'design', name: 'DesignStudio' },
  { key: 'procurement', name: 'ProcurementPanel' },
  { key: 'production', name: 'ProductionQueue' },
  { key: 'market', name: 'MarketSalesTab' },
  { key: 'staff', name: 'StaffingPanel' },
  { key: 'finance', name: 'FinanceDashboard' },
  { key: 'records', name: 'RecordsTab' },
  { key: 'equity', name: 'EquityDeskTab' }
];

let updatedCode = code;

const destructure = `
  const {
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
    BASE_DEV_COST, FACELIFT_COST, MKT_COSTS, STORAGE_COST_PER_UNIT, loadBootstrap, loadMarketData, refreshCompany,
    inventoryValue, handleSaveDesign, handleLaunchModel, handleDiscontinueModel, toggleLineStatus, handleDeleteLine,
    handleSaveLinePlan, buildNewLine, handleExpandFactory, handleMarketAllocations,
    SectionHeader, PanelBox, FieldRow, GoldButton, GhostButton, ScoreBadge, StatusDot, StatCard, EmptyState, FormSelect, ProgressBar, DataRow,
    finances, activeModels, calcLiveEngineering, calcLiveScores, marketSegments, brandResults,
    activeLinesCount, hasFactory, hasModel, hasActivePlan, allReports, latestReport, handleProcessAdmin,
    totalWorkers, totalLease, totalMaint, recurringSum, mfgTabRef,
    AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, RechartsTooltip, ResponsiveContainer
  } = useManufacturing();
`;

const imports = `import React from 'react';
import { useManufacturing } from './ManufacturingContext';
import { Activity, BarChart3, Factory, FlaskConical, DollarSign, LayoutDashboard, PieChart, ScrollText, ShoppingCart, Users, ChevronRight, X, AlertTriangle, Check, ArrowRight, Zap, Target, Gauge, Shield, Search, TrendingUp, AlertCircle, Wrench, Package, Truck, Info, Settings, Plus, Play, Pause, Trash2, ArrowUpRight, ArrowDownRight, CircleDollarSign, CheckCircle2, ChevronDown, CheckCircle, Brain, Factory as FactoryIcon, RotateCcw, LineChart, Hash, Scale, GraduationCap } from 'lucide-react';
`;

// Make sure to skip EquityDeskTab because it's already an extracted file!
for (const tab of tabs) {
  if (tab.key === 'equity') continue; // EquityDeskTab is already a separate file

  const marker = "deskTab === '" + tab.key + "' && (";
  let startIdx = updatedCode.indexOf(marker);
  if (startIdx === -1) {
    console.log("NOT FOUND:", tab.key);
    continue;
  }
  
  startIdx += marker.length;
  
  let endIdx = -1;
  let depth = 1;
  for (let i = startIdx; i < updatedCode.length; i++) {
    if (updatedCode[i] === '(') depth++;
    else if (updatedCode[i] === ')') depth--;
    
    if (depth === 0) {
      endIdx = i;
      break;
    }
  }
  
  if (endIdx !== -1) {
    let componentBody = updatedCode.substring(startIdx, endIdx);
    
    // If componentBody starts with () => { and ends with }, it's an IIFE.
    // Wrap it in curly braces so it evaluates in JSX!
    let renderedBody = "";
    if (componentBody.trim().startsWith("() => {")) {
       renderedBody = "{" + componentBody + "}";
    } else {
       renderedBody = componentBody;
    }

    const fileContent = "/* eslint-disable @typescript-eslint/no-unused-vars */\n" +
"/* eslint-disable react-hooks/exhaustive-deps */\n" +
imports + "\n" +
"export default function " + tab.name + "() {\n" +
destructure + "\n" +
"  return (\n" +
"    <>" + renderedBody + "</>\n" +
"  );\n" +
"}\n";
    fs.writeFileSync(path.join(dir, tab.name + ".tsx"), fileContent);
    
    const replacement = "deskTab === '" + tab.key + "' && <" + tab.name + " />";
    updatedCode = updatedCode.substring(0, startIdx - marker.length) + replacement + updatedCode.substring(endIdx + 1);
    console.log("Extracted:", tab.name);
  }
}

// We need to create ManufacturingContext.tsx!
const ctxContent = `"use client";
import React, { createContext, useContext } from 'react';

export const ManufacturingContext = createContext<any>(null);

export function useManufacturing() {
  return useContext(ManufacturingContext);
}
`;
fs.writeFileSync(path.join(dir, 'ManufacturingContext.tsx'), ctxContent);

const addedImports = tabs.map(t => "import " + t.name + " from './" + (t.key === 'equity' ? 'EquityDeskTab' : t.name) + "';").join('\\n') + "\\nimport { ManufacturingContext } from './ManufacturingContext';\\n";

updatedCode = updatedCode.replace(/(import .* from '.*';\\r?\\n)+/, match => match + addedImports);

const ctxValueObj = `
  const ctxValue = {
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
    BASE_DEV_COST, FACELIFT_COST, MKT_COSTS, STORAGE_COST_PER_UNIT, loadBootstrap, loadMarketData, refreshCompany,
    inventoryValue, handleSaveDesign, handleLaunchModel, handleDiscontinueModel, toggleLineStatus, handleDeleteLine,
    handleSaveLinePlan, buildNewLine, handleExpandFactory, handleMarketAllocations,
    SectionHeader, PanelBox, FieldRow, GoldButton, GhostButton, ScoreBadge, StatusDot, StatCard, EmptyState, FormSelect, ProgressBar, DataRow,
    finances, activeModels, calcLiveEngineering, calcLiveScores, marketSegments, brandResults,
    activeLinesCount, hasFactory, hasModel, hasActivePlan, allReports, latestReport, handleProcessAdmin,
    totalWorkers, totalLease, totalMaint, recurringSum, mfgTabRef,
    AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip: RechartsTooltip, ResponsiveContainer
  };
`;

updatedCode = updatedCode.replace(/return \(\s*<div className="flex flex-col lg:flex-row w-full min-h-\[calc\(100vh-120px\)\]">/, match => ctxValueObj + '\n  return (\n    <ManufacturingContext.Provider value={ctxValue}>\n      <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-120px)]">');
updatedCode = updatedCode.replace(/<\/div>\s*\);\s*}\s*$/, '      </div>\n    </ManufacturingContext.Provider>\n  );\n}');

fs.writeFileSync(inFile, updatedCode);
console.log("Done updating ManufacturingDeskTab.tsx!");
