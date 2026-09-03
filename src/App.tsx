/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calculator, ArrowRight, Settings2, Info, Compass, Plus, X, Sparkles, Loader2, RotateCcw, Download, FileSpreadsheet, Maximize2, Play, Pause, Eye, EyeOff, Copy, Check, AlertTriangle, Palette } from 'lucide-react';
import Markdown from 'react-markdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Mass {
  id: number;
  mass: string;
  radius: string;
  angleRel: string;
  color?: string;
}

const defaultColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

const formatNum = (num: number) => Number(num.toFixed(2));

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
  onVectorChange,
  isSimulating,
  sensitivityPoints = [],
  showSensitivityAnalysis = false
}: any) => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dragTransform, setDragTransform] = React.useState<{ scale: number, cx: number, cy: number } | null>(null);

  const points = [{ x: 0, y: 0 }];
  let curX = 0;
  let curY = 0;

  const rotatedSteps = steps.map((s: any) => {
    const angle = (s.absoluteAngle + rotationOffset) % 360;
    const angleRad = (angle * Math.PI) / 180;
    const h = s.force * Math.cos(angleRad);
    const v = s.force * Math.sin(angleRad);
    return {
      ...s,
      h,
      v
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
      className="w-full h-full max-w-[520px] mx-auto overflow-visible touch-none"
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
        
        return (
          <g key={step.id}>
            <motion.line 
              x1={x1} y1={y1} x2={x2} y2={y2} 
              stroke={(step.color || colors[index % colors.length])} 
              strokeWidth="3" 
              markerEnd="url(#arrowhead)" 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: index * 0.5, ease: "easeInOut" }}
            />
            {/* Label for vector, fades & scales in after line completes */}
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: (index + 1) * 0.5 - 0.1, ease: "easeOut" }}
            >
              <circle cx={x2} cy={y2} r="14" fill="white" stroke={(step.color || colors[index % colors.length])} strokeWidth="1.5" />
              <text x={x2} y={y2} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#334155">
                m{step.id}
              </text>
            </motion.g>
            
            {/* Vector force value label */}
            {showForces && (
              <motion.g
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: (index + 1) * 0.5 - 0.1, ease: "easeOut" }}
              >
                <rect x={valid((x1+x2)/2 - 15)} y={valid((y1+y2)/2 - 10)} width="30" height="20" fill="white" rx="4" stroke="#cbd5e1" />
                <text x={valid((x1+x2)/2)} y={valid((y1+y2)/2)} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#475569">
                  {formatNum(step.force || 0)}
                </text>
              </motion.g>
            )}

            {/* DRAG HANDLE */}
            {!isSimulating && (
              <circle
                cx={x2} cy={y2} r={24}
                fill={dragIndex === index ? `${(step.color || colors[index % colors.length])}30` : "transparent"}
                stroke={dragIndex === index ? (step.color || colors[index % colors.length]) : "transparent"}
                strokeWidth={2}
                strokeDasharray="4,2"
                className="cursor-move touch-none transition-colors"
                onPointerDown={(e) => handlePointerDown(e, index)}
                onPointerEnter={(e) => {
                  if (dragIndex === null) {
                    e.currentTarget.style.fill = `${(step.color || colors[index % colors.length])}15`;
                    e.currentTarget.style.stroke = (step.color || colors[index % colors.length]);
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
            return (
              <>
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
                  <rect x={valid(cx + (rx2 - cx)/2 - 25)} y={valid(cy + (ry2 - cy)/2 - 12)} width="50" height="24" fill="white" rx="4" stroke="#ef4444" />
                  <text x={valid(cx + (rx2 - cx)/2)} y={valid(cy + (ry2 - cy)/2)} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#ef4444">
                    R={formatNum(resultantForce || 0)}
                  </text>
                  
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
              </>
            );
          })()}
        </>
      )}

      {/* Origin */}
      <circle cx={valid(cx)} cy={valid(cy)} r="14" fill="white" stroke="#64748b" strokeWidth="1.5" />
      <text x={valid(cx)} y={valid(cy)} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#334155">O</text>

      <defs>
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
  showAngularGrid = true
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
    <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 520 520" className="w-full max-w-[520px] mx-auto overflow-visible touch-none">
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
        
        return (
          <g key={step.id}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={(step.color || colors[index % colors.length])} strokeWidth="2.5" markerEnd="url(#arrowhead)" />
            <circle cx={x} cy={y} r="16" fill="white" stroke={(step.color || colors[index % colors.length])} strokeWidth="2" />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#334155">
              m{step.id}
            </text>
            <text x={x} y={valid(y - 25)} textAnchor="middle" fontSize="11" fill="#475569">
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

function AppContent() {
  const [masses, setMasses] = useState<Mass[]>([
    { id: 1, mass: '', radius: '', angleRel: '', color: defaultColors[0] },
    { id: 2, mass: '', radius: '', angleRel: '', color: defaultColors[1] },
    { id: 3, mass: '', radius: '', angleRel: '', color: defaultColors[2] },
    { id: 4, mass: '', radius: '', angleRel: '', color: defaultColors[3] },
  ]);
  const [balRadius, setBalRadius] = useState<string>('');
  const [angleTolerance, setAngleTolerance] = useState<string>('5');
  
  const [massUnit, setMassUnit] = useState<'kg' | 'lbs'>('kg');
  const [lengthUnit, setLengthUnit] = useState<'m' | 'in' | 'mm'>('m');
  const [manualBalAngle, setManualBalAngle] = useState<number | null>(null);
  const [opinion, setOpinion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [opinionError, setOpinionError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showSensitivityAnalysis, setShowSensitivityAnalysis] = useState(false);
  const [enableCentrifugal, setEnableCentrifugal] = useState(false);
  const [rpm, setRpm] = useState<string>('');

  // Active modal preview state: 'vector' | 'space' | null
  const [activePreviewModal, setActivePreviewModal] = useState<'vector' | 'space' | null>(null);

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [rotationOffset, setRotationOffset] = useState(0);

  // Vector Diagram Layer Toggles
  const [vecShowAxes, setVecShowAxes] = useState(true);
  const [vecShowForces, setVecShowForces] = useState(true);
  const [vecShowPolygon, setVecShowPolygon] = useState(true);
  const [vecShowResultant, setVecShowResultant] = useState(true);

  // Space Diagram Layer Toggles
  const [spaShowAxes, setSpaShowAxes] = useState(true);
  const [spaShowIndividualMasses, setSpaShowIndividualMasses] = useState(true);
  const [spaShowBalancingMass, setSpaShowBalancingMass] = useState(true);
  const [spaShowToleranceCone, setSpaShowToleranceCone] = useState(true);
  const [spaShowAngularGrid, setSpaShowAngularGrid] = useState(true);

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

  const scrollToResults = () => {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const resetToDefaults = () => {
    setMassUnit('kg');
    setLengthUnit('m');
    setBalRadius('');
    setAngleTolerance('5');
    setMasses([
      { id: 1, mass: '', radius: '', angleRel: '' },
      { id: 2, mass: '', radius: '', angleRel: '' },
      { id: 3, mass: '', radius: '', angleRel: '' },
      { id: 4, mass: '', radius: '', angleRel: '' },
    ]);
    setManualBalAngle(null);
    setOpinion(null);
    setOpinionError(null);
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

  const toggleLengthUnit = (newUnit: 'm' | 'in' | 'mm') => {
    if (lengthUnit === newUnit) return;
    
    let toMetersFactor = 1;
    if (lengthUnit === 'in') toMetersFactor = 1 / 39.3701;
    if (lengthUnit === 'mm') toMetersFactor = 1 / 1000;

    let fromMetersFactor = 1;
    if (newUnit === 'in') fromMetersFactor = 39.3701;
    if (newUnit === 'mm') fromMetersFactor = 1000;

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
      if (i > 0 && !isValidNumber(m.angleRel)) {
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
      };
    }

    let currentAngle = 0;
    let sumH = 0;
    let sumV = 0;

    const rpmVal = parseFloat(rpm) || 0;
    const omega = (enableCentrifugal && rpmVal > 0) ? (2 * Math.PI * rpmVal) / 60 : 0;

    const steps = masses.map((m) => {
      const mMass = parseFloat(m.mass) || 0;
      const mRad = parseFloat(m.radius) || 0;
      const mAng = parseFloat(m.angleRel) || 0;
      
      currentAngle += mAng;
      // Normalize angle
      const angle = currentAngle % 360;
      const angleRad = (angle * Math.PI) / 180;
      const force = mMass * mRad;
      const h = force * Math.cos(angleRad);
      const v = force * Math.sin(angleRad);

      let massKg = mMass;
      if (massUnit === 'lbs') massKg = mMass * 0.45359237;

      let radiusM = mRad;
      if (lengthUnit === 'in') radiusM = mRad * 0.0254;
      else if (lengthUnit === 'mm') radiusM = mRad / 1000;

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
      sensitivityPoints
    };
  }, [masses, balRadius, angleTolerance, rpm, enableCentrifugal]);

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

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
      m.angleRel = newAngle.toFixed(1);
      return next;
    });
  };

  const addMass = () => {
    const nextId = masses.length > 0 ? Math.max(...masses.map(m => m.id)) + 1 : 1;
    const colorIndex = (nextId - 1) % defaultColors.length;
    setMasses([...masses, { id: nextId, mass: '', radius: '', angleRel: '', color: defaultColors[colorIndex] }]);
    scrollToResults();
  };

  const removeMass = (id: number) => {
    if (masses.length > 1) {
      setMasses(masses.filter(m => m.id !== id));
    }
  };

  const formatNum = (num: number) => Number(num.toFixed(3));
  
  const downloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Rotating Masses Balancer Report', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text('System Configuration', 14, 32);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Mass Unit: ${massUnit}`, 14, 40);
    doc.text(`Length Unit: ${lengthUnit}`, 14, 46);
    doc.text(`Target Balancing Radius: ${balRadius} ${lengthUnit}`, 14, 52);
    let tableStartY = 65;
    if (enableCentrifugal) {
      doc.text(`Rotor Speed: ${rpm} RPM`, 14, 58);
      tableStartY = 71;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Step-by-Step Resolution', 14, tableStartY);
    
    autoTable(doc, {
      startY: tableStartY + 5,
      headStyles: { fillColor: [59, 130, 246] }, // blue-600
      head: [['Plane', `Mass (${massUnit})`, `Radius (${lengthUnit})`, 'Angle (°)', `Force (${massUnit}·${lengthUnit})`, 'H-Comp', 'V-Comp', ...(enableCentrifugal ? ['Centrifugal Force (N)'] : [])]],
      body: calculations.steps.map(s => [
        `M${s.id}`,
        s.mass,
        s.radius,
        s.absoluteAngle,
        formatNum(s.force),
        formatNum(s.h),
        formatNum(s.v),
        ...(enableCentrifugal ? [formatNum(s.centrifugalForceN || 0)] : [])
      ]),
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Final Balancing Results', 14, finalY + 15);
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`Sum of Horizontal Forces (ΣH): ${formatNum(calculations.sumH)}`, 14, finalY + 25);
    doc.text(`Sum of Vertical Forces (ΣV): ${formatNum(calculations.sumV)}`, 14, finalY + 31);
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Resultant Unbalance (R): ${formatNum(calculations.resultantForce)} ${massUnit}·${lengthUnit}`, 14, finalY + 41);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Resultant Angle: ${formatNum(calculations.resultantAngleDeg)}°`, 14, finalY + 47);
    
    doc.setTextColor(239, 68, 68); // red-500
    doc.setFont('helvetica', 'bold');
    doc.text(`Balancing Mass (m_b): ${formatNum(calculations.balancingMass)} ${massUnit}`, 14, finalY + 57);
    doc.text(`Balancing Angle (θ_b): ${formatNum(calculations.balancingAngleDeg)}°`, 14, finalY + 63);
    
    if (opinion) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('AI Expert Opinion', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      
      const cleanOpinion = opinion.replace(/[*_#]/g, ''); // strip markdown roughly for simple pdf
      const splitText = doc.splitTextToSize(cleanOpinion, 180);
      doc.text(splitText, 14, 32);
    }

    doc.save('balancing_report.pdf');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-sm">
              <Calculator size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                Rotating Masses Balancer
              </h1>
              <p className="text-slate-500 mt-1">
                Determine the magnitude and position of a balancing mass.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium px-1">Mass Unit</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => toggleMassUnit('kg')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${massUnit === 'kg' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  kg
                </button>
                <button 
                  onClick={() => toggleMassUnit('lbs')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${massUnit === 'lbs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  lbs
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium px-1">Length Unit</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => toggleLengthUnit('m')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${lengthUnit === 'm' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  m
                </button>
                <button 
                  onClick={() => toggleLengthUnit('in')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${lengthUnit === 'in' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  in
                </button>
                <button 
                  onClick={() => toggleLengthUnit('mm')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${lengthUnit === 'mm' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  mm
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inputs Section */}
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Settings2 size={20} className="text-blue-600" />
                  <h2 className="text-lg font-semibold">System Parameters</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadPDF}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md"
                  >
                    <Download size={14} />
                    Download PDF
                  </button>
                  <button
                    onClick={exportCSV}
                    disabled={calculations.hasErrors}
                    title={calculations.hasErrors ? "Please resolve input errors first" : "Export to CSV"}
                    className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md"
                  >
                    <FileSpreadsheet size={14} />
                    Export CSV
                  </button>
                  <button
                    onClick={resetToDefaults}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {masses.map((m, index) => (
                  <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                    {masses.length > 1 && (
                      <button 
                        onClick={() => removeMass(m.id)}
                        className="absolute top-4 right-4 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove Mass"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span>Mass {m.id}</span>
                        <label 
                          className="flex items-center justify-center w-6 h-6 rounded-full cursor-pointer hover:bg-slate-200 transition-colors relative"
                          title="Customize Vector Color"
                        >
                          <Palette size={14} style={{ color: m.color || defaultColors[index % defaultColors.length] }} />
                          <input 
                            type="color" 
                            value={m.color || defaultColors[index % defaultColors.length]}
                            onChange={(e) => updateMass(m.id, 'color', e.target.value)}
                            className="opacity-0 absolute -inset-2 w-10 h-10 cursor-pointer"
                          />
                        </label>
                      </div>
                      {index > 0 && <span className="text-xs font-normal text-slate-500 mr-8">Relative to Mass {index}</span>}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Mass ({massUnit})</label>
                        <input 
                          type="number" 
                          value={m.mass}
                          onChange={(e) => updateMass(m.id, 'mass', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                            !isValidNumber(m.mass) 
                              ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                              : 'bg-white border-slate-200 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Radius ({lengthUnit})</label>
                        <input 
                          type="number" 
                          value={m.radius}
                          onChange={(e) => updateMass(m.id, 'radius', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                            !isValidNumber(m.radius) 
                              ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                              : 'bg-white border-slate-200 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                      {index > 0 && (
                        <div className="col-span-2">
                          <label className="block text-xs text-slate-500 mb-1">Angle from Prev Mass (°)</label>
                          <input 
                            type="number" 
                            value={m.angleRel}
                            onChange={(e) => updateMass(m.id, 'angleRel', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                              !isValidNumber(m.angleRel) 
                                ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                                : 'bg-white border-slate-200 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={addMass}
                  className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 border-dashed"
                >
                  <Plus size={18} />
                  Add Mass Entry
                </button>

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">Balancing Mass Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">Placement Radius ({lengthUnit})</label>
                      <input 
                        type="number" 
                        value={balRadius}
                        onChange={(e) => setBalRadius(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                          !isValidNumber(balRadius) || parseFloat(balRadius) <= 0
                            ? 'bg-red-50 border-red-300 focus:ring-red-500 text-red-900'
                            : 'bg-white border-blue-200 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">Angle Tolerance (±°)</label>
                      <input 
                        type="number" 
                        value={angleTolerance}
                        onChange={(e) => setAngleTolerance(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                          !isValidNumber(angleTolerance) || parseFloat(angleTolerance) < 0
                            ? 'bg-red-50 border-red-300 focus:ring-red-500 text-red-900'
                            : 'bg-white border-blue-200 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div className="col-span-2 pt-2 border-t border-blue-100 flex flex-col gap-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-300 ${showSensitivityAnalysis ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${showSensitivityAnalysis ? 'translate-x-5' : ''}`}></div>
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={showSensitivityAnalysis} 
                          onChange={() => setShowSensitivityAnalysis(!showSensitivityAnalysis)} 
                        />
                        <span className="text-sm text-blue-900 font-medium group-hover:text-blue-700 transition-colors">
                          Sensitivity Analysis <span className="text-xs text-blue-600 font-normal ml-1">(Simulate ±5% Error)</span>
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors duration-300 ${enableCentrifugal ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${enableCentrifugal ? 'translate-x-5' : ''}`}></div>
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={enableCentrifugal} 
                          onChange={() => setEnableCentrifugal(!enableCentrifugal)} 
                        />
                        <span className="text-sm text-blue-900 font-medium group-hover:text-blue-700 transition-colors">
                          Calculate Centrifugal Force <span className="text-xs text-blue-600 font-normal ml-1">(Physical Model)</span>
                        </span>
                      </label>
                      
                      {enableCentrifugal && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 pl-12 mt-1">
                          <label className="block text-xs text-blue-700 mb-1">Rotor Speed (RPM)</label>
                          <input 
                            type="number" 
                            value={rpm}
                            onChange={(e) => setRpm(e.target.value)}
                            placeholder="e.g. 1500"
                            className={`w-1/2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                              !isValidNumber(rpm) || parseFloat(rpm) < 0
                                ? 'bg-red-50 border-red-300 focus:ring-red-500 text-red-900'
                                : 'bg-white border-blue-200 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Results Section */}
          <section ref={resultsRef} className="lg:col-span-7 space-y-6">
            
            {calculations.hasErrors ? (
              <div className="bg-red-50 rounded-2xl shadow-sm border border-red-200 p-8 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
                <Info size={48} className="text-red-400 mb-4" />
                <h2 className="text-xl font-semibold text-red-700 mb-2">Invalid or Missing Inputs</h2>
                <p className="text-red-600 max-w-md mx-auto">
                  Please ensure all mass, radius, and angle fields have valid numeric values. The placement radius must be greater than zero. Highlighted fields require your attention before calculations can run.
                </p>
              </div>
            ) : (
              <>
                {/* Primary Result */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  
                  <button
                    onClick={handleCopyResults}
                    className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5"
                    title="Copy Results"
                  >
                    {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    <span className="text-xs font-medium hidden sm:block">{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <h2 className="text-sm font-semibold text-slate-500 tracking-wide uppercase mb-8">Solution</h2>
                  
                  <div className="grid grid-cols-2 gap-8 divide-x divide-slate-100">
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Required Balancing Mass</p>
                      <p className="text-4xl md:text-5xl font-bold text-slate-900">
                        {formatNum(calculations.balancingMass)} <span className="text-xl text-slate-500 font-medium">{massUnit}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Mounting Angle</p>
                      <p className="text-4xl md:text-5xl font-bold text-slate-900">
                        {formatNum(calculations.balancingAngleDeg)}<span className="text-xl text-slate-500 font-medium">°</span>
                      </p>
                    </div>
                  </div>
                </div>

            {/* Step by step table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                    {' '} <span className="font-semibold text-slate-900">{formatNum(calculations.resultantForce)} {massUnit}·{lengthUnit}</span>
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
                    {' '} <span className="font-semibold text-slate-900">{formatNum(calculations.balancingMass)} {massUnit}</span>
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Calculator size={20} className="text-slate-500" />
                  <h2 className="text-lg font-semibold">Unbalance Force Contributions</h2>
                </div>
                <span className="text-xs text-slate-500 font-medium px-2.5 py-1 bg-slate-100 rounded-full">
                  Unit: {massUnit}·{lengthUnit}
                </span>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-6">
                  This chart compares the individual unbalance force contribution (mass × radius) of each plane.
                  The higher the value, the more that specific mass contributes to the total system unbalance.
                </p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={calculations.steps.map((step) => ({
                        name: `Mass ${step.id}`,
                        force: formatNum(step.force || 0),
                        rawForce: step.force || 0,
                      }))}
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
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-lg shadow-md border border-slate-800 text-xs font-sans">
                                <p className="font-semibold mb-1 text-slate-200">{data.name}</p>
                                <p>Unbalance Force: <span className="font-bold text-blue-400">{data.force}</span> {massUnit}·{lengthUnit}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="force" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {calculations.steps.map((step, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={(step.color || colors[index % colors.length])} 
                          />
                        ))}
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

            {/* Chart Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Compass size={20} className="text-slate-500" />
                  <h2 className="text-lg font-semibold">Force Vector Diagram</h2>
                </div>
                <div className="flex items-center gap-2">
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
                    title="Enlarge Vector Diagram Preview"
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
                  onVectorChange={handleVectorChange}
                  isSimulating={isSimulating}
                  sensitivityPoints={calculations.sensitivityPoints}
                  showSensitivityAnalysis={showSensitivityAnalysis}
                />
              </div>
            </div>

            {/* Space Diagram Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Compass size={20} className="text-slate-500" />
                  <h2 className="text-lg font-semibold">Space Diagram (Physical Layout)</h2>
                </div>
                <div className="flex items-center gap-2">
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
                />
              </div>
            </div>
            
              </>
            )}

          </section>
        </div>
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
                      onVectorChange={handleVectorChange}
                      isSimulating={isSimulating}
                      sensitivityPoints={calculations.sensitivityPoints}
                      showSensitivityAnalysis={showSensitivityAnalysis}
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

                  {/* Playback Simulation group */}
                  <div className="mb-6 p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
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

                  {/* Layer configuration triggers */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Layer Visibility</p>
                    
                    {activePreviewModal === 'vector' ? (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={vecShowAxes}
                            onChange={(e) => setVecShowAxes(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Coordinate Axis Grid
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={vecShowForces}
                            onChange={(e) => setVecShowForces(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Force Vector Labels
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={vecShowPolygon}
                            onChange={(e) => setVecShowPolygon(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Force Polygon Chain
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={vecShowResultant}
                            onChange={(e) => setVecShowResultant(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Resultant Vector (R)
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={spaShowAxes}
                            onChange={(e) => setSpaShowAxes(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Standard XY Axes
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={spaShowAngularGrid}
                            onChange={(e) => setSpaShowAngularGrid(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Concentric Angular Radar Grid
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={spaShowIndividualMasses}
                            onChange={(e) => setSpaShowIndividualMasses(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Individual Mass Planes
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={spaShowBalancingMass}
                            onChange={(e) => setSpaShowBalancingMass(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          Balancing Mass plane (m_b)
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
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

    </div>
  );
}
