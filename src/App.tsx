/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, ArrowRight, Settings2, Info, Compass, Plus, X, Sparkles, Loader2, RotateCcw, 
  Download, FileSpreadsheet, Maximize2, Play, Pause, Eye, EyeOff, Copy, Check, AlertTriangle, 
  Palette, HelpCircle, Trash2, Printer, Pin, Upload, ShieldCheck, Activity, Disc, ArrowDown, 
  ChevronRight, Gauge, Layers, Scale, Ruler, ArrowUpDown, ArrowDownWideNarrow, ArrowUpNarrowWide 
} from 'lucide-react';

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center ml-1 align-middle">
    <HelpCircle size={12} className="text-slate-400 hover:text-slate-600 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-[100] whitespace-normal normal-case font-normal text-center pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);
import Markdown from 'react-markdown';
import { generateBalancingReport } from './generateBalancingReport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import UnitConversionHelpModal from './UnitConversionHelpModal';

interface Mass {
  id: number;
  mass: string;
  radius: string;
  angle: string;
  color?: string;
}

const defaultColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export function parseCSVToMasses(csvText: string): Mass[] {
  const lines = csvText
    .split(/\r\n|\n|\r/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    throw new Error('CSV file is empty or contains only comments.');
  }

  // Detect delimiter: evaluate commas, semicolons, tabs in first non-empty lines
  const sampleLines = lines.slice(0, Math.min(5, lines.length)).join('\n');
  const commaCount = (sampleLines.match(/,/g) || []).length;
  const semiCount = (sampleLines.match(/;/g) || []).length;
  const tabCount = (sampleLines.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount >= tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  }

  const parseRow = (rowStr: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        if (inQuotes && rowStr[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  // Find header row containing mass, radius, and angle
  let headerRowIndex = -1;
  let massIdx = -1;
  let radiusIdx = -1;
  let angleIdx = -1;
  let colorIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    const lowerCells = cells.map(c =>
      c.toLowerCase()
       .replace(/["']/g, '')
       .replace(/[\s_\-()°]/g, '')
    );

    const mIdx = lowerCells.findIndex(c => c === 'mass' || c.startsWith('mass') || c === 'm');
    const rIdx = lowerCells.findIndex(c => c === 'radius' || c.startsWith('radius') || c === 'r');
    const aIdx = lowerCells.findIndex(c => c === 'angle' || c.startsWith('angle') || c === 'theta' || c === 'deg' || c === 'phase');
    const cIdx = lowerCells.findIndex(c => c === 'color');

    if (mIdx !== -1 && rIdx !== -1 && aIdx !== -1 && mIdx !== rIdx && rIdx !== aIdx && mIdx !== aIdx) {
      headerRowIndex = i;
      massIdx = mIdx;
      radiusIdx = rIdx;
      angleIdx = aIdx;
      colorIdx = cIdx;
      break;
    }
  }

  const cleanNum = (raw: string): string => {
    if (!raw) return '';
    let val = raw.replace(/^["']|["']$/g, '').trim();
    if (delimiter === ';' && val.includes(',') && !val.includes('.')) {
      val = val.replace(',', '.');
    }
    const match = val.match(/[-+]?[0-9]*\.?[0-9]+/);
    return match ? match[0] : '';
  };

  const parsedMasses: Mass[] = [];

  if (headerRowIndex !== -1) {
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('final balancing') || line.toLowerCase().includes('sum of horizontal') || line.toLowerCase().includes('sum of vertical')) {
        break;
      }
      const cells = parseRow(line);
      if (cells.length <= Math.max(massIdx, radiusIdx, angleIdx)) continue;

      const massVal = cleanNum(cells[massIdx]);
      const radiusVal = cleanNum(cells[radiusIdx]);
      const angleVal = cleanNum(cells[angleIdx]);

      if (massVal !== '' || radiusVal !== '' || angleVal !== '') {
        const id = parsedMasses.length + 1;
        const color = (colorIdx !== -1 && cells[colorIdx]?.startsWith('#'))
          ? cells[colorIdx]
          : defaultColors[(id - 1) % defaultColors.length];

        parsedMasses.push({
          id,
          mass: massVal,
          radius: radiusVal,
          angle: angleVal,
          color,
        });
      }
    }
  } else {
    // No header row: parse direct numeric rows
    for (let i = 0; i < lines.length; i++) {
      const cells = parseRow(lines[i]);
      if (cells.length < 3) continue;
      const massVal = cleanNum(cells[0]);
      const radiusVal = cleanNum(cells[1]);
      const angleVal = cleanNum(cells[2]);

      if (massVal !== '' && radiusVal !== '' && angleVal !== '') {
        const id = parsedMasses.length + 1;
        parsedMasses.push({
          id,
          mass: massVal,
          radius: radiusVal,
          angle: angleVal,
          color: defaultColors[(id - 1) % defaultColors.length],
        });
      }
    }
  }

  if (parsedMasses.length === 0) {
    throw new Error("Could not find valid mass data in CSV. Ensure header columns include 'mass', 'radius', and 'angle' with numerical values.");
  }

  return parsedMasses;
}

const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

const formatNum = (num: number) => Number(num.toFixed(2));

export type VectorDisplayMode = 'magnitude' | 'components' | 'both';

const VectorDiagramSVG = ({ 
  steps, 
  sumH, 
  sumV, 
  resultantForce, 
  resultantAngleDeg,
  rotationOffset = 0,
  showAxes = true,
  showForces = true,
  showPolygon = true,
  showResultant = true,
  displayMode = 'both',
  showProjections = true,
  activeFocusId = null,
  lockedMassId = null,
  onMassClick,
  onMassHover,
  onVectorChange,
  isSimulating,
  sensitivityPoints = [],
  showSensitivityAnalysis = false,
  unitMode = 'standard',
  massUnit = 'kg',
  lengthUnit = 'm',
  rpm = ''
}: any) => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dragTransform, setDragTransform] = React.useState<{ scale: number, cx: number, cy: number } | null>(null);

  const points = [{ x: 0, y: 0 }];
  let curX = 0;
  let curY = 0;

  const rpmVal = parseFloat(rpm) || 0;
  const omega = (2 * Math.PI * rpmVal) / 60;

  const rotatedSteps = steps.map((s: any) => {
    const angle = (s.absoluteAngle + rotationOffset) % 360;
    const angleRad = (angle * Math.PI) / 180;
    const h = s.force * Math.cos(angleRad);
    const v = s.force * Math.sin(angleRad);

    let mKg = s.massVal || parseFloat(s.mass) || 0;
    if (massUnit === 'lbs') mKg *= 0.45359237;

    let rM = s.radiusVal || parseFloat(s.radius) || 0;
    if (lengthUnit === 'in') rM *= 0.0254;
    else if (lengthUnit === 'mm') rM /= 1000;
    else if (lengthUnit === 'cm') rM /= 100;

    const forceN = omega > 0 ? mKg * rM * omega * omega : (s.centrifugalForceN || 0);
    const hN = forceN * Math.cos(angleRad);
    const vN = forceN * Math.sin(angleRad);

    return {
      ...s,
      h,
      v,
      forceN,
      hN,
      vN
    };
  });

  if (showPolygon) {
    rotatedSteps.forEach((s: any) => {
      curX += (s.h || 0);
      curY += (s.v || 0);
      points.push({ x: curX, y: curY });
    });
  } else {
    // Just end point for resultant
    const angle = (resultantAngleDeg + rotationOffset) % 360;
    const angleRad = (angle * Math.PI) / 180;
    curX = resultantForce * Math.cos(angleRad);
    curY = resultantForce * Math.sin(angleRad);
    points.push({ x: curX, y: curY });
  }

  // Calculate bounds
  const padding = 60;
  const minX = Math.min(...points.map(p => p.x), 0);
  const maxX = Math.max(...points.map(p => p.x), 0);
  const minY = Math.min(...points.map(p => p.y), 0);
  const maxY = Math.max(...points.map(p => p.y), 0);

  const w = Math.max(maxX - minX, 0.001);
  const h = Math.max(maxY - minY, 0.001);
  
  const normScale = Math.min(400 / w, 400 / h);
  const normCx = -minX * normScale + padding + (400 - w * normScale) / 2;
  const normCy = maxY * normScale + padding + (400 - h * normScale) / 2;

  const scale = dragTransform ? dragTransform.scale : normScale;
  const cx = dragTransform ? dragTransform.cx : normCx;
  const cy = dragTransform ? dragTransform.cy : normCy;

  // Helper to ensure valid SVG coordinate
  const valid = (n: number) => isNaN(n) || !isFinite(n) ? 0 : n;

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>, index: number) => {
    if (isSimulating) return;
    e.stopPropagation();
    setDragIndex(index);
    setDragTransform({ scale: normScale, cx: normCx, cy: normCy });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragIndex === null || !svgRef.current || !dragTransform) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    const targetX_unscaled = (cursorPt.x - dragTransform.cx) / dragTransform.scale;
    const targetY_unscaled = -(cursorPt.y - dragTransform.cy) / dragTransform.scale;
    
    const tail = points[dragIndex];
    const new_h = targetX_unscaled - tail.x;
    const new_v = targetY_unscaled - tail.y;
    
    const newForce = Math.sqrt(new_h * new_h + new_v * new_v);
    let newAngleDeg = Math.atan2(new_v, new_h) * 180 / Math.PI;
    
    let trueAngleDeg = (newAngleDeg - rotationOffset) % 360;
    if (trueAngleDeg < 0) trueAngleDeg += 360;
    
    if (onVectorChange) {
      onVectorChange(dragIndex, newForce, trueAngleDeg);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragIndex !== null) {
      setDragIndex(null);
      setDragTransform(null);
    }
  };

  // Only remount animations when step count changes
  const svgKey = steps.length;

  return (
    <svg 
      key={svgKey} 
      ref={svgRef}
      width="100%" 
      height="100%" 
      viewBox="0 0 520 520" 
      className="w-full h-full max-w-[520px] mx-auto overflow-visible touch-none select-none"
      onClick={(e) => {
        // If clicking canvas background, unlock focus
        if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
          onMassClick?.(null);
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Grid Axes if requested */}
      {showAxes && (
        <g opacity="0.15" pointerEvents="none">
          <line x1="20" y1={cy} x2="500" y2={cy} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,4" />
          <line x1={cx} y1="20" x2={cx} y2="500" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,4" />
          {[50, 100, 150, 200, 250, 300, 350, 400].map((r) => (
            <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="#cbd5e1" strokeWidth="1" />
          ))}
        </g>
      )}

      {/* Draw polygon lines */}
      {showPolygon && rotatedSteps.map((step: any, index: number) => {
        const p1 = points[index];
        const p2 = points[index + 1];
        
        const x1 = valid(cx + p1.x * scale);
        const y1 = valid(cy - p1.y * scale);
        const x2 = valid(cx + p2.x * scale);
        const y2 = valid(cy - p2.y * scale);
        const stepColor = step.color || colors[index % colors.length];
        const isFocused = activeFocusId === step.id;
        const isLocked = lockedMassId === step.id;
        const isAnyFocused = activeFocusId !== null && activeFocusId !== undefined;
        const groupOpacity = isAnyFocused ? (isFocused ? 1 : 0.22) : 1;
        const mainStrokeWidth = isFocused ? 5 : 3;

        return (
          <g 
            key={step.id}
            opacity={groupOpacity}
            className="transition-all duration-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onMassClick?.(step.id);
            }}
            onPointerEnter={() => onMassHover?.(step.id)}
            onPointerLeave={() => onMassHover?.(null)}
          >
            {/* Illuminated glow underlay line when focused */}
            {isFocused && (
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={stepColor}
                strokeWidth={12}
                strokeLinecap="round"
                opacity={0.38}
                filter="url(#vector-glow)"
                pointerEvents="none"
              />
            )}

            {/* Orthogonal projection lines (H/V components) */}
            {showForces && showProjections && (displayMode === 'components' || displayMode === 'both') && (
              <g opacity={isFocused ? 0.95 : 0.65} pointerEvents="none">
                {/* Horizontal component: from (x1, y1) to (x2, y1) */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y1}
                  stroke={stepColor}
                  strokeWidth={isFocused ? "1.8" : "1.2"}
                  strokeDasharray="3,3"
                />
                {/* Vertical component: from (x2, y1) to (x2, y2) */}
                <line
                  x1={x2}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stepColor}
                  strokeWidth={isFocused ? "1.8" : "1.2"}
                  strokeDasharray="3,3"
                />
                {/* Right angle corner indicator if step is long enough */}
                {Math.abs(x2 - x1) > 16 && Math.abs(y2 - y1) > 16 && (
                  <path
                    d={`M ${x2 - Math.sign(x2 - x1 || 1) * 6} ${y1} L ${x2 - Math.sign(x2 - x1 || 1) * 6} ${y1 - Math.sign(y1 - y2 || 1) * 6} L ${x2} ${y1 - Math.sign(y1 - y2 || 1) * 6}`}
                    fill="none"
                    stroke={stepColor}
                    strokeWidth={isFocused ? "1.6" : "1"}
                    opacity="0.85"
                  />
                )}
              </g>
            )}

            <motion.line 
              x1={x1} y1={y1} x2={x2} y2={y2} 
              stroke={stepColor} 
              strokeWidth={mainStrokeWidth} 
              markerEnd="url(#arrowhead)" 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: index * 0.5, ease: "easeInOut" }}
            />

            {/* Focused / Locked halo ring indicator */}
            {isFocused && (
              <circle
                cx={x2}
                cy={y2}
                r="20"
                fill="none"
                stroke={stepColor}
                strokeWidth={isLocked ? "2.5" : "1.8"}
                strokeDasharray={isLocked ? "4,3" : "2,2"}
                className={isLocked ? "animate-pulse" : "animate-spin"}
                style={{ animationDuration: isLocked ? '2s' : '8s' }}
                pointerEvents="none"
              />
            )}

            {/* Label for vector, fades & scales in after line completes */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: (index + 1) * 0.5 - 0.1, ease: "easeOut" }}
            >
              <circle 
                id={`vec-m-${step.id}`} 
                cx={x2} 
                cy={y2} 
                r={isFocused ? "16" : "14"} 
                fill={isFocused ? "#eff6ff" : "white"} 
                stroke={stepColor} 
                strokeWidth={isFocused ? "2.5" : "1.5"} 
              />
              <text 
                x={x2} 
                y={y2} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fontSize={isFocused ? "13" : "12"} 
                fontWeight="bold" 
                fill={isFocused ? "#1e40af" : "#334155"}
              >
                m{step.id}
              </text>
              {isLocked && (
                <g transform={`translate(${x2 + 7}, ${y2 - 18})`} pointerEvents="none">
                  <circle cx="6" cy="6" r="7" fill="#2563eb" />
                  <text x="6" y="8.5" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">📌</text>
                </g>
              )}
            </motion.g>
            
      {/* Active unit HUD overlay tag */}
      <g opacity="0.9" pointerEvents="none" transform="translate(16, 26)">
        <rect 
          x="0" y="0" 
          width={unitMode === 'newtons' ? "152" : "135"} 
          height="22" 
          fill={unitMode === 'newtons' ? "#78350f" : "#0f172a"} 
          rx="6" 
          opacity="0.85" 
        />
        <text x="8" y="14" fill={unitMode === 'newtons' ? "#fde68a" : "#38bdf8"} fontSize="10" fontWeight="bold" fontFamily="monospace">
          {unitMode === 'newtons' 
            ? `FORCE: NEWTONS (N)${rpmVal > 0 ? ` @ ${rpmVal} RPM` : ''}` 
            : `UNBALANCE: ${massUnit}·${lengthUnit}`}
        </text>
      </g>
      {unitMode === 'newtons' && rpmVal === 0 && (
        <g pointerEvents="none" transform="translate(16, 52)">
          <rect x="0" y="0" width="280" height="20" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" rx="4" />
          <text x="8" y="13" fill="#92400e" fontSize="9.5" fontWeight="600">
            ⚠️ Specify RPM in parameters to view non-zero force in N
          </text>
        </g>
      )}

            {/* Vector force value / component label badge */}
            {showForces && (
              <motion.g
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: (index + 1) * 0.5 - 0.1, ease: "easeOut" }}
              >
                {displayMode === 'magnitude' ? (
                  <>
                    <rect 
                      x={valid((x1 + x2) / 2 - (isFocused ? (unitMode === 'newtons' ? 32 : 23) : (unitMode === 'newtons' ? 28 : 20)))} 
                      y={valid((y1 + y2) / 2 - (isFocused ? 13 : 11))} 
                      width={isFocused ? (unitMode === 'newtons' ? "64" : "46") : (unitMode === 'newtons' ? "56" : "40")} 
                      height={isFocused ? "26" : "22"} 
                      fill="white" 
                      rx="4" 
                      stroke={isFocused ? stepColor : "#cbd5e1"} 
                      strokeWidth={isFocused ? "1.8" : "1"}
                    />
                    <text 
                      x={valid((x1 + x2) / 2)} 
                      y={valid((y1 + y2) / 2 + 1)} 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fontSize={isFocused ? "12" : "11"} 
                      fontWeight={isFocused ? "bold" : "500"} 
                      fill={isFocused ? "#0f172a" : "#475569"}
                    >
                      {unitMode === 'newtons' 
                        ? `${formatNum(step.forceN)} N` 
                        : formatNum(step.force || 0)}
                    </text>
                  </>
                ) : displayMode === 'components' ? (
                  <>
                    <rect 
                      x={valid((x1 + x2) / 2 - (isFocused ? (unitMode === 'newtons' ? 48 : 41) : (unitMode === 'newtons' ? 44 : 38)))} 
                      y={valid((y1 + y2) / 2 - (isFocused ? 18 : 16))} 
                      width={isFocused ? (unitMode === 'newtons' ? "96" : "82") : (unitMode === 'newtons' ? "88" : "76")} 
                      height={isFocused ? "36" : "32"} 
                      fill="white" 
                      rx="5" 
                      stroke={stepColor} 
                      strokeWidth={isFocused ? "2" : "1.2"}
                      strokeOpacity={isFocused ? "1" : "0.5"}
                    />
                    <text 
                      x={valid((x1 + x2) / 2)} 
                      y={valid((y1 + y2) / 2 - 6)} 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fontSize={isFocused ? "10.5" : "10"} 
                      fontWeight="600" 
                      fill="#334155"
                    >
                      H: {unitMode === 'newtons' ? `${formatNum(step.hN)} N` : formatNum(step.h || 0)}
                    </text>
                    <text 
                      x={valid((x1 + x2) / 2)} 
                      y={valid((y1 + y2) / 2 + 7)} 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fontSize={isFocused ? "10.5" : "10"} 
                      fontWeight="600" 
                      fill="#334155"
                    >
                      V: {unitMode === 'newtons' ? `${formatNum(step.vN)} N` : formatNum(step.v || 0)}
                    </text>
                  </>
                ) : (
                  <>
                    <rect 
                      x={valid((x1 + x2) / 2 - (isFocused ? (unitMode === 'newtons' ? 62 : 51) : (unitMode === 'newtons' ? 56 : 47)))} 
                      y={valid((y1 + y2) / 2 - (isFocused ? 18 : 16))} 
                      width={isFocused ? (unitMode === 'newtons' ? "124" : "102") : (unitMode === 'newtons' ? "112" : "94")} 
                      height={isFocused ? "36" : "32"} 
                      fill="white" 
                      rx="5" 
                      stroke={isFocused ? stepColor : "#cbd5e1"} 
                      strokeWidth={isFocused ? "2" : "1"}
                    />
                    <text 
                      x={valid((x1 + x2) / 2)} 
                      y={valid((y1 + y2) / 2 - 6)} 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fontSize={isFocused ? "10.5" : "10"} 
                      fontWeight="bold" 
                      fill={isFocused ? "#0f172a" : "#1e293b"}
                    >
                      |F| = {unitMode === 'newtons' ? `${formatNum(step.forceN)} N` : formatNum(step.force || 0)}
                    </text>
                    <text 
                      x={valid((x1 + x2) / 2)} 
                      y={valid((y1 + y2) / 2 + 7)} 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fontSize={isFocused ? "9.5" : "9"} 
                      fontWeight="500"
                      fill={isFocused ? "#334155" : "#64748b"}
                    >
                      H:{unitMode === 'newtons' ? `${formatNum(step.hN)}N` : formatNum(step.h || 0)}  V:{unitMode === 'newtons' ? `${formatNum(step.vN)}N` : formatNum(step.v || 0)}
                    </text>
                  </>
                )}
              </motion.g>
            )}

            {/* DRAG HANDLE */}
            {!isSimulating && (
              <circle
                cx={x2} cy={y2} r={24}
                fill={dragIndex === index ? `${stepColor}30` : "transparent"}
                stroke={dragIndex === index ? stepColor : "transparent"}
                strokeWidth={2}
                strokeDasharray="4,2"
                className="cursor-move touch-none transition-colors"
                onPointerDown={(e) => handlePointerDown(e, index)}
                onPointerEnter={(e) => {
                  if (dragIndex === null) {
                    e.currentTarget.style.fill = `${stepColor}15`;
                    e.currentTarget.style.stroke = stepColor;
                  }
                }}
                onPointerLeave={(e) => {
                  if (dragIndex === null) {
                    e.currentTarget.style.fill = 'transparent';
                    e.currentTarget.style.stroke = 'transparent';
                  }
                }}
              />
            )}
          </g>
        );
      })}

      {/* Resultant Line */}
      {showResultant && (
        <>
          {(() => {
            const rotResultantAngleRad = ((resultantAngleDeg + rotationOffset) % 360) * Math.PI / 180;
            const rx2 = valid(cx + resultantForce * Math.cos(rotResultantAngleRad) * scale);
            const ry2 = valid(cy - resultantForce * Math.sin(rotResultantAngleRad) * scale);
            const delayOffset = showPolygon ? steps.length * 0.5 : 0;
            const resMidX = (cx + rx2) / 2;
            const resMidY = (cy + ry2) / 2;
            const resH = resultantForce * Math.cos(rotResultantAngleRad);
            const resV = resultantForce * Math.sin(rotResultantAngleRad);

            const isAnyFocused = activeFocusId !== null && activeFocusId !== undefined;
            const resultantOpacity = isAnyFocused ? 0.35 : 1;

            return (
              <g opacity={resultantOpacity} className="transition-opacity duration-200">
                {/* Resultant orthogonal projection lines (H/V) */}
                {showProjections && (displayMode === 'components' || displayMode === 'both') && (
                  <g opacity="0.65" pointerEvents="none">
                    <line
                      x1={valid(cx)}
                      y1={valid(cy)}
                      x2={rx2}
                      y2={valid(cy)}
                      stroke="#ef4444"
                      strokeWidth="1.2"
                      strokeDasharray="3,3"
                    />
                    <line
                      x1={rx2}
                      y1={valid(cy)}
                      x2={rx2}
                      y2={ry2}
                      stroke="#ef4444"
                      strokeWidth="1.2"
                      strokeDasharray="3,3"
                    />
                    {Math.abs(rx2 - cx) > 16 && Math.abs(ry2 - cy) > 16 && (
                      <path
                        d={`M ${rx2 - Math.sign(rx2 - cx || 1) * 6} ${cy} L ${rx2 - Math.sign(rx2 - cx || 1) * 6} ${cy - Math.sign(cy - ry2 || 1) * 6} L ${rx2} ${cy - Math.sign(cy - ry2 || 1) * 6}`}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1"
                        opacity="0.8"
                      />
                    )}
                  </g>
                )}

                <motion.line 
                  x1={valid(cx)} y1={valid(cy)} 
                  x2={rx2} y2={ry2} 
                  stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" 
                  markerEnd="url(#arrowhead-red)" 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: delayOffset, ease: "easeInOut" }}
                />
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: delayOffset + 0.6, ease: "easeOut" }}
                >
                  {displayMode === 'magnitude' ? (
                    <>
                      <rect 
                        x={valid(resMidX - 28)} 
                        y={valid(resMidY - 12)} 
                        width="56" 
                        height="24" 
                        fill="white" 
                        rx="4" 
                        stroke="#ef4444" 
                      />
                      <text 
                        x={valid(resMidX)} 
                        y={valid(resMidY + 1)} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        fontSize="11" 
                        fontWeight="bold" 
                        fill="#ef4444"
                      >
                        R={formatNum(resultantForce || 0)}
                      </text>
                    </>
                  ) : displayMode === 'components' ? (
                    <>
                      <rect 
                        x={valid(resMidX - 42)} 
                        y={valid(resMidY - 17)} 
                        width="84" 
                        height="34" 
                        fill="white" 
                        rx="5" 
                        stroke="#ef4444" 
                      />
                      <text 
                        x={valid(resMidX)} 
                        y={valid(resMidY - 6)} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        fontSize="10" 
                        fontWeight="bold" 
                        fill="#ef4444"
                      >
                        Rx: {formatNum(resH || 0)}
                      </text>
                      <text 
                        x={valid(resMidX)} 
                        y={valid(resMidY + 7)} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        fontSize="10" 
                        fontWeight="bold" 
                        fill="#ef4444"
                      >
                        Ry: {formatNum(resV || 0)}
                      </text>
                    </>
                  ) : (
                    <>
                      <rect 
                        x={valid(resMidX - 52)} 
                        y={valid(resMidY - 17)} 
                        width="104" 
                        height="34" 
                        fill="white" 
                        rx="5" 
                        stroke="#ef4444" 
                      />
                      <text 
                        x={valid(resMidX)} 
                        y={valid(resMidY - 6)} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        fontSize="10.5" 
                        fontWeight="bold" 
                        fill="#ef4444"
                      >
                        R = {formatNum(resultantForce || 0)}
                      </text>
                      <text 
                        x={valid(resMidX)} 
                        y={valid(resMidY + 7)} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        fontSize="9" 
                        fontWeight="600" 
                        fill="#b91c1c"
                      >
                        Hx:{formatNum(resH || 0)}  Vy:{formatNum(resV || 0)}
                      </text>
                    </>
                  )}
                  
                  {/* Sensitivity Envelope Display */}
                  {showSensitivityAnalysis && sensitivityPoints && sensitivityPoints.length > 0 && (
                    <g>
                      {sensitivityPoints.map((pt: any, i: number) => {
                        const ptForce = Math.sqrt(pt.h * pt.h + pt.v * pt.v);
                        const ptAngleDeg = Math.atan2(pt.v, pt.h) * 180 / Math.PI;
                        const rotPtAngleRad = ((ptAngleDeg + rotationOffset) % 360) * Math.PI / 180;
                        const rx = valid(cx + ptForce * Math.cos(rotPtAngleRad) * scale);
                        const ryy = valid(cy - ptForce * Math.sin(rotPtAngleRad) * scale);
                        
                        return (
                          <circle 
                            key={`sim-${i}`} 
                            cx={rx} 
                            cy={ryy} 
                            r="2.5" 
                            fill="#f59e0b" 
                            opacity="0.5" 
                            className="transition-all duration-300"
                          />
                        );
                      })}
                      {/* Highlight the average radius of the scatter to form a zone */}
                      <circle 
                        cx={rx2} 
                        cy={ry2} 
                        r={Math.max(12, resultantForce * 0.05 * scale)} 
                        fill="transparent" 
                        stroke="#f59e0b" 
                        strokeWidth="1.5" 
                        strokeDasharray="4,3" 
                        opacity="0.8"
                      />
                    </g>
                  )}
                </motion.g>
              </g>
            );
          })()}
        </>
      )}

      {/* Origin */}
      <circle cx={valid(cx)} cy={valid(cy)} r="14" fill="white" stroke="#64748b" strokeWidth="1.5" />
      <text x={valid(cx)} y={valid(cy)} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#334155">O</text>

      <defs>
        <filter id="vector-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#64748b" />
        </marker>
        <marker id="arrowhead-red" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#ef4444" />
        </marker>
        <marker id="arrowhead-green" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#22c55e" />
        </marker>
      </defs>
    </svg>
  );
};

const SpaceDiagramSVG = ({ 
  steps, 
  balRadius, 
  balancingMass, 
  balancingAngleDeg, 
  idealAngle, 
  tolerance, 
  massUnit, 
  lengthUnit, 
  onBalancingAngleChange,
  rotationOffset = 0,
  showAxes = true,
  showIndividualMasses = true,
  showBalancingMass = true,
  showToleranceCone = true,
  showAngularGrid = true,
  activeFocusId = null,
  lockedMassId = null,
  onMassClick,
  onMassHover
}: any) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const maxR = Math.max(...steps.map((s: any) => s.radius || 0), balRadius || 0, 0.001);
  const cx = 260;
  const cy = 260;
  const scale = 180 / maxR;

  const valid = (n: number) => isNaN(n) || !isFinite(n) ? 0 : n;

  let diff = Math.abs((idealAngle || 0) - (balancingAngleDeg || 0)) % 360;
  diff = diff > 180 ? 360 - diff : diff;
  const isWithinTolerance = tolerance > 0 && diff <= tolerance;
  const strokeColor = isWithinTolerance ? "#22c55e" : "#ef4444";
  const fillColor = isWithinTolerance ? (isDragging ? "#dcfce7" : "white") : (isDragging ? "#fee2e2" : "white");
  const arrowId = isWithinTolerance ? "url(#arrowhead-green)" : "url(#arrowhead-red)";

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()!.inverse());
    
    const dx = svgP.x - cx;
    const dy = cy - svgP.y;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    
    // Adjust for rotation offset
    let adjustedAngle = (angle - rotationOffset) % 360;
    if (adjustedAngle < 0) adjustedAngle += 360;
    
    if (onBalancingAngleChange) onBalancingAngleChange(adjustedAngle);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <svg 
      ref={svgRef} 
      width="100%" 
      height="100%" 
      viewBox="0 0 520 520" 
      className="w-full max-w-[520px] mx-auto overflow-visible touch-none select-none"
      onClick={(e) => {
        if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
          onMassClick?.(null);
        }
      }}
    >
      {/* Axes */}
      {showAxes && (
        <>
          <line x1="20" y1={cy} x2="500" y2={cy} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,4" />
          <line x1={cx} y1="20" x2={cx} y2="500" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,4" />
        </>
      )}

      {/* Angular Grid if requested */}
      {showAngularGrid && (
        <g opacity="0.15" pointerEvents="none">
          {/* Concentric circles */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio) => (
            <circle
              key={ratio}
              cx={cx}
              cy={cy}
              r={180 * ratio}
              fill="none"
              stroke="#64748b"
              strokeWidth="1"
            />
          ))}
          {/* Angular rays */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = cx + Math.cos(rad) * 180;
            const y = cy - Math.sin(rad) * 180;
            return (
              <line
                key={angle}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            );
          })}
        </g>
      )}

      {/* Masses */}
      {showIndividualMasses && steps.map((step: any, index: number) => {
        const rad = (((step.absoluteAngle || 0) + rotationOffset) % 360) * Math.PI / 180;
        const x = valid(cx + Math.cos(rad) * (step.radius || 0) * scale);
        const y = valid(cy - Math.sin(rad) * (step.radius || 0) * scale);
        const stepColor = step.color || colors[index % colors.length];
        const isFocused = activeFocusId === step.id;
        const isLocked = lockedMassId === step.id;
        const isAnyFocused = activeFocusId !== null && activeFocusId !== undefined;
        const groupOpacity = isAnyFocused ? (isFocused ? 1 : 0.22) : 1;
        const mainStrokeWidth = isFocused ? 4.5 : 2.5;

        return (
          <g 
            key={step.id} 
            opacity={groupOpacity} 
            className="transition-all duration-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onMassClick?.(step.id);
            }}
            onPointerEnter={() => onMassHover?.(step.id)}
            onPointerLeave={() => onMassHover?.(null)}
          >
            {/* Halo pulse ring for focused mass */}
            {isFocused && (
              <circle
                cx={x}
                cy={y}
                r="22"
                fill="none"
                stroke={stepColor}
                strokeWidth={isLocked ? "2.5" : "1.8"}
                strokeDasharray={isLocked ? "4,3" : "2,2"}
                className={isLocked ? "animate-pulse" : "animate-spin"}
                style={{ animationDuration: isLocked ? '2s' : '8s' }}
                pointerEvents="none"
              />
            )}
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={stepColor} strokeWidth={mainStrokeWidth} markerEnd="url(#arrowhead)" />
            <circle id={`spa-m-${step.id}`} cx={x} cy={y} r={isFocused ? "18" : "16"} fill={isFocused ? "#eff6ff" : "white"} stroke={stepColor} strokeWidth={isFocused ? "3" : "2"} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={isFocused ? "13" : "12"} fontWeight="bold" fill={isFocused ? "#1e40af" : "#334155"}>
              m{step.id}
            </text>
            {isLocked && (
              <g transform={`translate(${x + 8}, ${y - 20})`} pointerEvents="none">
                <circle cx="6" cy="6" r="7" fill="#2563eb" />
                <text x="6" y="8.5" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">📌</text>
              </g>
            )}
            <text x={x} y={valid(y - 26)} textAnchor="middle" fontSize={isFocused ? "12" : "11"} fontWeight={isFocused ? "bold" : "normal"} fill={isFocused ? "#0f172a" : "#475569"}>
              {step.mass || 0}{massUnit}, {step.radius || 0}{lengthUnit}
            </text>
          </g>
        );
      })}

      {/* Tolerance Cone */}
      {showToleranceCone && (() => {
        if (tolerance > 0 && balRadius > 0) {
          const r = (balRadius || 0) * scale;
          const minRad = (((idealAngle + rotationOffset - tolerance) % 360) * Math.PI) / 180;
          const maxRad = (((idealAngle + rotationOffset + tolerance) % 360) * Math.PI) / 180;
          
          const x1 = valid(cx + Math.cos(minRad) * r);
          const y1 = valid(cy - Math.sin(minRad) * r);
          
          const x2 = valid(cx + Math.cos(maxRad) * r);
          const y2 = valid(cy - Math.sin(maxRad) * r);
          
          return (
            <path 
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2} Z`}
              fill="#22c55e"
              fillOpacity="0.1"
              stroke="#22c55e"
              strokeWidth="1"
              strokeDasharray="4,4"
              pointerEvents="none"
            />
          );
        }
        return null;
      })()}

      {/* Balancing Mass */}
      {showBalancingMass && (() => {
        const balRad = (((balancingAngleDeg || 0) + rotationOffset) % 360) * Math.PI / 180;
        const x = valid(cx + Math.cos(balRad) * (balRadius || 0) * scale);
        const y = valid(cy - Math.sin(balRad) * (balRadius || 0) * scale);
        return (
          <g 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="cursor-pointer"
          >
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={strokeColor} strokeWidth="2.5" strokeDasharray="6,4" markerEnd={arrowId} />
            <circle cx={x} cy={y} r="16" fill={fillColor} stroke={strokeColor} strokeWidth="2" className="transition-colors" />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill={strokeColor} pointerEvents="none">
              mb
            </text>
            <text x={x} y={valid(y + 25)} textAnchor="middle" fontSize="11" fontWeight="bold" fill={strokeColor} pointerEvents="none">
              {formatNum(balancingMass || 0)}{massUnit} at {formatNum(balancingAngleDeg || 0)}°
            </text>
          </g>
        );
      })()}

      <circle cx={cx} cy={cy} r="6" fill="#334155" pointerEvents="none" />
    </svg>
  );
};

class ErrorBoundary extends React.Component<any, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 min-h-screen whitespace-pre-wrap">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <p className="font-mono text-sm">{this.state.error?.toString()}</p>
          <pre className="mt-4 font-mono text-xs">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children; 
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

import LocomotiveBalancing from './LocomotiveBalancing';

function AppContent() {
  const [calcMode, setCalcMode] = useState<'single_plane' | 'locomotive'>('single_plane');

  const [masses, setMasses] = useState<Mass[]>([
    { id: 1, mass: '', radius: '', angle: '', color: defaultColors[0] },
    { id: 2, mass: '', radius: '', angle: '', color: defaultColors[1] },
    { id: 3, mass: '', radius: '', angle: '', color: defaultColors[2] },
    { id: 4, mass: '', radius: '', angle: '', color: defaultColors[3] },
  ]);
  const [balRadius, setBalRadius] = useState<string>('');
  const [angleTolerance, setAngleTolerance] = useState<string>('5');
  
  const [massUnit, setMassUnit] = useState<'kg' | 'lbs'>('kg');
  const [lengthUnit, setLengthUnit] = useState<'m' | 'in' | 'mm' | 'cm'>('m');
  const [manualBalAngle, setManualBalAngle] = useState<number | null>(null);
  const [opinion, setOpinion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [opinionError, setOpinionError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showSensitivityAnalysis, setShowSensitivityAnalysis] = useState(false);
  const [enableCentrifugal, setEnableCentrifugal] = useState(false);
  const [rpm, setRpm] = useState<string>('');
  const [barChartSort, setBarChartSort] = useState<'id' | 'desc' | 'asc'>('id');

  const handleCycleChartSort = () => {
    setBarChartSort((prev) => {
      if (prev === 'id') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'id';
    });
  };

  // CSV File Upload & Status State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [csvStatus, setCsvStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  React.useEffect(() => {
    if (csvStatus) {
      const timer = setTimeout(() => setCsvStatus(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [csvStatus]);

  // Help & Unit Conversion Guide Modal State
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Global key listener for '?' or 'h' to open Help/Unit Guide
  React.useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === '?' || (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault();
        setShowHelpModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Active modal preview state: 'vector' | 'space' | null
  const [activePreviewModal, setActivePreviewModal] = useState<'vector' | 'space' | null>(null);

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [rotationOffset, setRotationOffset] = useState(0);

  // Vector Diagram Layer Toggles & Display Modes
  const [vecShowAxes, setVecShowAxes] = useState(true);
  const [vecShowForces, setVecShowForces] = useState(true);
  const [vecShowPolygon, setVecShowPolygon] = useState(true);
  const [vecShowResultant, setVecShowResultant] = useState(true);
  const [vecDisplayMode, setVecDisplayMode] = useState<VectorDisplayMode>('both');
  const [vecShowProjections, setVecShowProjections] = useState(true);
  const [vecAutoCycle, setVecAutoCycle] = useState(false);
  const [vecUnitMode, setVecUnitMode] = useState<'standard' | 'newtons'>('standard');

  // Auto-cycle vector display mode
  React.useEffect(() => {
    if (!vecAutoCycle) return;
    const interval = setInterval(() => {
      setVecDisplayMode((prev) => {
        if (prev === 'magnitude') return 'components';
        if (prev === 'components') return 'both';
        return 'magnitude';
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [vecAutoCycle]);

  // Interactive Mass Highlighting & Locked Focus State
  const [lockedMassId, setLockedMassId] = useState<number | null>(null);
  const [hoveredMassId, setHoveredMassId] = useState<number | null>(null);
  const activeFocusId = hoveredMassId ?? lockedMassId;

  const handleMassClick = (id: number | null) => {
    if (id === null) {
      setLockedMassId(null);
      return;
    }
    setLockedMassId((prev) => (prev === id ? null : id));
  };

  const handleMassHover = (id: number | null) => {
    setHoveredMassId(id);
  };

  const handleClearFocus = () => {
    setLockedMassId(null);
    setHoveredMassId(null);
  };

  // Space Diagram Layer Toggles
  const [spaShowAxes, setSpaShowAxes] = useState(true);
  const [spaShowIndividualMasses, setSpaShowIndividualMasses] = useState(true);
  const [spaShowBalancingMass, setSpaShowBalancingMass] = useState(true);
  const [spaShowToleranceCone, setSpaShowToleranceCone] = useState(true);
  const [spaShowAngularGrid, setSpaShowAngularGrid] = useState(true);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearAllMasses = () => {
    setMasses([
      { id: 1, mass: '', radius: '', angle: '', color: defaultColors[0] }
    ]);
    setShowClearConfirm(false);
  };

  React.useEffect(() => {
    let animId: number;
    const tick = () => {
      setRotationOffset((prev) => (prev + 1.2) % 360);
      animId = requestAnimationFrame(tick);
    };
    if (isSimulating) {
      animId = requestAnimationFrame(tick);
    } else {
      setRotationOffset(0);
    }
    return () => cancelAnimationFrame(animId);
  }, [isSimulating]);

  const resultsRef = React.useRef<HTMLDivElement>(null);
  const workspaceRef = React.useRef<HTMLDivElement>(null);

  const scrollToResults = () => {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const scrollToWorkspace = () => {
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const loadExampleCase = () => {
    setMassUnit('kg');
    setLengthUnit('m');
    setBalRadius('0.25');
    setAngleTolerance('5');
    setEnableCentrifugal(true);
    setRpm('1500');
    setMasses([
      { id: 1, mass: '12', radius: '0.20', angle: '0', color: defaultColors[0] },
      { id: 2, mass: '16', radius: '0.15', angle: '60', color: defaultColors[1] },
      { id: 3, mass: '18', radius: '0.25', angle: '135', color: defaultColors[2] },
      { id: 4, mass: '15', radius: '0.30', angle: '270', color: defaultColors[3] },
    ]);
    setManualBalAngle(null);
    setOpinion(null);
    setOpinionError(null);
    setLockedMassId(null);
    setHoveredMassId(null);
    scrollToWorkspace();
  };

  const resetToDefaults = () => {
    setMassUnit('kg');
    setLengthUnit('m');
    setBalRadius('');
    setAngleTolerance('5');
    setEnableCentrifugal(false);
    setRpm('');
    setMasses([
      { id: 1, mass: '', radius: '', angle: '', color: defaultColors[0] },
      { id: 2, mass: '', radius: '', angle: '', color: defaultColors[1] },
      { id: 3, mass: '', radius: '', angle: '', color: defaultColors[2] },
      { id: 4, mass: '', radius: '', angle: '', color: defaultColors[3] },
    ]);
    setManualBalAngle(null);
    setOpinion(null);
    setOpinionError(null);
    setLockedMassId(null);
    setHoveredMassId(null);
  };

  const toggleMassUnit = (unit: 'kg' | 'lbs') => {
    if (massUnit === unit) return;
    const factor = unit === 'lbs' ? 2.20462 : 1 / 2.20462;
    setMasses(masses.map(m => ({ 
      ...m, 
      mass: m.mass === '' ? '' : Number((parseFloat(m.mass) * factor).toFixed(3)).toString() 
    })));
    setMassUnit(unit);
  };

  const toggleLengthUnit = (newUnit: 'm' | 'in' | 'mm' | 'cm') => {
    if (lengthUnit === newUnit) return;
    
    let toMetersFactor = 1;
    if (lengthUnit === 'in') toMetersFactor = 1 / 39.3701;
    if (lengthUnit === 'mm') toMetersFactor = 1 / 1000;
    if (lengthUnit === 'cm') toMetersFactor = 1 / 100;

    let fromMetersFactor = 1;
    if (newUnit === 'in') fromMetersFactor = 39.3701;
    if (newUnit === 'mm') fromMetersFactor = 1000;
    if (newUnit === 'cm') fromMetersFactor = 100;

    const factor = toMetersFactor * fromMetersFactor;
    
    setMasses(masses.map(m => ({ 
      ...m, 
      radius: m.radius === '' ? '' : Number((parseFloat(m.radius) * factor).toFixed(3)).toString() 
    })));
    setBalRadius(balRadius === '' ? '' : Number((parseFloat(balRadius) * factor).toFixed(3)).toString());
    setLengthUnit(newUnit);
  };

  const isValidNumber = (val: string) => {
    if (val === undefined || val === null) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    const num = Number(val);
    return !isNaN(num);
  };

  const calculations = useMemo(() => {
    let hasErrors = false;
    
    // Check balRadius and angleTolerance
    if (!isValidNumber(balRadius) || parseFloat(balRadius) <= 0) {
      hasErrors = true;
    }
    if (!isValidNumber(angleTolerance) || parseFloat(angleTolerance) < 0) {
      hasErrors = true;
    }

    // Check masses
    for (let i = 0; i < masses.length; i++) {
      const m = masses[i];
      if (!isValidNumber(m.mass) || !isValidNumber(m.radius)) {
        hasErrors = true;
      }
      if (!isValidNumber(m.angle)) {
        hasErrors = true;
      }
    }

    if (hasErrors) {
      return {
        hasErrors: true,
        steps: [],
        sumH: 0,
        sumV: 0,
        resultantForce: 0,
        resultantAngleDeg: 0,
        balancingForce: 0,
        balancingMass: 0,
        balancingAngleDeg: 0,
        sensitivityPoints: [],
        thresholds: { massWarning: 0, massCritical: 0, unbalanceWarning: 0, unbalanceCritical: 0 }
      };
    }

    let sumH = 0;
    let sumV = 0;

    const rpmVal = parseFloat(rpm) || 0;
    const omega = (enableCentrifugal && rpmVal > 0) ? (2 * Math.PI * rpmVal) / 60 : 0;

    const steps = masses.map((m) => {
      const mMass = parseFloat(m.mass) || 0;
      const mRad = parseFloat(m.radius) || 0;
      const mAng = parseFloat(m.angle) || 0;
      
      // Normalize angle
      let angle = mAng % 360;
      if (angle < 0) angle += 360;
      const angleRad = (angle * Math.PI) / 180;
      const force = mMass * mRad;
      const h = force * Math.cos(angleRad);
      const v = force * Math.sin(angleRad);

      let massKg = mMass;
      if (massUnit === 'lbs') massKg = mMass * 0.45359237;

      let radiusM = mRad;
      if (lengthUnit === 'in') radiusM = mRad * 0.0254;
      else if (lengthUnit === 'mm') radiusM = mRad / 1000;
      else if (lengthUnit === 'cm') radiusM = mRad / 100;

      const centrifugalForceN = omega > 0 ? massKg * radiusM * omega * omega : 0;

      sumH += h;
      sumV += v;

      return {
        ...m,
        massVal: mMass,
        radiusVal: mRad,
        absoluteAngle: angle,
        force,
        h,
        v,
        centrifugalForceN,
        color: m.color || defaultColors[(m.id - 1) % defaultColors.length]
      };
    });

    const resultantForce = Math.sqrt(sumH * sumH + sumV * sumV);
    
    // Calculate angle in radians
    let resultantAngleRad = Math.atan2(sumV, sumH);
    if (resultantAngleRad < 0) {
      resultantAngleRad += 2 * Math.PI;
    }
    const resultantAngleDeg = (resultantAngleRad * 180) / Math.PI;

    // Balancing force is equal and opposite
    const balancingForce = resultantForce;
    const balRadiusVal = parseFloat(balRadius) || 0;
    const balancingMass = balRadiusVal > 0 ? balancingForce / balRadiusVal : 0;
    const balancingAngleDeg = (resultantAngleDeg + 180) % 360;

    // Calculate Thresholds for conditional formatting
    let totalSystemMass = 0;
    let sumRadii = 0;
    steps.forEach(step => {
      totalSystemMass += step.massVal;
      sumRadii += step.radiusVal;
    });
    const avgRadius = steps.length > 0 ? sumRadii / steps.length : 1;

    // Warning if required mass > 10% of total mass, Critical if > 25%
    const massWarning = totalSystemMass * 0.10;
    const massCritical = totalSystemMass * 0.25;

    const unbalanceWarning = massWarning * avgRadius;
    const unbalanceCritical = massCritical * avgRadius;

    // Sensitivity Analysis (±5% Force, ±2° Angle) Monte Carlo Simulation
    const sensitivityPoints: { h: number, v: number }[] = [];
    for (let i = 0; i < 150; i++) {
      let simH = 0;
      let simV = 0;
      steps.forEach(step => {
        // ±5% variation in force (represents mass/radius uncertainty)
        const variationForce = step.force * (1 + (Math.random() * 0.1 - 0.05));
        // ±2° variation in placement angle
        const variationAngle = step.absoluteAngle + (Math.random() * 4 - 2);
        const rad = variationAngle * Math.PI / 180;
        simH += variationForce * Math.cos(rad);
        simV += variationForce * Math.sin(rad);
      });
      sensitivityPoints.push({ h: simH, v: simV });
    }

    return {
      hasErrors: false,
      steps,
      sumH,
      sumV,
      resultantForce,
      resultantAngleDeg,
      balancingForce,
      balancingMass,
      balancingAngleDeg,
      sensitivityPoints,
      thresholds: {
        massWarning,
        massCritical,
        unbalanceWarning,
        unbalanceCritical
      }
    };
  }, [masses, balRadius, angleTolerance, rpm, enableCentrifugal]);

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  
  const sortedBarChartData = useMemo(() => {
    const mapped = calculations.steps.map((step) => ({
      id: step.id,
      name: `Mass ${step.id}`,
      force: Number((step.force || 0).toFixed(4)),
      formattedForce: formatNum(step.force || 0),
      rawForce: step.force || 0,
      color: step.color,
    }));

    if (barChartSort === 'desc') {
      return [...mapped].sort((a, b) => b.rawForce - a.rawForce);
    }
    if (barChartSort === 'asc') {
      return [...mapped].sort((a, b) => a.rawForce - b.rawForce);
    }
    return mapped;
  }, [calculations.steps, barChartSort]);

  const updateMass = (id: number, field: keyof Mass, value: string) => {
    setMasses(masses.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleVectorChange = (index: number, newForce: number, newAngle: number) => {
    setMasses(prev => {
      const next = [...prev];
      const m = next[index];
      const r = parseFloat(m.radius);
      if (!isNaN(r) && r !== 0) {
        m.mass = (newForce / r).toFixed(3);
      } else {
        m.radius = "1";
        m.mass = newForce.toFixed(3);
      }
      m.angle = newAngle.toFixed(1);
      return next;
    });
  };

  const addMass = () => {
    const nextId = masses.length > 0 ? Math.max(...masses.map(m => m.id)) + 1 : 1;
    const colorIndex = (nextId - 1) % defaultColors.length;
    setMasses([...masses, { id: nextId, mass: '', radius: '', angle: '', color: defaultColors[colorIndex] }]);
    scrollToResults();
  };

  const removeMass = (id: number) => {
    if (masses.length > 1) {
      setMasses(masses.filter(m => m.id !== id));
    }
  };

  const formatNum = (num: number) => Number(num.toFixed(3));
  
  const downloadPDF = () => {
    if (calculations.hasErrors) return;
    generateBalancingReport({
      masses,
      steps: calculations.steps,
      calculations,
      config: {
        massUnit,
        lengthUnit,
        balRadius,
        angleTolerance,
        enableCentrifugal,
        rpm,
      },
      opinion,
    });
  };

  const exportCSV = () => {
    if (calculations.hasErrors) return;

    const rows = [
      ['System Configuration'],
      ['Parameter', 'Value', 'Unit'],
      ['Mass Unit', massUnit, ''],
      ['Length Unit', lengthUnit, ''],
      ['Target Balancing Radius', balRadius || '0', lengthUnit],
      ['Angle Tolerance', angleTolerance || '0', 'degrees'],
      ...(enableCentrifugal ? [['Rotor Speed', rpm || '0', 'RPM']] : []),
      [],
      ['Step-by-Step Resolution'],
      ['Plane', `Mass (${massUnit})`, `Radius (${lengthUnit})`, 'Angle (°)', `Force (${massUnit}*${lengthUnit})`, 'H-Comp', 'V-Comp', ...(enableCentrifugal ? ['Centrifugal Force (N)'] : [])],
      ...calculations.steps.map(s => [
        `M${s.id}`,
        s.mass,
        s.radius,
        s.absoluteAngle,
        formatNum(s.force),
        formatNum(s.h),
        formatNum(s.v),
        ...(enableCentrifugal ? [formatNum(s.centrifugalForceN || 0)] : [])
      ]),
      [],
      ['Final Balancing Results'],
      ['Parameter', 'Value', 'Unit'],
      ['Sum of Horizontal Forces (ΣH)', formatNum(calculations.sumH), `${massUnit}*${lengthUnit}`],
      ['Sum of Vertical Forces (ΣV)', formatNum(calculations.sumV), `${massUnit}*${lengthUnit}`],
      ['Resultant Unbalance (R)', formatNum(calculations.resultantForce), `${massUnit}*${lengthUnit}`],
      ['Resultant Angle', formatNum(calculations.resultantAngleDeg), 'degrees'],
      ['Required Balancing Mass (mb)', formatNum(calculations.balancingMass), massUnit],
      ['Required Balancing Angle (θb)', formatNum(calculations.balancingAngleDeg), 'degrees'],
    ];

    const csvContent = rows.map(e => e.map(val => {
      const stringVal = String(val ?? '');
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    }).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "balancing_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim().length === 0) {
          throw new Error("The selected file is empty.");
        }

        const parsedMasses = parseCSVToMasses(text);
        if (parsedMasses.length === 0) {
          throw new Error("No valid mass entries found. Please ensure columns: 'mass', 'radius', and 'angle'.");
        }

        setMasses(parsedMasses);
        setLockedMassId(null);
        setHoveredMassId(null);
        setCsvStatus({
          type: 'success',
          message: `Successfully loaded ${parsedMasses.length} masses from "${file.name}".`
        });
        scrollToResults();
      } catch (err: any) {
        setCsvStatus({
          type: 'error',
          message: err.message || "Failed to process CSV file."
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setCsvStatus({
        type: 'error',
        message: "Failed to read the file. Please check file permissions and try again."
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const template = "mass,radius,angle\n2.5,0.4,30\n3.0,0.5,120\n1.8,0.3,210\n4.2,0.6,300\n";
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "balancing_mass_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSVG = (type: 'vector' | 'space') => {
    // We can select the svg element inside the active dialog or main page
    const svgEl = document.querySelector(`.preview-svg-${type} svg`);
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);
    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1990\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    source = '<?xml version="1.0" encoding="utf-8"?>\n' + source;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const link = document.createElement("a");
    link.href = url;
    link.download = `balancing_${type}_diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyResults = async () => {
    try {
      const copyText = `Balancing Mass: ${formatNum(calculations.balancingMass)} ${massUnit}
Mounting Angle: ${formatNum(calculations.balancingAngleDeg)}°`;
      await navigator.clipboard.writeText(copyText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const fetchOpinion = async () => {
    scrollToResults();
    setIsAnalyzing(true);
    setOpinionError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masses,
          balRadius,
          resultantForce: calculations.resultantForce,
          resultantAngleDeg: calculations.resultantAngleDeg,
          balancingMass: calculations.balancingMass,
          balancingAngleDeg: calculations.balancingAngleDeg,
          massUnit,
          lengthUnit
        })
      });
      if (!res.ok) {
        let errMsg = 'Failed to fetch opinion';
        try {
          const errorData = await res.json();
          errMsg = errorData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      setOpinion(data.analysis);
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setOpinionError("Network error: Could not reach the AI service. The API quota might be exceeded, causing the request to drop.");
      } else {
        setOpinionError(err.message || "An error occurred");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 lg:p-10 print:bg-white print:p-0 print:m-0 overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Modern Engineering Header */}
        <header className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:border-none print:p-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center text-white shadow-sm shrink-0">
              <Disc size={24} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Roller Balance Calculator
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={12} className="text-blue-600" />
                  ISO 1940
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                High-precision multi-mass and locomotive dynamic rotational balancing engine
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            {/* Unit System Toggles */}
            <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <div className="flex items-center">
                <span className="text-[11px] font-bold text-slate-600 uppercase px-2">Mass</span>
                <div className="flex bg-white rounded-lg p-0.5 border border-slate-200/60 shadow-xs">
                  <button 
                    type="button"
                    onClick={() => toggleMassUnit('kg')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${massUnit === 'kg' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                  >
                    kg
                  </button>
                  <button 
                    type="button"
                    onClick={() => toggleMassUnit('lbs')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${massUnit === 'lbs' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                  >
                    lbs
                  </button>
                </div>
              </div>

              <div className="h-4 w-px bg-slate-300"></div>

              <div className="flex items-center">
                <span className="text-[11px] font-bold text-slate-600 uppercase px-2">Length</span>
                <div className="flex bg-white rounded-lg p-0.5 border border-slate-200/60 shadow-xs">
                  {(['m', 'in', 'cm', 'mm'] as const).map((unit) => (
                    <button 
                      key={unit}
                      type="button"
                      onClick={() => toggleLengthUnit(unit)}
                      className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${lengthUnit === unit ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                title="Open Unit Conversion & Balancing Quick-Reference Guide (Press ? or H)"
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-2 rounded-lg border border-blue-200/80 shadow-xs"
              >
                <HelpCircle size={14} className="text-blue-600" />
                <span>Unit Guide & Help</span>
                <span className="text-[10px] font-mono text-blue-600 bg-blue-200/60 px-1 py-0.5 rounded hidden sm:inline font-bold">?</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload CSV containing 'mass', 'radius', and 'angle' columns"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors px-3 py-2 rounded-lg border border-slate-200/80 bg-white shadow-xs"
              >
                <Upload size={14} className="text-blue-600" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>
              <button
                type="button"
                onClick={downloadPDF}
                disabled={calculations.hasErrors}
                title={calculations.hasErrors ? "Resolve errors first to download report" : "Export ISO-standard PDF engineering report"}
                className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 transition-colors px-3 py-2 rounded-lg border border-slate-200/80 bg-white shadow-xs"
              >
                <Download size={14} className="text-blue-600" />
                <span className="hidden sm:inline">Report (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors px-2.5 py-2 rounded-lg border border-slate-200/80 bg-white shadow-xs"
                title="Print current calculation dashboard"
              >
                <Printer size={14} />
              </button>
              <button
                type="button"
                onClick={resetToDefaults}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-red-700 hover:bg-red-50 transition-colors px-2.5 py-2 rounded-lg border border-slate-200/80 bg-white shadow-xs"
                title="Reset all inputs to defaults"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Professional Hero Section */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 md:p-10 text-white shadow-lg relative overflow-hidden print:hidden border border-slate-800">
          {/* Subtle background decorative technical blueprint circles */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full border border-blue-500/10 pointer-events-none"></div>
          <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full border border-blue-400/20 pointer-events-none"></div>
          <div className="absolute right-20 bottom-20 w-32 h-32 rounded-full border border-dashed border-indigo-400/30 pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono tracking-wider uppercase text-blue-300 bg-blue-500/20 px-2.5 py-1 rounded-md border border-blue-400/30">
                Rotordynamics & Vibration Mitigation
              </span>
              <span className="text-[11px] font-mono tracking-wider uppercase text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                Single-Plane & Multi-Plane Balancing
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Roller & Rotor Dynamic Balance Calculator
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Analytically resolve orthogonal centrifugal force vectors (<span className="text-blue-200 font-mono">ΣH, ΣV</span>) across multiple rotating mass planes. Determine the required counter-balancing mass magnitude (<span className="text-blue-200 font-mono">m_b = R/r_b</span>) and opposite mounting angle (<span className="text-blue-200 font-mono">θ_b = α + 180°</span>) for high-speed shafts and industrial rollers.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={scrollToWorkspace}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Start Calculation</span>
                <ArrowDown size={16} />
              </button>

              <button
                type="button"
                onClick={loadExampleCase}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/15 flex items-center gap-2 cursor-pointer"
                title="Populate standard 4-mass rotating system with 1500 RPM dynamic model"
              >
                <Activity size={16} className="text-blue-400" />
                <span>Load Benchmark Example</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all border border-white/15 flex items-center gap-2 cursor-pointer"
                title="Upload CSV data file with mass, radius, and angle"
              >
                <Upload size={16} className="text-indigo-300" />
                <span>Upload CSV File</span>
              </button>
            </div>

            {/* 4 Capability Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] font-mono text-blue-300 uppercase">01. Vector Resolution</p>
                <p className="text-xs text-slate-300 mt-0.5">Orthogonal ΣH & ΣV decomposition</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] font-mono text-blue-300 uppercase">02. Counterweight</p>
                <p className="text-xs text-slate-300 mt-0.5">Precise m_b & 180° phase inversion</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] font-mono text-blue-300 uppercase">03. Speed Physics</p>
                <p className="text-xs text-slate-300 mt-0.5">Centrifugal forces at operational RPM</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] font-mono text-blue-300 uppercase">04. Engineering PDF</p>
                <p className="text-xs text-slate-300 mt-0.5">Formal report & vector SVG blueprints</p>
              </div>
            </div>
          </div>
        </section>

        {/* Calculation Mode Switcher */}
        <div className="flex justify-center print:hidden">
          <div className="inline-flex bg-slate-200/70 p-1 rounded-2xl border border-slate-300/60 shadow-xs">
            <button 
              type="button"
              onClick={() => setCalcMode('single_plane')}
              className={`px-5 sm:px-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${calcMode === 'single_plane' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <Disc size={16} className={calcMode === 'single_plane' ? 'text-blue-600' : 'text-slate-500'} />
              <span>Rotating Mass Balancer (Single Plane)</span>
            </button>
            <button 
              type="button"
              onClick={() => setCalcMode('locomotive')}
              className={`px-5 sm:px-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${calcMode === 'locomotive' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <Layers size={16} className={calcMode === 'locomotive' ? 'text-blue-600' : 'text-slate-500'} />
              <span>Partial Balancing of Locomotives</span>
            </button>
          </div>
        </div>

        {calcMode === 'locomotive' ? (
          <LocomotiveBalancing />
        ) : (
          <>
        {/* Workspace Form & Results */}
        <div ref={workspaceRef} id="calculator-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
          
          {/* Inputs Column */}
          <section className="lg:col-span-5 space-y-6 print:hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-6">
              
              {/* Card Header */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Settings2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">System Parameters</h2>
                    <p className="text-xs text-slate-600 font-medium">{masses.length} Active Mass Plane{masses.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Hidden file input for CSV uploading */}
                  <input
                    ref={fileInputRef}
                    id="mass-csv-file-input"
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    aria-label="Upload CSV file containing mass, radius, and angle"
                    onChange={handleCSVUpload}
                  />
                  <button
                    type="button"
                    onClick={exportCSV}
                    disabled={calculations.hasErrors}
                    title={calculations.hasErrors ? "Resolve errors first to export CSV" : "Export table to CSV format"}
                    className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg"
                  >
                    <FileSpreadsheet size={13} />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadExampleCase}
                    title="Load standard engineering example"
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200/60"
                  >
                    <Activity size={13} />
                    <span>Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetToDefaults}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg"
                    title="Reset to empty inputs"
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* CSV Upload Status Notification */}
              {csvStatus && (
                <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs font-medium border ${
                  csvStatus.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                    : 'bg-red-50 text-red-900 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {csvStatus.type === 'success' ? (
                      <Check size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-600 shrink-0" />
                    )}
                    <span>{csvStatus.message}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setCsvStatus(null)} 
                    className="text-slate-500 hover:text-slate-800 ml-2"
                    aria-label="Dismiss CSV status"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Group 1: Mass Planes Inputs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <span>1. Rotating Mass Planes</span>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      title="Open Unit Conversion & Reference Guide"
                      className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 font-semibold px-2 py-0.5 rounded-md border border-blue-200/60 transition-colors flex items-center gap-1 normal-case text-[11px]"
                    >
                      <Scale size={11} />
                      <span>{massUnit}, {lengthUnit}, deg (Convert)</span>
                    </button>
                  </h3>
                  <button
                    type="button"
                    onClick={downloadCSVTemplate}
                    className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline font-semibold"
                    title="Download template CSV with mass,radius,angle columns"
                  >
                    CSV Template
                  </button>
                </div>
                
                <div className="space-y-3.5">
                  {masses.map((m, index) => {
                    const stepData = calculations.steps.find(s => s.id === m.id);
                    const force = stepData?.force || 0;
                    const isWarning = !calculations.hasErrors && calculations.thresholds.unbalanceWarning > 0 && force >= calculations.thresholds.unbalanceWarning;
                    const isCritical = !calculations.hasErrors && calculations.thresholds.unbalanceCritical > 0 && force >= calculations.thresholds.unbalanceCritical;

                    return (
                    <div 
                      key={m.id} 
                      className={`p-4 rounded-xl border transition-all relative ${
                        isCritical 
                          ? 'bg-red-50/40 border-red-200' 
                          : isWarning 
                            ? 'bg-amber-50/40 border-amber-200' 
                            : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200/70'
                      }`}
                    >
                      {masses.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeMass(m.id)}
                          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Mass"
                          aria-label={`Remove Mass ${m.id}`}
                        >
                          <X size={15} />
                        </button>
                      )}
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <label 
                            htmlFor={`mass-color-${m.id}`}
                            className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer border border-slate-200 hover:scale-105 transition-transform relative shadow-2xs"
                            style={{ backgroundColor: m.color || defaultColors[index % defaultColors.length] }}
                            title="Customize Vector Color"
                          >
                            <input 
                              id={`mass-color-${m.id}`}
                              type="color" 
                              aria-label={`Color for Mass ${m.id}`}
                              value={m.color || defaultColors[index % defaultColors.length]}
                              onChange={(e) => updateMass(m.id, 'color', e.target.value)}
                              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                            />
                          </label>
                          <span className="text-sm font-bold text-slate-800">
                            Mass Plane {m.id}
                          </span>
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-100/80 px-2 py-0.5 rounded-md" title={`Critical: High Unbalance Contribution (${formatNum(force)} ${massUnit}·${lengthUnit})`}>
                              <AlertTriangle size={11} className="text-red-600" />
                              Critical
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md" title={`Warning: Elevated Unbalance Contribution (${formatNum(force)} ${massUnit}·${lengthUnit})`}>
                              <AlertTriangle size={11} className="text-amber-600" />
                              Elevated
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label htmlFor={`mass-magnitude-${m.id}`} className="text-xs text-slate-700 mb-1 flex items-center font-semibold">
                            Mass ({massUnit})
                            <InfoTooltip text="Magnitude of the rotating mass (m) causing centrifugal force." />
                          </label>
                          <input 
                            id={`mass-magnitude-${m.id}`}
                            type="number" 
                            step="any"
                            aria-label={`Mass ${m.id} magnitude in ${massUnit}`}
                            placeholder="e.g. 5"
                            value={m.mass}
                            onChange={(e) => updateMass(m.id, 'mass', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 font-mono tabular-nums ${
                              !isValidNumber(m.mass) 
                                ? 'bg-red-50/60 border-red-300 focus:ring-red-500' 
                                : 'bg-white border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                          />
                        </div>
                        <div>
                          <label htmlFor={`mass-radius-${m.id}`} className="text-xs text-slate-700 mb-1 flex items-center font-semibold">
                            Radius ({lengthUnit})
                            <InfoTooltip text="Distance (r) from the axis of rotation to the mass center." />
                          </label>
                          <input 
                            id={`mass-radius-${m.id}`}
                            type="number" 
                            step="any"
                            aria-label={`Mass ${m.id} radius in ${lengthUnit}`}
                            placeholder="e.g. 0.2"
                            value={m.radius}
                            onChange={(e) => updateMass(m.id, 'radius', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 font-mono tabular-nums ${
                              !isValidNumber(m.radius) 
                                ? 'bg-red-50/60 border-red-300 focus:ring-red-500' 
                                : 'bg-white border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label htmlFor={`mass-angle-${m.id}`} className="text-xs text-slate-700 mb-1 flex items-center font-semibold">
                            Angle (θ°)
                            <InfoTooltip text="Angular position (θ) of the mass relative to the reference axis (0°)." />
                          </label>
                          <input 
                            id={`mass-angle-${m.id}`}
                            type="number" 
                            step="any"
                            aria-label={`Mass ${m.id} angle in degrees`}
                            placeholder="e.g. 45"
                            value={m.angle}
                            onChange={(e) => updateMass(m.id, 'angle', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 font-mono tabular-nums ${
                              !isValidNumber(m.angle) 
                                ? 'bg-red-50/60 border-red-300 focus:ring-red-500' 
                                : 'bg-white border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>

                {/* Form Toolbar Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={addMass}
                    className="flex-1 min-w-[130px] py-2.5 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                  >
                    <Plus size={16} />
                    <span>Add Mass Entry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3.5 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
                    title="Upload a CSV file containing columns for 'mass', 'radius', and 'angle'"
                  >
                    <Upload size={15} className="text-blue-600" />
                    <span>Upload CSV</span>
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="py-2.5 px-3 flex items-center justify-center text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
                      title="Clear All Masses"
                      aria-label="Clear all mass entries"
                    >
                      <Trash2 size={16} />
                    </button>
                    {showClearConfirm && (
                      <div className="absolute bottom-full right-0 mb-2 w-64 bg-white p-4 rounded-xl shadow-xl border border-slate-200 z-50">
                        <p className="text-slate-800 text-xs font-semibold mb-3 text-left">Clear all mass entries and reset to one row?</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowClearConfirm(false)}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-center transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              clearAllMasses();
                              setShowClearConfirm(false);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg text-center transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Group 2: Counter-Balance & Dynamic Parameters */}
              <div className="pt-5 border-t border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  2. Counter-Balance & Dynamic Parameters
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bal-radius-input" className="text-xs text-slate-700 font-semibold mb-1 flex items-center">
                      Placement Radius ({lengthUnit})
                      <InfoTooltip text="Radial distance where the final balancing mass will be attached to counteract the unbalance." />
                    </label>
                    <input 
                      id="bal-radius-input"
                      type="number" 
                      step="any"
                      aria-label={`Placement radius in ${lengthUnit}`}
                      placeholder="e.g. 0.25"
                      value={balRadius}
                      onChange={(e) => setBalRadius(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 font-mono tabular-nums ${
                        !isValidNumber(balRadius) || parseFloat(balRadius) <= 0
                          ? 'bg-red-50/60 border-red-300 focus:ring-red-500 text-red-900'
                          : 'bg-white border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label htmlFor="bal-angle-tolerance-input" className="text-xs text-slate-700 font-semibold mb-1 flex items-center">
                      Angle Tolerance (±°)
                      <InfoTooltip text="Acceptable angular deviation for the balancing mass placement. Used to render the green tolerance sector." />
                    </label>
                    <input 
                      id="bal-angle-tolerance-input"
                      type="number" 
                      step="any"
                      aria-label="Balancing angle tolerance in degrees"
                      placeholder="e.g. 5"
                      value={angleTolerance}
                      onChange={(e) => setAngleTolerance(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 font-mono tabular-nums ${
                        !isValidNumber(angleTolerance) || parseFloat(angleTolerance) < 0
                          ? 'bg-red-50/60 border-red-300 focus:ring-red-500 text-red-900'
                          : 'bg-white border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Additional Toggles */}
                <div className="space-y-2.5 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group select-none p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      aria-label="Toggle sensitivity analysis simulate ±5% error"
                      checked={showSensitivityAnalysis} 
                      onChange={() => setShowSensitivityAnalysis(!showSensitivityAnalysis)} 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">
                        Sensitivity Analysis Simulation
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Simulate ±5% manufacturing deviations on unbalance vectors
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group select-none p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      aria-label="Toggle centrifugal force calculation"
                      checked={enableCentrifugal} 
                      onChange={() => setEnableCentrifugal(!enableCentrifugal)} 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">
                        Centrifugal Dynamic Force (N)
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Compute physical force F = m·r·ω² at operating speed
                      </span>
                    </div>
                  </label>
                  
                  {enableCentrifugal && (
                    <div className="pl-7 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label htmlFor="rotor-speed-rpm-input" className="block text-xs font-bold text-slate-700 mb-1">
                        Rotor Operating Speed (RPM)
                      </label>
                      <input 
                        id="rotor-speed-rpm-input"
                        type="number" 
                        step="any"
                        aria-label="Rotor Speed in RPM"
                        value={rpm}
                        onChange={(e) => setRpm(e.target.value)}
                        placeholder="e.g. 1500"
                        className={`w-full sm:w-2/3 px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 font-mono tabular-nums ${
                          !isValidNumber(rpm) || parseFloat(rpm) < 0
                            ? 'bg-red-50 border-red-300 focus:ring-red-500 text-red-900'
                            : 'bg-white border-slate-200 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Results Column */}
          <section ref={resultsRef} className="lg:col-span-7 space-y-6 print:block">
            
            {calculations.hasErrors ? (
              <div className="bg-red-50 rounded-2xl shadow-sm border border-red-200 p-8 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[380px]">
                <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
                  <AlertTriangle size={28} />
                </div>
                <h3 className="text-lg font-bold text-red-900 mb-2">Input Parameter Attention Required</h3>
                <p className="text-red-800 font-medium text-sm max-w-md mx-auto leading-relaxed">
                  Please ensure each mass plane has valid positive numbers for mass, radius, and absolute angle (0°–360°), and specify a placement radius greater than zero. Highlighted fields require adjustment before calculation can execute.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={loadExampleCase}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                  >
                    Load Working Benchmark
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Executive Balance Status Banner */}
                {(() => {
                  const isCritical = calculations.resultantForce >= calculations.thresholds.unbalanceCritical;
                  const isWarning = calculations.resultantForce >= calculations.thresholds.unbalanceWarning;
                  const isEquilibrium = calculations.resultantForce < 0.001;

                  return (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
                      isCritical 
                        ? 'bg-red-50/80 border-red-200 text-red-900'
                        : isWarning 
                          ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isCritical ? 'bg-red-600 text-white' : isWarning ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {isCritical ? <AlertTriangle size={18} /> : isWarning ? <AlertTriangle size={18} /> : <ShieldCheck size={20} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold tracking-wider uppercase">
                            {isCritical ? 'Critical Unbalance Level' : isWarning ? 'Elevated Unbalance Warning' : 'Dynamic Equilibrium'}
                          </p>
                          <p className="text-xs opacity-90">
                            {isCritical 
                              ? 'Counter-balance correction is required to prevent severe bearing vibration.'
                              : isWarning 
                                ? 'Unbalance exceeds recommended thresholds. Counter-balancing mass advised.'
                                : 'Resultant unbalance is within acceptable operating tolerances.'
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={downloadPDF}
                          disabled={calculations.hasErrors}
                          className="px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-800 text-xs font-bold shadow-2xs border border-slate-200/80 transition-colors flex items-center gap-1.5"
                          title="Download ISO-compliant PDF engineering report"
                        >
                          <Download size={13} className="text-blue-600" />
                          <span>PDF Spec</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyResults}
                          className="px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-800 text-xs font-bold shadow-2xs border border-slate-200/80 transition-colors flex items-center gap-1.5"
                          title="Copy balancing mass and angle to clipboard"
                        >
                          {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 3 Prominent Result Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card 1: Resultant Unbalance */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-amber-500"></div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Resultant Unbalance (R)</p>
                      <div className="flex items-baseline gap-1.5 my-2">
                        <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                          {formatNum(calculations.resultantForce)}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">{massUnit}·{lengthUnit}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600 flex justify-between">
                      <span>ΣH: {formatNum(calculations.sumH)}</span>
                      <span>ΣV: {formatNum(calculations.sumV)}</span>
                    </div>
                  </div>

                  {/* Card 2: Required Balancing Mass */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Required Balancing Mass (m_b)</p>
                      <div className="flex items-baseline gap-1.5 my-2">
                        <span className="text-3xl sm:text-4xl font-extrabold text-blue-700 font-mono tabular-nums tracking-tight">
                          {formatNum(calculations.balancingMass)}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">{massUnit}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      Mounting radius: <span className="font-mono font-semibold text-slate-800">{balRadius || '0'} {lengthUnit}</span>
                    </div>
                  </div>

                  {/* Card 3: Mounting Angle */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Mounting Angle (θ_b)</p>
                      <div className="flex items-baseline gap-1 my-2">
                        <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                          {formatNum(calculations.balancingAngleDeg)}
                        </span>
                        <span className="text-2xl font-bold text-slate-600">°</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
                      <span>Opposite unbalance (+180°)</span>
                      <span className="font-mono text-slate-700">α = {formatNum(calculations.resultantAngleDeg)}°</span>
                    </div>
                  </div>
                </div>

            {/* Step by step table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:break-inside-avoid print:mt-6">
              <div className="p-6 border-b border-slate-200 flex items-center gap-2 bg-slate-50/50">
                <Info size={20} className="text-slate-500" />
                <h2 className="text-lg font-semibold">Step-by-Step Resolution</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Plane</th>
                      <th className="px-6 py-4">Mass ({massUnit})</th>
                      <th className="px-6 py-4">Radius ({lengthUnit})</th>
                      <th className="px-6 py-4">Angle (θ)</th>
                      <th className="px-6 py-4">Force ({massUnit}·{lengthUnit})</th>
                      <th className="px-6 py-4">H-Comp</th>
                      <th className="px-6 py-4">V-Comp</th>
                      {enableCentrifugal && <th className="px-6 py-4 whitespace-nowrap">Centrifugal Force (N)</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {calculations.steps.map((step) => {
                      const hasInvalidRadius = !isValidNumber(step.radius) || parseFloat(step.radius) <= 0;
                      return (
                        <tr 
                          key={step.id} 
                          className={`transition-colors ${hasInvalidRadius ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50/50'}`}
                        >
                          <td className="px-6 py-4 font-medium flex items-center gap-2">
                            M{step.id}
                            {hasInvalidRadius && (
                              <span title="Invalid or zero radius">
                                <AlertTriangle size={14} className="text-red-500" />
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">{step.mass} {massUnit}</td>
                          <td className="px-6 py-4">
                            <span className={hasInvalidRadius ? 'text-red-600 font-medium' : ''}>
                              {step.radius} {lengthUnit}
                            </span>
                          </td>
                          <td className="px-6 py-4">{step.absoluteAngle}°</td>
                          <td className="px-6 py-4 text-slate-500">{formatNum(step.force)}</td>
                          <td className="px-6 py-4 text-slate-500">{formatNum(step.h)}</td>
                          <td className="px-6 py-4 text-slate-500">{formatNum(step.v)}</td>
                          {enableCentrifugal && <td className="px-6 py-4 text-slate-500">{formatNum(step.centrifugalForceN || 0)} N</td>}
                        </tr>
                      );
                    })}
                    <tr className="bg-blue-50/50 font-medium border-t-2 border-slate-200">
                      <td colSpan={5} className="px-6 py-4 text-right">Resultant (Σ):</td>
                      <td className="px-6 py-4 text-blue-700">{formatNum(calculations.sumH)}</td>
                      <td className="px-6 py-4 text-blue-700">{formatNum(calculations.sumV)}</td>
                      {enableCentrifugal && <td className="px-6 py-4"></td>}
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-200 text-sm text-slate-600 space-y-3">
                <div className="flex items-start gap-4">
                  <ArrowRight size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p>
                    <strong className="font-semibold text-slate-900">Resultant Unbalance (R):</strong> 
                    {' '} √({formatNum(calculations.sumH)}² + {formatNum(calculations.sumV)}²) = 
                    {' '} <span className={`font-semibold transition-colors ${calculations.resultantForce >= calculations.thresholds.unbalanceCritical ? 'text-red-600 bg-red-50 px-1.5 py-0.5 rounded ring-1 ring-red-200' : calculations.resultantForce >= calculations.thresholds.unbalanceWarning ? 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded ring-1 ring-amber-200' : 'text-slate-900'}`}>{formatNum(calculations.resultantForce)} {massUnit}·{lengthUnit}</span>
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <ArrowRight size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p>
                    <strong className="font-semibold text-slate-900">Resultant Angle (α):</strong> 
                    {' '} tan⁻¹({formatNum(calculations.sumV)} / {formatNum(calculations.sumH)}) = 
                    {' '} <span className="font-semibold text-slate-900">{formatNum(calculations.resultantAngleDeg)}°</span>
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <ArrowRight size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p>
                    <strong className="font-semibold text-slate-900">Balancing Mass (m_b):</strong> 
                    {' '} R / r_b = {formatNum(calculations.resultantForce)} / {balRadius} = 
                    {' '} <span className={`font-semibold transition-colors ${calculations.balancingMass >= calculations.thresholds.massCritical ? 'text-red-600 bg-red-50 px-1.5 py-0.5 rounded ring-1 ring-red-200' : calculations.balancingMass >= calculations.thresholds.massWarning ? 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded ring-1 ring-amber-200' : 'text-slate-900'}`}>{formatNum(calculations.balancingMass)} {massUnit}</span>
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <ArrowRight size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p>
                    <strong className="font-semibold text-slate-900">Balancing Angle (θ_b):</strong> 
                    {' '} α + 180° = {formatNum(calculations.resultantAngleDeg)}° + 180° = 
                    {' '} <span className="font-semibold text-slate-900">{formatNum(calculations.balancingAngleDeg)}°</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Governing Equations Reference */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center gap-2 bg-slate-50/50">
                <Calculator size={20} className="text-indigo-500" />
                <h2 className="text-lg font-semibold">Governing Equations Reference</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="font-medium text-slate-700 mb-3 text-sm">1. Resolving Components</h3>
                  <div className="space-y-2 font-mono text-sm text-slate-600">
                    <p>ΣH = Σ(m × r × cos θ)</p>
                    <p>ΣV = Σ(m × r × sin θ)</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="font-medium text-slate-700 mb-3 text-sm">2. Resultant & Mass</h3>
                  <div className="space-y-2 font-mono text-sm text-slate-600">
                    <p>R = √(ΣH² + ΣV²)</p>
                    <p>m_b = R / r_b</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="font-medium text-slate-700 mb-3 text-sm">3. Balancing Angle Position</h3>
                  <div className="space-y-2 font-mono text-sm text-slate-600">
                    <p>θ' = tan⁻¹(ΣV / ΣH)</p>
                    <p>θ_b = 180° + θ'</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Unbalance Force Contribution Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:break-inside-avoid print:mt-6">
              <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Calculator size={20} className="text-slate-500" />
                  <h2 className="text-lg font-semibold">Unbalance Force Contributions</h2>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  {/* Sort cycle toggle button */}
                  <button
                    type="button"
                    onClick={handleCycleChartSort}
                    title={
                      barChartSort === 'id'
                        ? 'Current Sort: Mass ID (Natural) — Click to sort by Magnitude (Highest first)'
                        : barChartSort === 'desc'
                        ? 'Current Sort: Magnitude (Highest first) — Click to sort by Magnitude (Lowest first)'
                        : 'Current Sort: Magnitude (Lowest first) — Click to sort by Mass ID (Natural)'
                    }
                    aria-label="Toggle unbalance contributions sort order"
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                      barChartSort !== 'id'
                        ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100/70 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {barChartSort === 'desc' ? (
                      <ArrowDownWideNarrow size={13} className="text-blue-600" />
                    ) : barChartSort === 'asc' ? (
                      <ArrowUpNarrowWide size={13} className="text-blue-600" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-500" />
                    )}
                    <span>
                      Sort:{' '}
                      {barChartSort === 'desc'
                        ? 'Mag ↓'
                        : barChartSort === 'asc'
                        ? 'Mag ↑'
                        : 'ID'}
                    </span>
                  </button>

                  {lockedMassId !== null && (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-2.5 py-1 rounded-full shadow-xs animate-in fade-in duration-200">
                      <Pin size={12} className="text-blue-600 fill-blue-600" />
                      <span className="font-semibold">Mass {lockedMassId} Locked</span>
                      <button
                        type="button"
                        onClick={handleClearFocus}
                        className="ml-1 p-0.5 hover:bg-blue-200/60 rounded-full transition-colors"
                        title="Clear locked focus"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {hoveredMassId !== null && hoveredMassId !== lockedMassId && (
                    <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium animate-in fade-in duration-150">
                      Previewing Mass {hoveredMassId}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-medium px-2.5 py-1 bg-slate-100 rounded-full">
                    Unit: {massUnit}·{lengthUnit}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-slate-600">
                    This chart compares the individual unbalance force contribution (mass × radius) of each plane.
                    Click a bar to lock focus onto that mass in the vector diagram.
                  </p>
                  {lockedMassId !== null && (
                    <button
                      type="button"
                      onClick={handleClearFocus}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex-shrink-0 ml-3"
                    >
                      Clear Focus
                    </button>
                  )}
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sortedBarChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const isThisLocked = lockedMassId === data.id;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-lg shadow-md border border-slate-800 text-xs font-sans">
                                <div className="flex items-center justify-between gap-3 mb-1">
                                  <p className="font-semibold text-slate-200">{data.name}</p>
                                  {isThisLocked && (
                                    <span className="text-[10px] bg-blue-500/30 text-blue-300 border border-blue-400/40 px-1.5 py-0.5 rounded font-medium">
                                      Locked
                                    </span>
                                  )}
                                </div>
                                <p>Unbalance Force: <span className="font-bold text-blue-400">{data.formattedForce || data.force}</span> {massUnit}·{lengthUnit}</p>
                                <p className="text-[10px] text-slate-400 mt-1 italic">
                                  {isThisLocked ? 'Click bar again to unlock' : 'Click bar to lock focus in diagram'}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="force" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={50}
                        isAnimationActive={true}
                        animationDuration={600}
                        animationEasing="ease-out"
                        animationBegin={0}
                      >
                        {sortedBarChartData.map((item, index) => {
                          const step = calculations.steps.find((s) => s.id === item.id);
                          const baseColor = item.color || (step?.color || colors[index % colors.length]);
                          const isFocused = activeFocusId === item.id;
                          const isLocked = lockedMassId === item.id;
                          const isAnyFocused = activeFocusId !== null;
                          const opacity = isAnyFocused ? (isFocused ? 1 : 0.28) : 1;

                          return (
                            <Cell 
                              key={`cell-${item.id}`} 
                              fill={baseColor}
                              fillOpacity={opacity}
                              stroke={isLocked ? '#1d4ed8' : isFocused ? baseColor : 'none'}
                              strokeWidth={isLocked ? 3 : isFocused ? 2 : 0}
                              strokeDasharray={isLocked ? '4,2' : undefined}
                              className="cursor-pointer transition-all duration-300 ease-out"
                              onClick={() => handleMassClick(item.id)}
                              onMouseEnter={() => handleMassHover(item.id)}
                              onMouseLeave={() => handleMassHover(null)}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* AI Expert Opinion Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-blue-500" />
                  <h2 className="text-lg font-semibold">AI Expert Opinion</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadPDF}
                    disabled={calculations.hasErrors}
                    title="Download formal engineering report (PDF)"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={14} className="text-blue-600" />
                    Download PDF Report
                  </button>
                  <button
                    onClick={fetchOpinion}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
                    ) : (
                      <>Calculate Opinion</>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="p-6 bg-white min-h-[120px]">
                {opinionError && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 mb-4">
                    {opinionError}
                  </div>
                )}
                
                {opinion ? (
                  <div className="prose prose-sm prose-slate max-w-none prose-headings:font-semibold prose-a:text-blue-600">
                    <Markdown>{opinion}</Markdown>
                  </div>
                ) : (
                  !isAnalyzing && !opinionError && (
                    <div className="text-center text-slate-400 py-8 flex flex-col items-center gap-3">
                      <Sparkles size={32} className="opacity-20" />
                      <p className="text-sm">Click the button above to get an AI-generated analysis of these results.</p>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative">
              
              {/* Chart Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:break-inside-avoid print:mt-6">
                <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Compass size={20} className="text-slate-500" />
                    <h2 className="text-lg font-semibold">Force Vector Diagram</h2>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 print:hidden">
                    {/* Locked mass banner indicator if active */}
                    {lockedMassId !== null && (
                      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-2.5 py-1 rounded-full shadow-xs animate-in fade-in duration-200">
                        <Pin size={11} className="text-blue-600 fill-blue-600" />
                        <span className="font-semibold">m{lockedMassId} Locked</span>
                        <button
                          type="button"
                          onClick={handleClearFocus}
                          className="hover:bg-blue-200/60 rounded-full p-0.5 transition-colors"
                          title="Clear locked focus"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    )}

                    {/* Force Unit Mode Toggle Button (N vs Mass·Radius) */}
                    <button
                      type="button"
                      onClick={() => setVecUnitMode(prev => prev === 'standard' ? 'newtons' : 'standard')}
                      title={
                        vecUnitMode === 'newtons'
                          ? 'Displaying Centrifugal Force in N (Newtons) — Click to switch to standard unbalance units (mass·radius)'
                          : 'Displaying Unbalance Force in standard units (mass·radius) — Click to switch to Centrifugal Force in N (Newtons)'
                      }
                      aria-label="Toggle force unit mode between standard mass radius and Newtons"
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                        vecUnitMode === 'newtons'
                          ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Gauge size={13} className={vecUnitMode === 'newtons' ? 'text-amber-600' : 'text-slate-500'} />
                      <span>{vecUnitMode === 'newtons' ? 'Unit: N' : `Unit: ${massUnit}·${lengthUnit}`}</span>
                    </button>

                    {/* Vector Display Mode Segmented Control */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs shadow-xs">
                      <button
                        type="button"
                        onClick={() => { setVecDisplayMode('magnitude'); setVecAutoCycle(false); }}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                          vecDisplayMode === 'magnitude'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Display vector force magnitudes only"
                      >
                        Mag
                      </button>
                      <button
                        type="button"
                        onClick={() => { setVecDisplayMode('components'); setVecAutoCycle(false); }}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                          vecDisplayMode === 'components'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Display horizontal & vertical components (H/V)"
                      >
                        H/V
                      </button>
                      <button
                        type="button"
                        onClick={() => { setVecDisplayMode('both'); setVecAutoCycle(false); }}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                          vecDisplayMode === 'both'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Display both magnitudes and H/V components"
                      >
                        Both
                      </button>
                    </div>

                    {/* Auto-cycle toggle button */}
                    <button
                      type="button"
                      onClick={() => setVecAutoCycle(!vecAutoCycle)}
                      title={vecAutoCycle ? "Disable automatic display cycling" : "Auto-cycle display modes (Mag → H/V → Both every 3s)"}
                      className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
                        vecAutoCycle 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <RotateCcw size={12} className={vecAutoCycle ? "animate-spin" : ""} />
                      <span>Auto</span>
                    </button>

                    <button
                      onClick={() => setIsSimulating(!isSimulating)}
                      title={isSimulating ? "Pause dynamic rotation" : "Simulate dynamic rotor rotation"}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isSimulating 
                          ? 'bg-blue-50 border-blue-200 text-blue-600' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isSimulating ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button
                      onClick={() => setActivePreviewModal('vector')}
                      title="Enlarge Vector Diagram Preview & Settings"
                      className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Maximize2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="p-6 h-[450px] w-full flex items-center justify-center bg-slate-50/20 preview-svg-vector">
                  <VectorDiagramSVG 
                    steps={calculations.steps} 
                    sumH={calculations.sumH} 
                    sumV={calculations.sumV} 
                    resultantForce={calculations.resultantForce} 
                    resultantAngleDeg={calculations.resultantAngleDeg}
                    rotationOffset={rotationOffset}
                    showAxes={vecShowAxes}
                    showForces={vecShowForces}
                    showPolygon={vecShowPolygon}
                    showResultant={vecShowResultant}
                    displayMode={vecDisplayMode}
                    showProjections={vecShowProjections}
                    activeFocusId={activeFocusId}
                    lockedMassId={lockedMassId}
                    onMassClick={handleMassClick}
                    onMassHover={handleMassHover}
                    onVectorChange={handleVectorChange}
                    isSimulating={isSimulating}
                    sensitivityPoints={calculations.sensitivityPoints}
                    showSensitivityAnalysis={showSensitivityAnalysis}
                    unitMode={vecUnitMode}
                    massUnit={massUnit}
                    lengthUnit={lengthUnit}
                    rpm={rpm}
                  />
                </div>
              </div>

              {/* Space Diagram Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:break-inside-avoid print:mt-6">
                <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Compass size={20} className="text-slate-500" />
                    <h2 className="text-lg font-semibold">Space Diagram (Physical Layout)</h2>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 print:hidden">
                    {lockedMassId !== null && (
                      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-2.5 py-1 rounded-full shadow-xs animate-in fade-in duration-200">
                        <Pin size={11} className="text-blue-600 fill-blue-600" />
                        <span className="font-semibold">m{lockedMassId} Locked</span>
                        <button
                          type="button"
                          onClick={handleClearFocus}
                          className="hover:bg-blue-200/60 rounded-full p-0.5 transition-colors"
                          title="Clear locked focus"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => setIsSimulating(!isSimulating)}
                      title={isSimulating ? "Pause dynamic rotation" : "Simulate dynamic rotor rotation"}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isSimulating 
                        ? 'bg-blue-50 border-blue-200 text-blue-600' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isSimulating ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button
                    onClick={() => setActivePreviewModal('space')}
                    title="Enlarge Space Diagram Preview"
                    className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Maximize2 size={15} />
                  </button>
                </div>
              </div>
              <div className="p-6 h-[450px] w-full flex items-center justify-center bg-slate-50/20 preview-svg-space">
                <SpaceDiagramSVG 
                  steps={calculations.steps} 
                  balRadius={balRadius} 
                  balancingMass={calculations.balancingMass} 
                  balancingAngleDeg={manualBalAngle !== null ? manualBalAngle : calculations.balancingAngleDeg} 
                  idealAngle={calculations.balancingAngleDeg}
                  tolerance={parseFloat(angleTolerance) || 0}
                  massUnit={massUnit}
                  lengthUnit={lengthUnit}
                  onBalancingAngleChange={setManualBalAngle}
                  rotationOffset={rotationOffset}
                  showAxes={spaShowAxes}
                  showIndividualMasses={spaShowIndividualMasses}
                  showBalancingMass={spaShowBalancingMass}
                  showToleranceCone={spaShowToleranceCone}
                  showAngularGrid={spaShowAngularGrid}
                  activeFocusId={activeFocusId}
                  lockedMassId={lockedMassId}
                  onMassClick={handleMassClick}
                  onMassHover={handleMassHover}
                />
              </div>
            </div>
            
            </div>
            </>
            )}
          </section>
        </div>
        </>
        )}
      </div>

      {/* Dynamic Diagram Preview Modals */}
      {activePreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Compass size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {activePreviewModal === 'vector' 
                      ? "Force Vector Diagram (Preview & Configuration)" 
                      : "Space Diagram (Preview & Configuration)"
                    }
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-fidelity visual blueprint of the rotating system
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActivePreviewModal(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Interactive Visual Canvas */}
              <div className="md:col-span-2 bg-slate-900/5 rounded-2xl border border-slate-100 p-6 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
                {/* Simulated Speed rotation animation indicator banner */}
                {isSimulating && (
                  <div className="absolute top-4 left-4 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    Simulation Active: 30 RPM (Rotational Sweep)
                  </div>
                )}
                
                <div className={`w-full max-w-[480px] aspect-square flex items-center justify-center preview-svg-${activePreviewModal}`}>
                  {activePreviewModal === 'vector' ? (
                    <VectorDiagramSVG 
                      steps={calculations.steps} 
                      sumH={calculations.sumH} 
                      sumV={calculations.sumV} 
                      resultantForce={calculations.resultantForce} 
                      resultantAngleDeg={calculations.resultantAngleDeg}
                      rotationOffset={rotationOffset}
                      showAxes={vecShowAxes}
                      showForces={vecShowForces}
                      showPolygon={vecShowPolygon}
                      showResultant={vecShowResultant}
                      displayMode={vecDisplayMode}
                      showProjections={vecShowProjections}
                      activeFocusId={activeFocusId}
                      lockedMassId={lockedMassId}
                      onMassClick={handleMassClick}
                      onMassHover={handleMassHover}
                      onVectorChange={handleVectorChange}
                      isSimulating={isSimulating}
                      sensitivityPoints={calculations.sensitivityPoints}
                      showSensitivityAnalysis={showSensitivityAnalysis}
                      unitMode={vecUnitMode}
                      massUnit={massUnit}
                      lengthUnit={lengthUnit}
                      rpm={rpm}
                    />
                  ) : (
                    <SpaceDiagramSVG 
                      steps={calculations.steps} 
                      balRadius={balRadius} 
                      balancingMass={calculations.balancingMass} 
                      balancingAngleDeg={manualBalAngle !== null ? manualBalAngle : calculations.balancingAngleDeg} 
                      idealAngle={calculations.balancingAngleDeg}
                      tolerance={parseFloat(angleTolerance) || 0}
                      massUnit={massUnit}
                      lengthUnit={lengthUnit}
                      onBalancingAngleChange={setManualBalAngle}
                      rotationOffset={rotationOffset}
                      showAxes={spaShowAxes}
                      showIndividualMasses={spaShowIndividualMasses}
                      showBalancingMass={spaShowBalancingMass}
                      showToleranceCone={spaShowToleranceCone}
                      showAngularGrid={spaShowAngularGrid}
                      activeFocusId={activeFocusId}
                      lockedMassId={lockedMassId}
                      onMassClick={handleMassClick}
                      onMassHover={handleMassHover}
                    />
                  )}
                </div>
              </div>

              {/* Settings Sidebar */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Settings2 size={16} className="text-slate-500" />
                    Preview Controls
                  </h4>

                  {/* Active Mass Focus Card (if a mass is locked) */}
                  {lockedMassId !== null && (
                    <div className="mb-4 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl shadow-xs flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <Pin size={14} className="text-blue-600 fill-blue-600" />
                        <div>
                          <p className="text-xs font-bold text-blue-900">Mass {lockedMassId} Focused</p>
                          <p className="text-[11px] text-blue-600">Locked in visual preview</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearFocus}
                        className="px-2 py-1 bg-white hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg border border-blue-200 shadow-xs transition-colors"
                      >
                        Clear Focus
                      </button>
                    </div>
                  )}

                  {/* Playback Simulation group */}
                  <div className="mb-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Simulated Physics</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Rotor Dynamic Spin</span>
                      <button
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSimulating 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSimulating ? <Pause size={13} /> : <Play size={13} />}
                        {isSimulating ? "Pause" : "Spin"}
                      </button>
                    </div>
                  </div>

                  {/* Force Unit Representation Control (Only for vector diagram) */}
                  {activePreviewModal === 'vector' && (
                    <div className="mb-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Force Unit</span>
                        <button
                          type="button"
                          onClick={() => setVecUnitMode(prev => prev === 'standard' ? 'newtons' : 'standard')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            vecUnitMode === 'newtons'
                              ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Gauge size={12} className={vecUnitMode === 'newtons' ? 'text-amber-600' : 'text-slate-500'} />
                          <span>{vecUnitMode === 'newtons' ? 'Newtons (N)' : `${massUnit}·${lengthUnit}`}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Vector Value Display Options (Only for vector diagram) */}
                  {activePreviewModal === 'vector' && (
                    <div className="mb-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Vector Value Display</p>
                        <button
                          type="button"
                          onClick={() => setVecAutoCycle(!vecAutoCycle)}
                          className={`px-2 py-0.5 text-[11px] rounded-md border font-medium transition-all flex items-center gap-1 ${
                            vecAutoCycle
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Auto-cycle between Magnitude, H/V, and Both every 3 seconds"
                        >
                          <RotateCcw size={10} className={vecAutoCycle ? "animate-spin" : ""} />
                          Auto-Cycle
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => { setVecDisplayMode('magnitude'); setVecAutoCycle(false); }}
                          className={`py-1.5 text-xs font-medium rounded-md transition-all text-center ${
                            vecDisplayMode === 'magnitude'
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Magnitude
                        </button>
                        <button
                          type="button"
                          onClick={() => { setVecDisplayMode('components'); setVecAutoCycle(false); }}
                          className={`py-1.5 text-xs font-medium rounded-md transition-all text-center ${
                            vecDisplayMode === 'components'
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          H / V Only
                        </button>
                        <button
                          type="button"
                          onClick={() => { setVecDisplayMode('both'); setVecAutoCycle(false); }}
                          className={`py-1.5 text-xs font-medium rounded-md transition-all text-center ${
                            vecDisplayMode === 'both'
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Both
                        </button>
                      </div>

                      <label htmlFor="chk-vec-projections" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none pt-1">
                        <input 
                          id="chk-vec-projections"
                          type="checkbox" 
                          aria-label="Show horizontal and vertical dashed projections"
                          checked={vecShowProjections}
                          onChange={(e) => setVecShowProjections(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                        />
                        Show H/V Dashed Projections
                      </label>
                    </div>
                  )}

                  {/* Layer configuration triggers */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Layer Visibility</p>
                    
                    {activePreviewModal === 'vector' ? (
                      <div className="space-y-2">
                        <label htmlFor="chk-vec-axes" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            id="chk-vec-axes"
                            type="checkbox" 
                            aria-label="Show coordinate axis grid"
                            checked={vecShowAxes}
                            onChange={(e) => setVecShowAxes(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Coordinate Axis Grid
                        </label>
                        <label htmlFor="chk-vec-forces" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            id="chk-vec-forces"
                            type="checkbox" 
                            aria-label="Show force vector labels"
                            checked={vecShowForces}
                            onChange={(e) => setVecShowForces(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Force Vector Labels
                        </label>
                        <label htmlFor="chk-vec-polygon" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            id="chk-vec-polygon"
                            type="checkbox" 
                            aria-label="Show force polygon chain"
                            checked={vecShowPolygon}
                            onChange={(e) => setVecShowPolygon(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Force Polygon Chain
                        </label>
                        <label htmlFor="chk-vec-resultant" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            id="chk-vec-resultant"
                            type="checkbox" 
                            aria-label="Show resultant vector R"
                            checked={vecShowResultant}
                            onChange={(e) => setVecShowResultant(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Resultant Vector (R)
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label htmlFor="chk-spa-axes" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            id="chk-spa-axes"
                            type="checkbox" 
                            aria-label="Show standard XY axes"
                            checked={spaShowAxes}
                            onChange={(e) => setSpaShowAxes(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Standard XY Axes
                        </label>
                        <label htmlFor="chk-spa-radial-grid" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            id="chk-spa-radial-grid"
                            type="checkbox" 
                            aria-label="Show concentric angular radar grid"
                            checked={spaShowAngularGrid}
                            onChange={(e) => setSpaShowAngularGrid(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Concentric Angular Radar Grid
                        </label>
                        <label htmlFor="chk-spa-mass-planes" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            id="chk-spa-mass-planes"
                            type="checkbox" 
                            aria-label="Show individual mass planes"
                            checked={spaShowIndividualMasses}
                            onChange={(e) => setSpaShowIndividualMasses(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Individual Mass Planes
                        </label>
                        <label htmlFor="chk-spa-balancing-plane" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            id="chk-spa-balancing-plane"
                            type="checkbox" 
                            aria-label="Show balancing mass plane"
                            checked={spaShowBalancingMass}
                            onChange={(e) => setSpaShowBalancingMass(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Balancing Mass plane (m_b)
                        </label>
                        <label htmlFor="chk-spa-tolerance" className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            id="chk-spa-tolerance"
                            type="checkbox" 
                            aria-label="Show tolerance arc highlight"
                            checked={spaShowToleranceCone}
                            onChange={(e) => setSpaShowToleranceCone(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Tolerance Arc Highlight
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 space-y-2 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => exportSVG(activePreviewModal)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                  >
                    <Download size={14} />
                    Export SVG Diagram
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    Download vector graphics (.svg) for presentation slides or academic reports.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Unit Conversion & Balancing Quick-Reference Guide Modal */}
      <UnitConversionHelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)}
        currentMassUnit={massUnit}
        currentLengthUnit={lengthUnit}
      />
    </div>
  );
}
