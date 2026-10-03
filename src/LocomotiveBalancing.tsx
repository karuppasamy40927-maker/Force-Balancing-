import React, { useState, useMemo } from 'react';
import { Calculator, Settings, Layers, Box, TrendingUp, Anchor, HelpCircle, Download, Printer, RotateCcw, Activity } from 'lucide-react';
import { generateLocomotiveReport } from './generateLocomotiveReport';
import UnitConversionHelpModal from './UnitConversionHelpModal';

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center ml-1 align-middle">
    <HelpCircle size={12} className="text-slate-400 hover:text-slate-600 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-50 whitespace-normal normal-case font-normal text-center pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

const PolygonDiagram = ({ points, labels, colors }: any) => {
  if (!points || points.length < 2) return null;
  const xs = points.map((p: any) => p.x);
  const ys = points.map((p: any) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = Math.max(maxX - minX, 0.001);
  const rangeY = Math.max(maxY - minY, 0.001);
  
  const width = 300, height = 300, padding = 50;
  const scale = Math.min((width - 2*padding)/rangeX, (height - 2*padding)/rangeY);
  const cx = (minX + maxX)/2;
  const cy = (minY + maxY)/2;
  
  const scaledPoints = points.map((p: any) => ({
    x: width/2 + (p.x - cx)*scale,
    y: height/2 - (p.y - cy)*scale
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full drop-shadow-sm">
      <defs>
        {colors.map((c: string, i: number) => (
          <marker key={i} id={`arrow-${c.replace('#', '')}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
          </marker>
        ))}
      </defs>
      <circle cx={width/2 - cx*scale} cy={height/2 + cy*scale} r="4" fill="#94a3b8" />
      {scaledPoints.map((p: any, i: number) => {
        if (i === 0) return null;
        const prev = scaledPoints[i-1];
        return (
          <g key={i}>
            <line x1={prev.x} y1={prev.y} x2={p.x} y2={p.y} stroke={colors[i-1]} strokeWidth="3" markerEnd={`url(#arrow-${colors[i-1].replace('#', '')})`} />
            <text x={(prev.x + p.x)/2 + 10} y={(prev.y + p.y)/2 - 10} fill={colors[i-1]} fontSize="12" fontWeight="bold">
              {labels[i-1]}
            </text>
          </g>
        )
      })}
    </svg>
  );
};

const PlaneDiagram = ({ W, l_B, l_C }: any) => {
  if (W <= 0) return null;
  const width = 400, height = 200, padding = 40;
  const scaleX = (width - 2*padding) / W;
  const getX = (val: number) => padding + val * scaleX;
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      {[
        { id: 'A (Wheel 1)', x: 0, color: '#3b82f6' },
        { id: 'B (Cyl 1)', x: l_B, color: '#ef4444' },
        { id: 'C (Cyl 2)', x: l_C, color: '#ef4444' },
        { id: 'D (Wheel 2)', x: W, color: '#10b981' }
      ].map((plane, i) => (
        <g key={i}>
          <line x1={getX(plane.x)} y1={height/2 - 40} x2={getX(plane.x)} y2={height/2 + 40} stroke={plane.color} strokeWidth="3" strokeLinecap="round" />
          <circle cx={getX(plane.x)} cy={height/2} r="6" fill={plane.color} className="drop-shadow-sm" />
          <text x={getX(plane.x)} y={height/2 - 50} fill={plane.color} fontSize="12" fontWeight="bold" textAnchor="middle">
            Plane {plane.id}
          </text>
          <text x={getX(plane.x)} y={height/2 + 60} fill="#64748b" fontSize="12" textAnchor="middle">
            {plane.x.toFixed(3)}m
          </text>
        </g>
      ))}
    </svg>
  );
};

const SpaceDiagram = ({ phi, thetaA, thetaD }: any) => {
  const width = 300, height = 300;
  const cx = 150, cy = 150;
  
  const drawVector = (angleDeg: number, color: string, label: string, radius = 80) => {
    const rad = angleDeg * Math.PI / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy - radius * Math.sin(rad);
    return (
      <g>
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="3" markerEnd={`url(#arrow-${color.replace('#', '')})`} />
        <circle cx={x} cy={y} r="14" fill={color} className="drop-shadow-sm" />
        <text x={x} y={y + 4} fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">{label}</text>
      </g>
    )
  }
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        {['#ef4444', '#3b82f6', '#10b981'].map((c, i) => (
          <marker key={i} id={`arrow-${c.replace('#', '')}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
          </marker>
        ))}
      </defs>
      <circle cx={cx} cy={cy} r="100" stroke="#e2e8f0" strokeWidth="2" fill="none" strokeDasharray="6,6" />
      <circle cx={cx} cy={cy} r="6" fill="#94a3b8" />
      
      {drawVector(0, '#ef4444', 'B', 75)}
      {drawVector(phi, '#ef4444', 'C', 75)}
      {drawVector(thetaA, '#3b82f6', 'A', 100)}
      {drawVector(thetaD, '#10b981', 'D', 100)}
    </svg>
  );
};

export default function LocomotiveBalancing() {
  const [W, setW] = useState<number | ''>('');
  const [C, setC] = useState<number | ''>('');
  const [L, setL] = useState<number | ''>('');
  const [m_ro, setM_ro] = useState<number | ''>('');
  const [m_re, setM_re] = useState<number | ''>('');
  const [c_frac, setC_frac] = useState<number | ''>('');
  const [phi, setPhi] = useState<number | ''>('');
  const [r_b, setR_b] = useState<number | ''>('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const calc = useMemo(() => {
    const wVal = Number(W) || 0;
    const cVal = Number(C) || 0;
    const lVal = Number(L) || 0;
    const mRoVal = Number(m_ro) || 0;
    const mReVal = Number(m_re) || 0;
    const cFracVal = Number(c_frac) || 0;
    const phiVal = Number(phi) || 0;
    const rbVal = Number(r_b) || 0;

    const r = lVal / 2;
    const m_total = mRoVal + cFracVal * mReVal;
    const l_B = (wVal - cVal) / 2;
    const l_C = (wVal + cVal) / 2;
    const l_D = wVal;

    const phiRad = (phiVal * Math.PI) / 180;
    
    const Cx = -m_total * r * (l_B + l_C * Math.cos(phiRad));
    const Cy = -m_total * r * (l_C * Math.sin(phiRad));
    
    const rbW = rbVal * wVal;
    const mD = rbW > 0 ? Math.sqrt(Cx*Cx + Cy*Cy) / rbW : 0;
    let thetaD = Math.atan2(Cy, Cx) * 180 / Math.PI;
    if (thetaD < 0) thetaD += 360;
    const thetaDRad = thetaD * Math.PI / 180;

    const Fx = -m_total * r * (l_C + l_B * Math.cos(phiRad)) / wVal;
    const Fy = -m_total * r * (l_B * Math.sin(phiRad)) / wVal;
    
    const mA = rbVal > 0 ? Math.sqrt(Fx*Fx + Fy*Fy) / rbVal : 0;
    let thetaA = Math.atan2(Fy, Fx) * 180 / Math.PI;
    if (thetaA < 0) thetaA += 360;
    const thetaARad = thetaA * Math.PI / 180;

    const isValid = wVal > 0 && cVal > 0 && lVal > 0 && rbVal > 0 && m_total > 0;

    return {
      isValid, wVal, cVal, lVal, mRoVal, mReVal, cFracVal, phiVal, rbVal,
      r, m_total, l_B, l_C, l_D,
      mD, thetaD, thetaDRad,
      mA, thetaA, thetaARad,
      phiRad
    };
  }, [W, C, L, m_ro, m_re, c_frac, phi, r_b]);

  // Generate Polygon Points
  const c0 = {x: 0, y: 0};
  const c1 = {x: calc.m_total * calc.r * calc.l_B, y: 0};
  const c2 = {x: c1.x + calc.m_total * calc.r * calc.l_C * Math.cos(calc.phiRad), y: c1.y + calc.m_total * calc.r * calc.l_C * Math.sin(calc.phiRad)};
  const c3 = c0;
  const couplePoints = [c0, c1, c2, c3];
  const coupleLabels = ["Couple B", "Couple C", "Couple D (Bal)"];
  const coupleColors = ["#ef4444", "#ef4444", "#10b981"];

  const f0 = {x: 0, y: 0};
  const f1 = {x: calc.m_total * calc.r, y: 0};
  const f2 = {x: f1.x + calc.m_total * calc.r * Math.cos(calc.phiRad), y: f1.y + calc.m_total * calc.r * Math.sin(calc.phiRad)};
  const f3 = {x: f2.x + calc.mD * calc.rbVal * Math.cos(calc.thetaDRad), y: f2.y + calc.mD * calc.rbVal * Math.sin(calc.thetaDRad)};
  const f4 = f0;
  const forcePoints = [f0, f1, f2, f3, f4];
  const forceLabels = ["Force B", "Force C", "Force D (Bal)", "Force A (Bal)"];
  const forceColors = ["#ef4444", "#ef4444", "#10b981", "#3b82f6"];

  const handleDownloadPDF = () => {
    if (!calc.isValid) return;
    generateLocomotiveReport({
      inputs: {
        W: Number(W) || 0,
        C: Number(C) || 0,
        L: Number(L) || 0,
        phi: Number(phi) || 0,
        m_ro: Number(m_ro) || 0,
        m_re: Number(m_re) || 0,
        c_frac: Number(c_frac) || 0,
        r_b: Number(r_b) || 0,
      },
      results: {
        m_total: calc.m_total,
        r: calc.r,
        mA: calc.mA,
        thetaA: calc.thetaA,
        mD: calc.mD,
        thetaD: calc.thetaD,
        wVal: calc.wVal,
        l_B: calc.l_B,
        l_C: calc.l_C,
        phiVal: calc.phiVal,
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Section: Inputs & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block">
        
        {/* Input Parameters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit print:hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Settings size={18} className="text-blue-600" />
              Locomotive Parameters
            </h2>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
              title="Open Unit Conversion & Reference Guide"
            >
              <HelpCircle size={13} className="text-blue-600" />
              <span>Unit Guide & Help</span>
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="loco-w-dist" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  Wheels Dist (W)
                  <InfoTooltip text="Distance between the two driving wheels (Plane A and Plane D). Used to calculate moments." />
                </label>
                <div className="relative">
                  <input id="loco-w-dist" aria-label="Distance between driving wheels W in meters" type="number" value={W === '' ? '' : W} onChange={e => setW(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">m</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="loco-c-dist" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  Cylinders Dist (C)
                  <InfoTooltip text="Distance between the two cylinders (Plane B and Plane C) where the driving force is applied." />
                </label>
                <div className="relative">
                  <input id="loco-c-dist" aria-label="Distance between cylinders C in meters" type="number" value={C === '' ? '' : C} onChange={e => setC(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">m</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="loco-l-dist" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  Stroke Length (L)
                  <InfoTooltip text="Total stroke length of the piston. The crank radius (r) is half of this value." />
                </label>
                <div className="relative">
                  <input id="loco-l-dist" aria-label="Stroke length L in meters" type="number" value={L === '' ? '' : L} onChange={e => setL(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">m</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="loco-phi-angle" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  Crank Angle Diff (φ)
                  <InfoTooltip text="Angle between the two cranks. Typically 90° for a standard 2-cylinder locomotive." />
                </label>
                <div className="relative">
                  <input id="loco-phi-angle" aria-label="Crank angle difference phi in degrees" type="number" value={phi === '' ? '' : phi} onChange={e => setPhi(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">°</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="loco-mro-mass" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  Rotating Mass / Cyl
                  <InfoTooltip text="Mass of the rotating parts per cylinder (e.g., crankpin) that needs full balancing." />
                </label>
                <div className="relative">
                  <input id="loco-mro-mass" aria-label="Rotating mass per cylinder in kilograms" type="number" value={m_ro === '' ? '' : m_ro} onChange={e => setM_ro(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">kg</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="loco-mre-mass" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  Reciprocating Mass / Cyl
                  <InfoTooltip text="Mass of the reciprocating parts per cylinder (e.g., piston, crosshead) causing alternating forces." />
                </label>
                <div className="relative">
                  <input id="loco-mre-mass" aria-label="Reciprocating mass per cylinder in kilograms" type="number" value={m_re === '' ? '' : m_re} onChange={e => setM_re(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">kg</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="loco-cfrac-val" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  Fraction Balanced (c)
                  <InfoTooltip text="Fraction (c) of reciprocating mass to balance (typically 0.5 to 0.67) to compromise between swaying couple and hammer blow." />
                </label>
                <div className="relative">
                  <input id="loco-cfrac-val" aria-label="Fraction of reciprocating mass to balance" type="number" step="0.01" value={c_frac === '' ? '' : c_frac} onChange={e => setC_frac(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="loco-rb-radius" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  Balancing Radius
                  <InfoTooltip text="Radial distance from the shaft center where the balancing masses will be attached to the wheels." />
                </label>
                <div className="relative">
                  <input id="loco-rb-radius" aria-label="Balancing radius in meters" type="number" value={r_b === '' ? '' : r_b} onChange={e => setR_b(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">m</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Calculator size={18} className="text-emerald-600" />
              Numerical Results
            </h2>
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md"
              >
                <Printer size={14} />
                Print
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={!calc.isValid}
                title={!calc.isValid ? "Enter valid parameters first" : "Download formal engineering report (PDF)"}
                className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md"
              >
                <Download size={14} className="text-emerald-600" />
                Download PDF
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Mass / Cylinder</div>
                <div className="text-2xl font-bold text-slate-800">{calc.isValid ? calc.m_total.toFixed(2) : '-'} <span className="text-sm font-medium text-slate-500">kg</span></div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cylinder Radius (r)</div>
                <div className="text-2xl font-bold text-slate-800">{calc.isValid ? calc.r.toFixed(3) : '-'} <span className="text-sm font-medium text-slate-500">m</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">Balancing Masses Required</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                  <div className="text-sm font-semibold text-blue-900 mb-2">Wheel 1 (Plane A)</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-blue-600/80 font-medium">Magnitude</div>
                      <div className="text-xl font-bold text-blue-700">{calc.isValid ? calc.mA.toFixed(2) : '-'} kg</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-blue-600/80 font-medium">Angle</div>
                      <div className="text-xl font-bold text-blue-700">{calc.isValid ? calc.thetaA.toFixed(1) : '-'}°</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                  <div className="text-sm font-semibold text-emerald-900 mb-2">Wheel 2 (Plane D)</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-emerald-600/80 font-medium">Magnitude</div>
                      <div className="text-xl font-bold text-emerald-700">{calc.isValid ? calc.mD.toFixed(2) : '-'} kg</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-emerald-600/80 font-medium">Angle</div>
                      <div className="text-xl font-bold text-emerald-700">{calc.isValid ? calc.thetaD.toFixed(1) : '-'}°</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Section: 4 Diagrams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:block">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col print:break-inside-avoid print:mt-6">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Layers size={16} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Plane Position Diagram</h3>
          </div>
          <div className="p-6 flex-1 flex items-center justify-center min-h-[250px] bg-slate-50/30">
            {calc.isValid ? (
              <PlaneDiagram W={calc.wVal} l_B={calc.l_B} l_C={calc.l_C} />
            ) : (
              <p className="text-sm text-slate-400 font-medium">Enter dimensions to view</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col print:break-inside-avoid print:mt-6">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Anchor size={16} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Space Diagram</h3>
          </div>
          <div className="p-6 flex-1 flex items-center justify-center min-h-[250px] bg-slate-50/30">
            {calc.isValid ? (
              <SpaceDiagram phi={calc.phiVal} thetaA={calc.thetaA} thetaD={calc.thetaD} />
            ) : (
              <p className="text-sm text-slate-400 font-medium">Enter dimensions to view</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col print:break-inside-avoid print:mt-6">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Box size={16} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Couple Polygon</h3>
          </div>
          <div className="p-6 flex-1 flex items-center justify-center min-h-[250px] bg-slate-50/30">
            {calc.isValid ? (
              <PolygonDiagram points={couplePoints} labels={coupleLabels} colors={coupleColors} />
            ) : (
              <p className="text-sm text-slate-400 font-medium">Enter dimensions to view</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col print:break-inside-avoid print:mt-6">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Force Polygon</h3>
          </div>
          <div className="p-6 flex-1 flex items-center justify-center min-h-[250px] bg-slate-50/30">
            {calc.isValid ? (
              <PolygonDiagram points={forcePoints} labels={forceLabels} colors={forceColors} />
            ) : (
              <p className="text-sm text-slate-400 font-medium">Enter dimensions to view</p>
            )}
          </div>
        </div>

      </div>

      {/* Unit Conversion & Balancing Quick-Reference Guide Modal */}
      <UnitConversionHelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)}
        currentMassUnit="kg"
        currentLengthUnit="m"
      />
    </div>
  );
}
