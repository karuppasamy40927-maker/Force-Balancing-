import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, HelpCircle, Scale, Ruler, Compass, Gauge, Copy, Check, 
  ArrowRightLeft, BookOpen, Layers, ShieldCheck, Zap
} from 'lucide-react';

interface UnitConversionHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMassUnit?: 'kg' | 'lbs';
  currentLengthUnit?: 'm' | 'in' | 'mm' | 'cm';
}

// Exact NIST / ISO conversion constants
export const CONVERSION_CONSTANTS = {
  // Mass to KG base
  massToKg: {
    kg: 1,
    lbs: 0.45359237,
    g: 0.001,
    oz: 0.028349523125,
    slug: 14.5939029,
  },
  // Length to Meter base
  lengthToM: {
    m: 1,
    mm: 0.001,
    cm: 0.01,
    in: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
  },
};

export default function UnitConversionHelpModal({
  isOpen,
  onClose,
  currentMassUnit = 'kg',
  currentLengthUnit = 'm',
}: UnitConversionHelpModalProps) {
  const [activeTab, setActiveTab] = useState<'converter' | 'mass_table' | 'length_table' | 'unbalance' | 'conventions'>('converter');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Interactive Converter State
  const [massInputVal, setMassInputVal] = useState('1');
  const [massInputUnit, setMassInputUnit] = useState<'kg' | 'lbs' | 'g' | 'oz' | 'slug'>(currentMassUnit);

  const [lengthInputVal, setLengthInputVal] = useState('1');
  const [lengthInputUnit, setLengthInputUnit] = useState<'m' | 'mm' | 'cm' | 'in' | 'ft'>(currentLengthUnit);

  const [unbalanceMass, setUnbalanceMass] = useState('10');
  const [unbalanceMassUnit, setUnbalanceMassUnit] = useState<'kg' | 'lbs' | 'g' | 'oz'>('kg');
  const [unbalanceRadius, setUnbalanceRadius] = useState('0.25');
  const [unbalanceRadiusUnit, setUnbalanceRadiusUnit] = useState<'m' | 'mm' | 'cm' | 'in'>('m');

  const [calcRpm, setCalcRpm] = useState('1500');

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Compute Mass Conversions
  const numMass = parseFloat(massInputVal) || 0;
  const massInKg = numMass * (CONVERSION_CONSTANTS.massToKg[massInputUnit] || 1);
  const convertedMasses = {
    kg: massInKg / CONVERSION_CONSTANTS.massToKg.kg,
    lbs: massInKg / CONVERSION_CONSTANTS.massToKg.lbs,
    g: massInKg / CONVERSION_CONSTANTS.massToKg.g,
    oz: massInKg / CONVERSION_CONSTANTS.massToKg.oz,
    slug: massInKg / CONVERSION_CONSTANTS.massToKg.slug,
  };

  // Compute Length Conversions
  const numLength = parseFloat(lengthInputVal) || 0;
  const lengthInM = numLength * (CONVERSION_CONSTANTS.lengthToM[lengthInputUnit] || 1);
  const convertedLengths = {
    m: lengthInM / CONVERSION_CONSTANTS.lengthToM.m,
    mm: lengthInM / CONVERSION_CONSTANTS.lengthToM.mm,
    cm: lengthInM / CONVERSION_CONSTANTS.lengthToM.cm,
    in: lengthInM / CONVERSION_CONSTANTS.lengthToM.in,
    ft: lengthInM / CONVERSION_CONSTANTS.lengthToM.ft,
    yd: lengthInM / CONVERSION_CONSTANTS.lengthToM.yd,
  };

  // Compute Unbalance & Centrifugal Force
  const ubMassKg = (parseFloat(unbalanceMass) || 0) * (CONVERSION_CONSTANTS.massToKg[unbalanceMassUnit] || 1);
  const ubRadiusM = (parseFloat(unbalanceRadius) || 0) * (CONVERSION_CONSTANTS.lengthToM[unbalanceRadiusUnit] || 1);
  const ubKgM = ubMassKg * ubRadiusM;
  const ubGmm = ubKgM * 1_000_000;
  const ubKgMm = ubKgM * 1_000;
  const ubOzin = (ubMassKg / CONVERSION_CONSTANTS.massToKg.oz) * (ubRadiusM / CONVERSION_CONSTANTS.lengthToM.in);
  const ubLbin = (ubMassKg / CONVERSION_CONSTANTS.massToKg.lbs) * (ubRadiusM / CONVERSION_CONSTANTS.lengthToM.in);

  const rpmVal = parseFloat(calcRpm) || 0;
  const omega = (2 * Math.PI * rpmVal) / 60;
  const centrifugalForceN = ubKgM * omega * omega;
  const centrifugalForceLbf = centrifugalForceN * 0.224808943;

  // Format Helper
  const fmt = (n: number, maxDecimals = 4) => {
    if (isNaN(n) || !isFinite(n)) return '0';
    if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.0001 && n !== 0)) {
      return n.toExponential(3);
    }
    const fixed = n.toFixed(maxDecimals);
    return parseFloat(fixed).toString();
  };

  const massStandardTable = [
    { kg: '0.1', lbs: '0.2205', g: '100', oz: '3.527' },
    { kg: '0.25', lbs: '0.5512', g: '250', oz: '8.818' },
    { kg: '0.5', lbs: '1.1023', g: '500', oz: '17.637' },
    { kg: '1.0', lbs: '2.2046', g: '1,000', oz: '35.274' },
    { kg: '2.0', lbs: '4.4092', g: '2,000', oz: '70.548' },
    { kg: '5.0', lbs: '11.0231', g: '5,000', oz: '176.37' },
    { kg: '10.0', lbs: '22.0462', g: '10,000', oz: '352.74' },
    { kg: '15.0', lbs: '33.0693', g: '15,000', oz: '529.11' },
    { kg: '20.0', lbs: '44.0925', g: '20,000', oz: '705.48' },
    { kg: '50.0', lbs: '110.231', g: '50,000', oz: '1,763.7' },
  ];

  const lengthStandardTable = [
    { mm: '1', cm: '0.1', m: '0.001', in: '0.0394', ft: '0.0033' },
    { mm: '10', cm: '1.0', m: '0.01', in: '0.3937', ft: '0.0328' },
    { mm: '25.4', cm: '2.54', m: '0.0254', in: '1.0000', ft: '0.0833' },
    { mm: '50', cm: '5.0', m: '0.05', in: '1.9685', ft: '0.1640' },
    { mm: '100', cm: '10.0', m: '0.10', in: '3.9370', ft: '0.3281' },
    { mm: '150', cm: '15.0', m: '0.15', in: '5.9055', ft: '0.4921' },
    { mm: '200', cm: '20.0', m: '0.20', in: '7.8740', ft: '0.6562' },
    { mm: '250', cm: '25.0', m: '0.25', in: '9.8425', ft: '0.8202' },
    { mm: '304.8', cm: '30.48', m: '0.3048', in: '12.000', ft: '1.0000' },
    { mm: '500', cm: '50.0', m: '0.50', in: '19.685', ft: '1.6404' },
    { mm: '1000', cm: '100.0', m: '1.00', in: '39.370', ft: '3.2808' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <HelpCircle size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    Engineering Unit & Conversion Guide
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                    Quick Reference
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Exact conversion factors, live calculator, ISO 1940 notes, and rotordynamic balance conventions
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close guide (Esc)"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 overflow-x-auto shrink-0 scrollbar-thin">
            <button
              onClick={() => setActiveTab('converter')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'converter'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <ArrowRightLeft size={14} />
              Interactive Converter
            </button>
            <button
              onClick={() => setActiveTab('mass_table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'mass_table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Scale size={14} />
              Mass Reference (kg / lbs)
            </button>
            <button
              onClick={() => setActiveTab('length_table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'length_table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Ruler size={14} />
              Length Reference (m / mm / in)
            </button>
            <button
              onClick={() => setActiveTab('unbalance')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'unbalance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Zap size={14} />
              Unbalance & Centrifugal Force
            </button>
            <button
              onClick={() => setActiveTab('conventions')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'conventions'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <BookOpen size={14} />
              App Conventions & Formulas
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
            
            {/* TAB 1: INTERACTIVE CONVERTER */}
            {activeTab === 'converter' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
                  <HelpCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Live Engineering Converter:</span> Type any value below to see simultaneous conversions across all metric and imperial units supported by this balancing tool. Click any result to copy it to your clipboard.
                  </div>
                </div>

                {/* Mass Converter Row */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                        <Scale size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Mass Converter</h4>
                        <p className="text-xs text-slate-500">Convert between kilograms, pounds, grams, ounces, and slugs</p>
                      </div>
                    </div>
                    {copiedText && (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1 animate-pulse">
                        <Check size={12} /> Copied {copiedText}!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Input Value
                      </label>
                      <input 
                        type="number" 
                        step="any"
                        value={massInputVal}
                        onChange={(e) => setMassInputVal(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all"
                        placeholder="e.g. 15.5"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Input Unit
                      </label>
                      <select
                        value={massInputUnit}
                        onChange={(e) => setMassInputUnit(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-500 outline-hidden cursor-pointer"
                      >
                        <option value="kg">Kilograms (kg)</option>
                        <option value="lbs">Pounds (lbs)</option>
                        <option value="g">Grams (g)</option>
                        <option value="oz">Ounces (oz)</option>
                        <option value="slug">Slugs (slug)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-center">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Conversion Rule</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {massInputUnit === 'kg' ? '1 kg = 2.20462 lbs = 1000 g' :
                         massInputUnit === 'lbs' ? '1 lb = 0.453592 kg = 16 oz' :
                         massInputUnit === 'g' ? '1000 g = 1 kg = 2.20462 lbs' :
                         massInputUnit === 'oz' ? '1 oz = 0.0625 lbs = 28.3495 g' :
                         '1 slug = 14.5939 kg = 32.174 lbs'}
                      </span>
                    </div>
                  </div>

                  {/* Mass Output Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
                    {[
                      { unit: 'kg', label: 'Kilograms', val: convertedMasses.kg, symbol: 'kg' },
                      { unit: 'lbs', label: 'Pounds', val: convertedMasses.lbs, symbol: 'lbs' },
                      { unit: 'g', label: 'Grams', val: convertedMasses.g, symbol: 'g' },
                      { unit: 'oz', label: 'Ounces', val: convertedMasses.oz, symbol: 'oz' },
                      { unit: 'slug', label: 'Slugs', val: convertedMasses.slug, symbol: 'slug' },
                    ].map((item) => (
                      <button
                        key={item.unit}
                        type="button"
                        onClick={() => handleCopy(fmt(item.val, 4), item.label)}
                        className={`group text-left p-3 rounded-xl border transition-all relative ${
                          massInputUnit === item.unit
                            ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {item.symbol}
                          </span>
                          <Copy size={11} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <div className="text-sm sm:text-base font-mono font-bold text-slate-900 truncate">
                          {fmt(item.val, 4)}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{item.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length Converter Row */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                        <Ruler size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Length / Radius Converter</h4>
                        <p className="text-xs text-slate-500">Convert between meters, millimeters, centimeters, inches, and feet</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Input Radius / Length
                      </label>
                      <input 
                        type="number" 
                        step="any"
                        value={lengthInputVal}
                        onChange={(e) => setLengthInputVal(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all"
                        placeholder="e.g. 0.25"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Input Unit
                      </label>
                      <select
                        value={lengthInputUnit}
                        onChange={(e) => setLengthInputUnit(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-indigo-500 outline-hidden cursor-pointer"
                      >
                        <option value="m">Meters (m)</option>
                        <option value="mm">Millimeters (mm)</option>
                        <option value="cm">Centimeters (cm)</option>
                        <option value="in">Inches (in)</option>
                        <option value="ft">Feet (ft)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-center">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Conversion Rule</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {lengthInputUnit === 'm' ? '1 m = 1000 mm = 100 cm = 39.3701 in' :
                         lengthInputUnit === 'mm' ? '1000 mm = 1 m | 25.4 mm = 1 in' :
                         lengthInputUnit === 'cm' ? '100 cm = 1 m | 2.54 cm = 1 in' :
                         lengthInputUnit === 'in' ? '1 in = 25.4 mm = 0.0254 m = 0.0833 ft' :
                         '1 ft = 12 in = 0.3048 m = 304.8 mm'}
                      </span>
                    </div>
                  </div>

                  {/* Length Output Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
                    {[
                      { unit: 'm', label: 'Meters', val: convertedLengths.m, symbol: 'm' },
                      { unit: 'mm', label: 'Millimeters', val: convertedLengths.mm, symbol: 'mm' },
                      { unit: 'cm', label: 'Centimeters', val: convertedLengths.cm, symbol: 'cm' },
                      { unit: 'in', label: 'Inches', val: convertedLengths.in, symbol: 'in' },
                      { unit: 'ft', label: 'Feet', val: convertedLengths.ft, symbol: 'ft' },
                    ].map((item) => (
                      <button
                        key={item.unit}
                        type="button"
                        onClick={() => handleCopy(fmt(item.val, 4), item.label)}
                        className={`group text-left p-3 rounded-xl border transition-all relative ${
                          lengthInputUnit === item.unit
                            ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400'
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {item.symbol}
                          </span>
                          <Copy size={11} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <div className="text-sm sm:text-base font-mono font-bold text-slate-900 truncate">
                          {fmt(item.val, 4)}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{item.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instant Mass-Radius Unbalance Moment Calculator */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 text-white shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300">
                        <Compass size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Dynamic Unbalance Moment (m · r) & Centrifugal Force</h4>
                        <p className="text-xs text-slate-300">Convert single mass unbalance to standard ISO & industrial units</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Mass (m)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={unbalanceMass}
                          onChange={(e) => setUnbalanceMass(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm font-mono font-bold bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-400 outline-hidden"
                        />
                        <select
                          value={unbalanceMassUnit}
                          onChange={(e) => setUnbalanceMassUnit(e.target.value as any)}
                          className="px-2 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-xl text-slate-200 outline-hidden cursor-pointer"
                        >
                          <option value="kg">kg</option>
                          <option value="lbs">lbs</option>
                          <option value="g">g</option>
                          <option value="oz">oz</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Radius (r)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={unbalanceRadius}
                          onChange={(e) => setUnbalanceRadius(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm font-mono font-bold bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-400 outline-hidden"
                        />
                        <select
                          value={unbalanceRadiusUnit}
                          onChange={(e) => setUnbalanceRadiusUnit(e.target.value as any)}
                          className="px-2 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 rounded-xl text-slate-200 outline-hidden cursor-pointer"
                        >
                          <option value="m">m</option>
                          <option value="mm">mm</option>
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Speed (RPM)
                      </label>
                      <input
                        type="number"
                        value={calcRpm}
                        onChange={(e) => setCalcRpm(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm font-mono font-bold bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-400 outline-hidden"
                        placeholder="1500"
                      />
                    </div>
                  </div>

                  {/* Calculated Unbalance Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">SI Dynamic Moment</div>
                      <div className="text-base font-mono font-extrabold text-blue-300">{fmt(ubKgM, 4)} kg·m</div>
                      <div className="text-[10px] text-slate-400">{fmt(ubKgMm, 2)} kg·mm</div>
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">ISO 1940 Precision</div>
                      <div className="text-base font-mono font-extrabold text-emerald-300">{fmt(ubGmm, 2)} g·mm</div>
                      <div className="text-[10px] text-slate-400">Standard test bench unit</div>
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Imperial Unbalance</div>
                      <div className="text-base font-mono font-extrabold text-amber-300">{fmt(ubOzin, 2)} oz·in</div>
                      <div className="text-[10px] text-slate-400">{fmt(ubLbin, 4)} lb·in</div>
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Centrifugal Force (Fc)</div>
                      <div className="text-base font-mono font-extrabold text-rose-300">{fmt(centrifugalForceN, 1)} N</div>
                      <div className="text-[10px] text-slate-400">{fmt(centrifugalForceLbf, 1)} lbf (@ {rpmVal} RPM)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MASS QUICK-REFERENCE TABLE */}
            {activeTab === 'mass_table' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Standard Mass Equivalent Matrix</h4>
                    <p className="text-xs text-slate-500">Quick lookups for common mass increments in industrial balancing</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 font-bold">
                      1 kg = 2.20462 lbs
                    </span>
                    <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 font-bold">
                      1 lb = 0.453592 kg
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Kilograms (kg)</th>
                        <th className="py-3 px-4">Pounds (lbs)</th>
                        <th className="py-3 px-4">Grams (g)</th>
                        <th className="py-3 px-4">Ounces (oz)</th>
                        <th className="py-3 px-4 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {massStandardTable.map((row, i) => (
                        <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{row.kg} kg</td>
                          <td className="py-2.5 px-4 text-blue-700 font-semibold">{row.lbs} lbs</td>
                          <td className="py-2.5 px-4 text-slate-600">{row.g} g</td>
                          <td className="py-2.5 px-4 text-slate-600">{row.oz} oz</td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setMassInputVal(row.kg);
                                setMassInputUnit('kg');
                                setActiveTab('converter');
                              }}
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-sans font-bold hover:underline"
                            >
                              Load in Converter &rarr;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Technical Constant Cheat Sheet */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Kilogram to Pound (Exact)</span>
                    <span className="text-sm font-mono font-bold text-slate-800">× 2.2046226218</span>
                    <p className="text-[11px] text-slate-500 mt-1">Multiply mass in kg by 2.20462 to get lbs.</p>
                  </div>
                  <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Pound to Kilogram (Exact)</span>
                    <span className="text-sm font-mono font-bold text-slate-800">× 0.4535923700</span>
                    <p className="text-[11px] text-slate-500 mt-1">Multiply mass in lbs by 0.45359 to get kg.</p>
                  </div>
                  <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Slug to Kilogram</span>
                    <span className="text-sm font-mono font-bold text-slate-800">× 14.5939029</span>
                    <p className="text-[11px] text-slate-500 mt-1">1 slug = 1 lbf·s²/ft = 32.174 lbs.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LENGTH QUICK-REFERENCE TABLE */}
            {activeTab === 'length_table' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Standard Length & Rotor Radius Matrix</h4>
                    <p className="text-xs text-slate-500">Standard industrial shaft radii, bearing spans, and diameter conversions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 font-bold">
                      1 in = 25.4 mm
                    </span>
                    <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 font-bold">
                      1 m = 39.3701 in
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Millimeters (mm)</th>
                        <th className="py-3 px-4">Centimeters (cm)</th>
                        <th className="py-3 px-4">Meters (m)</th>
                        <th className="py-3 px-4">Inches (in)</th>
                        <th className="py-3 px-4">Feet (ft)</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {lengthStandardTable.map((row, i) => (
                        <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{row.mm} mm</td>
                          <td className="py-2.5 px-4 text-slate-600">{row.cm} cm</td>
                          <td className="py-2.5 px-4 text-blue-700 font-semibold">{row.m} m</td>
                          <td className="py-2.5 px-4 text-indigo-700 font-bold">{row.in} in</td>
                          <td className="py-2.5 px-4 text-slate-600">{row.ft} ft</td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setLengthInputVal(row.m);
                                setLengthInputUnit('m');
                                setActiveTab('converter');
                              }}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-sans font-bold hover:underline"
                            >
                              Load in Converter &rarr;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Length Conversion Equations */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Inches to Millimeters</span>
                    <span className="text-sm font-mono font-bold text-slate-800">× 25.4 (Exact)</span>
                    <p className="text-[11px] text-slate-500 mt-1">Multiply inches by 25.4 to obtain millimeters.</p>
                  </div>
                  <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Meters to Inches</span>
                    <span className="text-sm font-mono font-bold text-slate-800">× 39.3700787</span>
                    <p className="text-[11px] text-slate-500 mt-1">Multiply meters by 39.3701 to get inches.</p>
                  </div>
                  <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Feet to Meters</span>
                    <span className="text-sm font-mono font-bold text-slate-800">× 0.3048 (Exact)</span>
                    <p className="text-[11px] text-slate-500 mt-1">1 foot = 12 inches = 0.3048 meters.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: UNBALANCE & CENTRIFUGAL FORCE */}
            {activeTab === 'unbalance' && (
              <div className="space-y-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Unbalance Equivalencies & Multipliers</h4>
                      <p className="text-xs text-slate-500">How dynamic force moment (m · r) translates across international standards</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        1 kg·m (SI Dynamic Moment)
                      </span>
                      <ul className="text-xs font-mono space-y-1 text-slate-700">
                        <li>= <strong className="text-blue-700">1,000</strong> kg·mm</li>
                        <li>= <strong className="text-blue-700">1,000,000</strong> g·mm (10⁶)</li>
                        <li>= <strong className="text-blue-700">1,388.74</strong> oz·in</li>
                        <li>= <strong className="text-blue-700">86.796</strong> lb·in</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        1 oz·in (Imperial Unbalance)
                      </span>
                      <ul className="text-xs font-mono space-y-1 text-slate-700">
                        <li>= <strong className="text-amber-700">720.078</strong> g·mm</li>
                        <li>= <strong className="text-amber-700">0.720078</strong> kg·mm</li>
                        <li>= <strong className="text-amber-700">0.00072008</strong> kg·m</li>
                        <li>= <strong className="text-amber-700">0.0625</strong> lb·in</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* ISO 1940 Quality Grades Reference */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      ISO 1940-1 Balance Quality Grades (G = e_per · ω)
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">e_per = (1000 · G) / ω (µm)</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                          <th className="py-2.5 px-3">Grade</th>
                          <th className="py-2.5 px-3">Permissible Speed Product (e_per · ω)</th>
                          <th className="py-2.5 px-3">Typical Industrial Machinery Applications</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-3 font-mono font-bold text-blue-700">G 0.4</td>
                          <td className="py-2 px-3 font-mono">0.4 mm/s</td>
                          <td className="py-2 px-3 text-slate-600">Gyroscopes, precision high-speed spindle drives</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono font-bold text-blue-700">G 1.0</td>
                          <td className="py-2 px-3 font-mono">1.0 mm/s</td>
                          <td className="py-2 px-3 text-slate-600">Grinding machine drives, small electric armatures, turbo-generators</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700">G 2.5</td>
                          <td className="py-2 px-3 font-mono">2.5 mm/s</td>
                          <td className="py-2 px-3 text-slate-600">Gas/steam turbines, computer memory discs, machine tool drives</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700">G 6.3</td>
                          <td className="py-2 px-3 font-mono">6.3 mm/s</td>
                          <td className="py-2 px-3 text-slate-600">Standard industrial rollers, electric motors, centrifugal pumps, fans</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono font-bold text-amber-700">G 16</td>
                          <td className="py-2 px-3 font-mono">16 mm/s</td>
                          <td className="py-2 px-3 text-slate-600">Drive shafts, agricultural machinery, crankshafts</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono font-bold text-rose-700">G 40</td>
                          <td className="py-2 px-3 font-mono">40 mm/s</td>
                          <td className="py-2 px-3 text-slate-600">Car wheels, tractor rims, heavy agricultural equipment</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: APP CONVENTIONS & FORMULAS */}
            {activeTab === 'conventions' && (
              <div className="space-y-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Application Coordinate System & Calculation Conventions</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Compass size={16} className="text-blue-600" />
                        Angular Coordinates (θ)
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Angles (θ) are measured in <strong>degrees (0° ≤ θ &lt; 360°)</strong> in the counter-clockwise (CCW) direction starting from the positive horizontal X-axis (3 o&apos;clock = 0°, 12 o&apos;clock = 90°, 9 o&apos;clock = 180°, 6 o&apos;clock = 270°).
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Layers size={16} className="text-indigo-600" />
                        Vector Force Decomposition
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-mono">
                        Fx = m · r · cos(θ) (Horizontal)<br />
                        Fy = m · r · sin(θ) (Vertical)<br />
                        ΣH = ∑ Fx,  ΣV = ∑ Fy
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Zap size={16} className="text-amber-600" />
                        Resultant Unbalance Vector (R)
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-mono">
                        R = √((ΣH)² + (ΣV)²)<br />
                        θ_R = atan2(ΣV, ΣH)
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Scale size={16} className="text-emerald-600" />
                        Balancing Counter-Mass (m_b, θ_b)
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-mono">
                        m_b = R / r_b (at chosen radius r_b)<br />
                        θ_b = (θ_R + 180°) mod 360°
                      </p>
                    </div>
                  </div>
                </div>

                {/* Centrifugal Force at Speed */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Gauge size={16} className="text-blue-400" />
                    Centrifugal Dynamic Force at Rotational Speed (RPM)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    When rotating at speed RPM, angular velocity is ω = (2π · RPM) / 60 rad/s.
                    The true dynamic centrifugal force imparted on bearings is:
                  </p>
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 font-mono text-center text-sm font-bold text-blue-300">
                    Fc = m · r · ω² = m · r · ((2π · RPM) / 60)² [Newtons]
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Active units:</span>
              <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                Mass: {currentMassUnit}
              </span>
              <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                Length: {currentLengthUnit}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 shadow-2xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
