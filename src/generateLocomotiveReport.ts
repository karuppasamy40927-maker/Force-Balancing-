import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface LocomotiveReportData {
  inputs: {
    W: number;
    C: number;
    L: number;
    phi: number;
    m_ro: number;
    m_re: number;
    c_frac: number;
    r_b: number;
  };
  results: {
    m_total: number;
    r: number;
    mA: number;
    thetaA: number;
    mD: number;
    thetaD: number;
    wVal: number;
    l_B: number;
    l_C: number;
    phiVal: number;
  };
}

export function generateLocomotiveReport(data: LocomotiveReportData) {
  const { inputs, results } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const reportId = `LOCO-SPEC-${Math.floor(100000 + Math.random() * 900000)}`;
  const timestamp = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Top color accent bar
  doc.setFillColor(16, 185, 129); // Emerald-600
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Title Block
  let curY = 12;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text('RAILWAY DYNAMICS & LOCOMOTIVE ENGINEERING DIVISION', margin + 6, curY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('LOCOMOTIVE 2-CYLINDER BALANCING REPORT', margin + 6, curY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Two-Cylinder Inside/Outside Locomotive Multi-Plane Balancing Specification', margin + 6, curY + 20);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Analytical Method: Reference Planes (Couple & Force Polygons)', margin + 6, curY + 26);

  // Metadata block on right
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
  doc.text('DATE:', metaX, curY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(timestamp, metaX + 22, curY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('STATUS:', metaX, curY + 20);
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(metaX + 22, curY + 16.5, 28, 5, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text('VERIFIED SPEC', metaX + 24, curY + 20.2);

  curY += 38;

  // Section 1: Locomotive Configuration Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Locomotive System Parameters', margin, curY);

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.line(margin, curY + 2, margin + 45, curY + 2);
  doc.setLineWidth(0.2);

  const configBody = [
    ['Distance Between Driving Wheels (W)', `${inputs.W.toFixed(3)} m`, 'Distance between wheel reference planes A and D'],
    ['Distance Between Cylinders (C)', `${inputs.C.toFixed(3)} m`, 'Center-to-center distance between cylinder planes B and C'],
    ['Piston Stroke Length (L)', `${inputs.L.toFixed(3)} m`, `Crank radius r = L/2 = ${results.r.toFixed(3)} m`],
    ['Crank Angle Phase Difference (φ)', `${inputs.phi.toFixed(1)}°`, 'Angular displacement between crank 1 and crank 2'],
    ['Rotating Mass per Cylinder (m_ro)', `${inputs.m_ro.toFixed(2)} kg`, 'Mass of rotating crankpin and rotating portion of rod'],
    ['Reciprocating Mass per Cylinder (m_re)', `${inputs.m_re.toFixed(2)} kg`, 'Mass of piston, crosshead, and reciprocating portion of rod'],
    ['Fraction of Reciprocating Balanced (c)', `${inputs.c_frac.toFixed(2)}`, 'Compromise factor between hammer blow and swaying couple'],
    ['Target Counterbalance Radius (r_b)', `${inputs.r_b.toFixed(3)} m`, 'Radial distance of balance weights in driving wheel planes'],
  ];

  autoTable(doc, {
    startY: curY + 5,
    margin: { left: margin, right: margin },
    head: [['Parameter', 'Configured Value', 'Description & Boundary']],
    body: configBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 65 },
      1: { cellWidth: 40, textColor: [5, 150, 105], fontStyle: 'bold' },
      2: { cellWidth: 'auto', textColor: [71, 85, 105] },
    },
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // Section 2: Calculated Balancing Results
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Calculated Wheel Balancing Results', margin, curY);

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.line(margin, curY + 2, margin + 45, curY + 2);
  doc.setLineWidth(0.2);

  curY += 6;

  // Highlight Box
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, 'FD');

  const halfW = contentWidth / 2;
  // Wheel 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DRIVING WHEEL 1 (PLANE A)', margin + 6, curY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105);
  doc.text(`${results.mA.toFixed(2)} kg @ ${results.thetaA.toFixed(1)}°`, margin + 6, curY + 14);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Counterbalance attached at radius r_b = ${inputs.r_b.toFixed(3)} m`, margin + 6, curY + 19.5);

  // Wheel 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DRIVING WHEEL 2 (PLANE D)', margin + halfW + 6, curY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text(`${results.mD.toFixed(2)} kg @ ${results.thetaD.toFixed(1)}°`, margin + halfW + 6, curY + 14);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Counterbalance attached at radius r_b = ${inputs.r_b.toFixed(3)} m`, margin + halfW + 6, curY + 19.5);

  curY += 28;

  // Results Breakdown Table
  const resultsBody = [
    ['Total Equivalent Mass per Cylinder', `${results.m_total.toFixed(2)} kg`, 'm_total = m_ro + c · m_re'],
    ['Crank Throw Radius (r)', `${results.r.toFixed(3)} m`, 'r = Stroke (L) / 2'],
    ['Wheel 1 Balance Mass (m_A)', `${results.mA.toFixed(2)} kg`, 'Determined via Couple Polygon about Reference Plane D'],
    ['Wheel 1 Mounting Angle (θ_A)', `${results.thetaA.toFixed(1)}°`, 'Angular orientation relative to Crank 1 datum (0°)'],
    ['Wheel 2 Balance Mass (m_D)', `${results.mD.toFixed(2)} kg`, 'Determined via Force Polygon vector closure'],
    ['Wheel 2 Mounting Angle (θ_D)', `${results.thetaD.toFixed(1)}°`, 'Angular orientation relative to Crank 1 datum (0°)'],
  ];

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [['Result Parameter', 'Calculated Value', 'Analytical Derivation']],
    body: resultsBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 65 },
      1: { cellWidth: 40, textColor: [5, 150, 105], fontStyle: 'bold' },
      2: { cellWidth: 'auto', textColor: [71, 85, 105] },
    },
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // Section 3: Engineering Analysis & Secondary Effects
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Dynamics & Engineering Considerations', margin, curY);

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.line(margin, curY + 2, margin + 45, curY + 2);
  doc.setLineWidth(0.2);

  curY += 7;

  const notes = [
    {
      title: 'Hammer Blow Effect (Wheel Variation Pressure)',
      text: `Balancing a fraction (c = ${inputs.c_frac.toFixed(2)}) of the reciprocating parts introduces an unbalanced vertical centrifugal component. This causes cyclical variations in the pressure between the driving wheels and the rails, termed "hammer blow". Excess hammer blow may lead to rail damage or temporary wheel lift at critical speeds.`,
    },
    {
      title: 'Swaying Couple & Tractive Force Fluctuation',
      text: 'Unbalanced reciprocating masses produce an alternating tractive effort and a swaying couple that induces lateral yawing oscillations of the locomotive. The fraction c is typically engineered between 0.50 and 0.67 to strike an optimal operational compromise between hammer blow and swaying couple.',
    },
    {
      title: 'Reference Plane & Polygon Equilibrium',
      text: `Plane D was chosen as the moment reference plane. The couple polygon yielded m_A · r_b · W = ${ (results.mA * inputs.r_b * inputs.W).toFixed(2) } kg·m². The force polygon subsequently closed the remaining vector sum to determine m_D. Both wheels now maintain dynamic balance against primary rotating and reciprocating inertia forces.`,
    },
  ];

  for (const n of notes) {
    if (curY > pageHeight - 30) {
      doc.addPage();
      curY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(n.title, margin, curY);
    curY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    const split = doc.splitTextToSize(n.text, contentWidth);
    doc.text(split, margin, curY);
    curY += split.length * 3.8 + 3;
  }

  // Running footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footY = pageHeight - 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, footY - 3, pageWidth - margin, footY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('CONFIDENTIAL & PROPRIETARY — LOCOMOTIVE DYNAMICS LAB', margin, footY);
    doc.text('MULTI-PLANE REFERENCE POLAR SPECIFICATION', pageWidth / 2 - 25, footY);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 15, footY);
  }

  doc.save(`Locomotive_Balancing_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
