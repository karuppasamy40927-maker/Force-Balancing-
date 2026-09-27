import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface MassReportItem {
  id: number;
  mass: string;
  radius: string;
  angle: string;
  force: number;
  h: number;
  v: number;
  centrifugalForceN?: number;
}

export interface BalancingReportData {
  masses: any[];
  steps: MassReportItem[];
  calculations: {
    sumH: number;
    sumV: number;
    resultantForce: number;
    resultantAngleDeg: number;
    balancingMass: number;
    balancingAngleDeg: number;
    balancingForce: number;
    thresholds?: {
      massWarning: number;
      massCritical: number;
      unbalanceWarning: number;
      unbalanceCritical: number;
    };
  };
  config: {
    massUnit: string;
    lengthUnit: string;
    balRadius: string;
    angleTolerance: string;
    enableCentrifugal: boolean;
    rpm: string;
  };
  opinion: string | null;
}

const formatNum = (num: number, decimals = 3) => Number(num.toFixed(decimals));

export function generateBalancingReport(data: BalancingReportData) {
  const { steps, calculations, config, opinion } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const reportId = `RMB-SPEC-${Math.floor(100000 + Math.random() * 900000)}`;
  const timestamp = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Top color accent bar
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, pageWidth, 4, 'F');

  // --- Title Block / Engineering Header ---
  let curY = 12;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, curY, contentWidth, 32, 2, 2, 'FD');

  // Lab & Sub-institution
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text('MECHANICAL DYNAMICS & ROTOR BALANCING LABORATORY', margin + 6, curY + 7);

  // Main Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('ROTATING MASS BALANCING SPECIFICATION REPORT', margin + 6, curY + 14);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Single-Plane Static & Dynamic Unbalance Equilibrium Verification', margin + 6, curY + 20);

  // Reference Standard badge
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Governing Standards: ISO 1940-1 / ANSI S2.19 (Balance Quality Requirements)', margin + 6, curY + 26);

  // Right-hand metadata box
  const metaX = pageWidth - margin - 58;
  doc.setDrawColor(203, 213, 225);
  doc.line(metaX - 4, curY + 4, metaX - 4, curY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('REPORT REF:', metaX, curY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(reportId, metaX + 22, curY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DATE / TIME:', metaX, curY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${timestamp}`, metaX + 22, curY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('STATUS:', metaX, curY + 20);
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(metaX + 22, curY + 16.5, 28, 5, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('VERIFIED SPEC', metaX + 24, curY + 20.2);

  curY += 38;

  // --- SECTION 1: System Configuration Table ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. System Configuration & Operating Parameters', margin, curY);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(margin, curY + 2, margin + 45, curY + 2);
  doc.setLineWidth(0.2);

  const rpmVal = parseFloat(config.rpm) || 0;
  const omega = config.enableCentrifugal && rpmVal > 0 ? (2 * Math.PI * rpmVal) / 60 : 0;

  const configTableBody = [
    [
      'Target Counterbalance Radius (r_b)',
      `${config.balRadius || '0.00'} ${config.lengthUnit}`,
      'Designated radial distance for counterbalance mass placement',
    ],
    [
      'System Angular Tolerance (Δθ)',
      `±${config.angleTolerance || '5.0'}°`,
      'Permissible angular tolerance band for counterweight mounting',
    ],
    [
      'Operating Rotor Speed',
      config.enableCentrifugal ? `${config.rpm || '0'} RPM` : 'Static Force Mode',
      config.enableCentrifugal
        ? `Angular velocity: ${omega.toFixed(2)} rad/s (${(omega / (2 * Math.PI)).toFixed(1)} Hz)`
        : 'Pure coplanar static moment equivalent resolution',
    ],
    [
      'Active Unbalance Masses Count',
      `${steps.length} Stations`,
      'Discrete coplanar rotating masses currently configured in system',
    ],
    [
      'Standard Measurement Units',
      `Mass: ${config.massUnit}  |  Length: ${config.lengthUnit}`,
      'Unified unit system applied across all component calculations',
    ],
    [
      'Coordinate Reference Datum',
      '0.0° Horizontal (+X Axis)',
      'Polar coordinate system with positive counter-clockwise rotation',
    ],
  ];

  autoTable(doc, {
    startY: curY + 5,
    margin: { left: margin, right: margin },
    head: [['System Parameter', 'Configured Value', 'Specification Description']],
    body: configTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      cellPadding: 2.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 45, textColor: [37, 99, 235], fontStyle: 'bold' },
      2: { cellWidth: 'auto', textColor: [71, 85, 105] },
    },
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // --- SECTION 2: Step-by-Step System Masses Resolution Table ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Step-by-Step Mass Inputs & Force Vector Resolution', margin, curY);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(margin, curY + 2, margin + 45, curY + 2);
  doc.setLineWidth(0.2);

  const totalCentrifugalN = steps.reduce((acc, s) => acc + (s.centrifugalForceN || 0), 0);

  const massTableHead = [
    [
      'Station',
      `Mass (${config.massUnit})`,
      `Radius (${config.lengthUnit})`,
      'Angle (θ)',
      `Moment (${config.massUnit}·${config.lengthUnit})`,
      'H-Component',
      'V-Component',
      ...(config.enableCentrifugal ? ['Centrifugal (N)'] : []),
    ],
  ];

  const massTableBody = steps.map((s) => [
    `M${s.id}`,
    s.mass,
    s.radius,
    `${(parseFloat(s.angle) % 360).toFixed(1)}°`,
    formatNum(s.force),
    formatNum(s.h),
    formatNum(s.v),
    ...(config.enableCentrifugal ? [formatNum(s.centrifugalForceN || 0, 2)] : []),
  ]);

  const massTableFoot = [
    [
      'SUM (Σ)',
      '-',
      '-',
      '-',
      '-',
      formatNum(calculations.sumH),
      formatNum(calculations.sumV),
      ...(config.enableCentrifugal ? [`${totalCentrifugalN.toFixed(2)} N`] : []),
    ],
  ];

  autoTable(doc, {
    startY: curY + 5,
    margin: { left: margin, right: margin },
    head: massTableHead,
    body: massTableBody,
    foot: massTableFoot,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      cellPadding: 2,
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [15, 23, 42] },
      4: { fontStyle: 'bold', textColor: [37, 99, 235] },
    },
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // --- Check Page Break for Section 3 ---
  if (curY > 210) {
    doc.addPage();
    curY = 20;
  }

  // --- SECTION 3: Calculated Balancing Results ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Calculated Balancing Results & Equilibrium Specification', margin, curY);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(margin, curY + 2, margin + 45, curY + 2);
  doc.setLineWidth(0.2);

  curY += 6;

  // Highlight Box with Primary Solution
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, 'FD');

  const colW = contentWidth / 3;

  // Metric 1: Resultant Unbalance
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('RESULTANT UNBALANCE (R)', margin + 6, curY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatNum(calculations.resultantForce)}`, margin + 6, curY + 14);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${config.massUnit}·${config.lengthUnit} @ ${formatNum(calculations.resultantAngleDeg, 1)}°`, margin + 6, curY + 19.5);

  // Metric 2: Required Balancing Mass
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('REQUIRED BALANCING MASS (m_b)', margin + colW + 6, curY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text(`${formatNum(calculations.balancingMass)} ${config.massUnit}`, margin + colW + 6, curY + 14);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Placed at r_b = ${config.balRadius} ${config.lengthUnit}`, margin + colW + 6, curY + 19.5);

  // Metric 3: Required Mounting Angle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('REQUIRED MOUNTING ANGLE (θ_b)', margin + colW * 2 + 6, curY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(220, 38, 38); // Red-600
  doc.text(`${formatNum(calculations.balancingAngleDeg, 1)}°`, margin + colW * 2 + 6, curY + 14);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('180° counter-phase opposition', margin + colW * 2 + 6, curY + 19.5);

  curY += 28;

  // Detailed Results Table
  let balMassKg = calculations.balancingMass;
  if (config.massUnit === 'lbs') balMassKg = calculations.balancingMass * 0.45359237;
  let balRadiusM = parseFloat(config.balRadius) || 0;
  if (config.lengthUnit === 'in') balRadiusM = balRadiusM * 0.0254;
  else if (config.lengthUnit === 'mm') balRadiusM = balRadiusM / 1000;
  else if (config.lengthUnit === 'cm') balRadiusM = balRadiusM / 100;

  const balCentrifugalN = omega > 0 ? balMassKg * balRadiusM * omega * omega : 0;

  const resultsTableBody = [
    [
      'Horizontal Force Sum (ΣH)',
      `${formatNum(calculations.sumH)} ${config.massUnit}·${config.lengthUnit}`,
      'Resolved horizontal vector sum of all rotating mass moments',
    ],
    [
      'Vertical Force Sum (ΣV)',
      `${formatNum(calculations.sumV)} ${config.massUnit}·${config.lengthUnit}`,
      'Resolved vertical vector sum of all rotating mass moments',
    ],
    [
      'Resultant Unbalance Moment (R)',
      `${formatNum(calculations.resultantForce)} ${config.massUnit}·${config.lengthUnit}`,
      'Vector magnitude of primary unbalance requiring compensation',
    ],
    [
      'Resultant Phase Angle (θ_R)',
      `${formatNum(calculations.resultantAngleDeg, 2)}°`,
      'Directional orientation of resultant unbalance vector in polar plane',
    ],
    [
      'Correction Counterweight Mass (m_b)',
      `${formatNum(calculations.balancingMass)} ${config.massUnit}`,
      `Exact calculated mass required at target radius ${config.balRadius} ${config.lengthUnit}`,
    ],
    [
      'Counterweight Phase Angle (θ_b)',
      `${formatNum(calculations.balancingAngleDeg, 2)}°`,
      'Mounted diametrically opposite to unbalance vector (θ_R + 180°)',
    ],
    [
      'Residual Equilibrium Status',
      '0.000 (100% Resolved)',
      'Theoretical zero residual unbalance when counterweight is affixed',
    ],
    ...(config.enableCentrifugal
      ? [
          [
            'Dynamic Centrifugal Force at Speed',
            `${balCentrifugalN.toFixed(2)} N`,
            `Dynamic rotating radial load generated at ${config.rpm} RPM`,
          ],
        ]
      : []),
  ];

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [['Equilibrium Parameter', 'Specification / Result', 'Technical Interpretation']],
    body: resultsTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 62 },
      1: { cellWidth: 45, textColor: [37, 99, 235], fontStyle: 'bold' },
      2: { cellWidth: 'auto', textColor: [71, 85, 105] },
    },
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // --- SECTION 4: AI Expert Opinion & Engineering Summary ---
  // Ensure Section 4 starts on a clean page if remaining height is low
  if (curY > 170) {
    doc.addPage();
    curY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. AI Expert Opinion & Technical Engineering Summary', margin, curY);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(margin, curY + 2, margin + 45, curY + 2);
  doc.setLineWidth(0.2);

  curY += 7;

  // Render Executive Summary Banner
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, contentWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text('EXECUTIVE ENGINEERING SYNTHESIS', margin + 5, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const execSummary = `The rotor system exhibits a net resultant unbalance of ${formatNum(calculations.resultantForce)} ${config.massUnit}·${config.lengthUnit} directed at ${formatNum(calculations.resultantAngleDeg, 1)}°. Affixing a precision counter-mass of ${formatNum(calculations.balancingMass)} ${config.massUnit} at radius ${config.balRadius} ${config.lengthUnit} and phase ${formatNum(calculations.balancingAngleDeg, 1)}° cancels coplanar radial excitation, restoring static equilibrium and mitigating bearing fatigue in accordance with ISO 1940 standards.`;
  const splitExec = doc.splitTextToSize(execSummary, contentWidth - 10);
  doc.text(splitExec, margin + 5, curY + 11.5);

  curY += 27;

  if (opinion) {
    // If AI opinion from Gemini is present, parse and format it cleanly
    const opinionLines = opinion.split('\n');

    for (let line of opinionLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        curY += 2;
        continue;
      }

      // Check if page break is needed
      if (curY > pageHeight - 25) {
        doc.addPage();
        curY = 20;
      }

      // Header line: ### or ## or #
      if (trimmed.startsWith('#')) {
        const headerText = trimmed.replace(/^#+\s*/, '').replace(/[*_]/g, '');
        curY += 3;
        if (curY > pageHeight - 25) {
          doc.addPage();
          curY = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(headerText, margin, curY);
        curY += 4.5;
      } else if (trimmed.startsWith('*') || trimmed.startsWith('-') || /^\d+\./.test(trimmed)) {
        // Bullet or numbered list item
        const itemText = trimmed.replace(/^[\*\-\d\.]+\s*/, '').replace(/[*_]/g, '');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        // Draw bullet point
        doc.setFillColor(37, 99, 235);
        doc.circle(margin + 2.5, curY - 1, 0.7, 'F');

        const splitItem = doc.splitTextToSize(itemText, contentWidth - 8);
        doc.text(splitItem, margin + 6, curY);
        curY += splitItem.length * 4;
      } else {
        // Regular paragraph
        const cleanPara = trimmed.replace(/[*_]/g, '');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const splitPara = doc.splitTextToSize(cleanPara, contentWidth);
        doc.text(splitPara, margin, curY);
        curY += splitPara.length * 3.8 + 1.5;
      }
    }
  } else {
    // Formulate a structured expert engineering assessment summary based on mathematical resolution
    const expertSections = [
      {
        title: '4.1 Unbalance Severity & Vibration Dynamics',
        text: `The calculated unbalance moment of ${formatNum(calculations.resultantForce)} ${config.massUnit}·${config.lengthUnit} produces dynamic cyclical forces transmitted through the shaft to supporting bearings. At operational speeds, unbalance generates sinusoidal excitation at 1X rotational frequency. If left uncorrected, excessive vibration accelerates raceway spalling in rolling-element bearings, degrades seal integrity, and may excite structural resonance within the machine casing.`,
      },
      {
        title: '4.2 Neutralization Mechanics & Phase Inversion',
        text: `Complete single-plane balance is established by introducing an equal and opposing vector. Placing a counter-mass of ${formatNum(calculations.balancingMass)} ${config.massUnit} at an angular position of ${formatNum(calculations.balancingAngleDeg, 1)}° (180° diametrically opposed to the ${formatNum(calculations.resultantAngleDeg, 1)}° unbalance vector) creates an opposing force moment of -${formatNum(calculations.resultantForce)} ${config.massUnit}·${config.lengthUnit}. This resolves both horizontal and vertical vector sums to zero, aligning the principal inertial axis with the rotational centerline.`,
      },
      {
        title: '4.3 Practical Assembly & ISO 1940 Compliance Guidelines',
        bullets: [
          `Angular Accuracy: Ensure the counterweight is affixed within ±${config.angleTolerance || '5.0'}° of the target ${formatNum(calculations.balancingAngleDeg, 1)}° phase. An angular deviation of 5° leaves a transverse residual unbalance of approx. 8.7% of the original unbalance.`,
          `Fastener & Centrifugal Integrity: Counterweight retention hardware must withstand dynamic shear forces (${config.enableCentrifugal ? `${balCentrifugalN.toFixed(2)} N` : 'proportional to ω²'}). Use positive locking fasteners (safety wire or prevailing-torque locknuts) to prevent loosening during operation.`,
          `Balance Quality Grade: For high-speed machinery, verify residual specific unbalance (e_per = U_per / M) satisfies ISO 1940-1 Grade G2.5 (turbines/compressors) or Grade G6.3 (standard fans and electric motors).`,
          `Interactive Workspace Note: Click "Calculate Opinion" in the web application to incorporate live Gemini AI-grounded insights with real-time web references into future reports.`,
        ],
      },
    ];

    for (const sec of expertSections) {
      if (curY > pageHeight - 35) {
        doc.addPage();
        curY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(sec.title, margin, curY);
      curY += 4.5;

      if (sec.text) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(71, 85, 105);
        const split = doc.splitTextToSize(sec.text, contentWidth);
        doc.text(split, margin, curY);
        curY += split.length * 3.8 + 3;
      }

      if (sec.bullets) {
        for (const b of sec.bullets) {
          if (curY > pageHeight - 20) {
            doc.addPage();
            curY = 20;
          }
          doc.setFillColor(37, 99, 235);
          doc.circle(margin + 2.5, curY - 1, 0.6, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.8);
          doc.setTextColor(51, 65, 85);
          const splitB = doc.splitTextToSize(b, contentWidth - 8);
          doc.text(splitB, margin + 6, curY);
          curY += splitB.length * 3.7 + 1.5;
        }
        curY += 2;
      }
    }
  }

  // --- Running Headers & Footers on Every Page ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header (pages > 1)
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('ROTATING MASS BALANCING — FORMAL ENGINEERING SPECIFICATION REPORT', margin, 10);
      doc.text(`REF: ${reportId}`, pageWidth - margin - 30, 10);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 12, pageWidth - margin, 12);
    }

    // Running Footer
    const footY = pageHeight - 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, footY - 3, pageWidth - margin, footY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('CONFIDENTIAL & PROPRIETARY — ROTATING MACHINERY DYNAMICS LAB', margin, footY);
    doc.text('ISO 1940-1 / ANSI S2.19', pageWidth / 2 - 14, footY);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 15, footY);
  }

  // Save the PDF
  const filename = `Balancing_Engineering_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
