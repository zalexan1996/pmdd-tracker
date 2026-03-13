import PDFDocument from 'pdfkit';
import { readAllRecords, SymptomRecord } from './csvManager.js';

// The 14 PMDD symptom short labels for the table rows
const symptomLabels = [
  'Depressed/sad/hopeless',
  'Anxious/tense/on edge',
  'Mood swings/sensitive',
  'Angry/irritable',
  'Less interest in activities',
  'Difficulty concentrating',
  'Lethargic/tired/fatigued',
  'Increased appetite/cravings',
  'Sleep changes',
  'Overwhelmed/out of control',
  'Physical symptoms',
  'Reduced productivity',
  'Avoided social activities',
  'Interfered with relationships',
];

// Color scheme inspired by the IAPMD tracker
const colors = {
  background: '#FFFFFF',
  headerBg: '#5B4A9E',      // Purple header
  headerText: '#FFFFFF',
  titleText: '#5B4A9E',
  rowEvenBg: '#F3F1FA',     // Light purple
  rowOddBg: '#FFFFFF',
  gridLine: '#D1CBE8',
  cellText: '#333333',
  severity1: '#E8F5E9',     // Green - Not at all
  severity2: '#FFF9C4',     // Yellow - Minimal
  severity3: '#FFE0B2',     // Orange-light - Mild
  severity4: '#FFCCBC',     // Orange - Moderate
  severity5: '#EF9A9A',     // Red-light - Severe
  severity6: '#E57373',     // Red - Extreme
};

function getSeverityColor(value: number): string {
  switch (value) {
    case 1: return colors.severity1;
    case 2: return colors.severity2;
    case 3: return colors.severity3;
    case 4: return colors.severity4;
    case 5: return colors.severity5;
    case 6: return colors.severity6;
    default: return '#FFFFFF';
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' });
}

interface MonthData {
  year: number;
  month: number;
  // dayNumber -> record
  days: Map<number, SymptomRecord>;
}

/**
 * Groups records by year-month
 */
function groupByMonth(records: SymptomRecord[]): MonthData[] {
  const monthMap = new Map<string, MonthData>();

  for (const record of records) {
    const [yearStr, monthStr, dayStr] = record.date.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    const key = `${year}-${String(month).padStart(2, '0')}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, { year, month, days: new Map() });
    }
    monthMap.get(key)!.days.set(day, record);
  }

  // Sort by year-month
  return Array.from(monthMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

/**
 * Generates a PDF buffer with monthly symptom tracking tables, filtered by userId
 */
export async function generatePdf(userId: string): Promise<Buffer> {
  const allRecords = await readAllRecords();
  const records = allRecords.filter(r => r.userId === userId);
  const months = groupByMonth(records);

  return new Promise((resolve, reject) => {
    // Landscape tabloid-ish size to fit 31 day columns
    const doc = new PDFDocument({
      size: [1190, 1684], // portrait, similar to the IAPMD tracker dimensions
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (months.length === 0) {
      // Single page with "no data" message
      drawEmptyPage(doc);
      doc.end();
      return;
    }

    months.forEach((monthData, index) => {
      if (index > 0) doc.addPage();
      drawMonthPage(doc, monthData);
    });

    doc.end();
  });
}

function drawEmptyPage(doc: PDFKit.PDFDocument) {
  doc.fontSize(24).fillColor(colors.titleText).text('PMDD Symptom Tracker', 0, 200, { align: 'center' });
  doc.fontSize(14).fillColor(colors.cellText).text('No data recorded yet.', 0, 250, { align: 'center' });
}

function drawMonthPage(doc: PDFKit.PDFDocument, monthData: MonthData) {
  const pageWidth = 1190;
  const marginLeft = 40;
  const marginRight = 40;
  const marginTop = 40;
  const usableWidth = pageWidth - marginLeft - marginRight;

  const daysInMonth = getDaysInMonth(monthData.year, monthData.month);
  const monthName = getMonthName(monthData.month);

  // Layout constants
  const labelColWidth = 200;
  const dayColWidth = (usableWidth - labelColWidth) / daysInMonth;
  const headerHeight = 22;
  const titleHeight = 70;
  const rowHeight = 18;
  const legendHeight = 60;

  // Title
  doc.fontSize(22).fillColor(colors.titleText)
    .text(`PMDD Symptom Tracker — ${monthName} ${monthData.year}`, marginLeft, marginTop, {
      width: usableWidth,
      align: 'center',
    });

  const tableTop = marginTop + titleHeight;

  // Draw header row (day numbers)
  const [hR, hG, hB] = hexToRgb(colors.headerBg);
  doc.rect(marginLeft, tableTop, usableWidth, headerHeight).fill([hR, hG, hB] as any);

  // "Symptom" label in header
  doc.fontSize(8).fillColor(colors.headerText)
    .text('Symptom', marginLeft + 5, tableTop + 5, {
      width: labelColWidth - 10,
      align: 'center',
    });

  // Day number headers
  for (let d = 1; d <= daysInMonth; d++) {
    const x = marginLeft + labelColWidth + (d - 1) * dayColWidth;
    doc.fontSize(8).fillColor(colors.headerText)
      .text(String(d), x, tableTop + 5, {
        width: dayColWidth,
        align: 'center',
      });
  }

  // Draw symptom rows
  for (let row = 0; row < 14; row++) {
    const y = tableTop + headerHeight + row * rowHeight;
    const bgColor = row % 2 === 0 ? colors.rowEvenBg : colors.rowOddBg;
    const [rR, rG, rB] = hexToRgb(bgColor);

    // Row background
    doc.rect(marginLeft, y, usableWidth, rowHeight).fill([rR, rG, rB] as any);

    // Row grid lines
    const [lR, lG, lB] = hexToRgb(colors.gridLine);
    doc.rect(marginLeft, y, usableWidth, rowHeight)
      .lineWidth(0.5)
      .strokeColor([lR, lG, lB] as any)
      .stroke();

    // Symptom label
    doc.fontSize(8).fillColor(colors.cellText)
      .text(symptomLabels[row], marginLeft + 5, y + 4, {
        width: labelColWidth - 10,
        lineBreak: false,
      });

    // Draw vertical lines for each day column and fill values
    for (let d = 1; d <= daysInMonth; d++) {
      const x = marginLeft + labelColWidth + (d - 1) * dayColWidth;

      // Vertical grid line
      doc.moveTo(x, y).lineTo(x, y + rowHeight)
        .lineWidth(0.25)
        .strokeColor([lR, lG, lB] as any)
        .stroke();

      const record = monthData.days.get(d);
      if (record) {
        const qKey = `q${row + 1}` as keyof SymptomRecord;
        const value = parseInt(record[qKey]);
        if (value >= 1 && value <= 6) {
          // Severity color background
          const [sR, sG, sB] = hexToRgb(getSeverityColor(value));
          doc.rect(x + 0.5, y + 0.5, dayColWidth - 1, rowHeight - 1)
            .fill([sR, sG, sB] as any);

          // Value text
          doc.fontSize(8).fillColor(colors.cellText)
            .text(String(value), x, y + 4, {
              width: dayColWidth,
              align: 'center',
            });
        }
      }
    }
  }

  // Label column vertical line
  const [lR2, lG2, lB2] = hexToRgb(colors.gridLine);
  doc.moveTo(marginLeft + labelColWidth, tableTop)
    .lineTo(marginLeft + labelColWidth, tableTop + headerHeight + 14 * rowHeight)
    .lineWidth(1)
    .strokeColor([lR2, lG2, lB2] as any)
    .stroke();

  // Outer border
  doc.rect(marginLeft, tableTop, usableWidth, headerHeight + 14 * rowHeight)
    .lineWidth(1.5)
    .strokeColor([hR, hG, hB] as any)
    .stroke();

  // Legend at the bottom
  const legendY = tableTop + headerHeight + 14 * rowHeight + 15;
  const legendItems = [
    { label: '1 - Not at all', color: colors.severity1 },
    { label: '2 - Minimal', color: colors.severity2 },
    { label: '3 - Mild', color: colors.severity3 },
    { label: '4 - Moderate', color: colors.severity4 },
    { label: '5 - Severe', color: colors.severity5 },
    { label: '6 - Extreme', color: colors.severity6 },
  ];

  doc.fontSize(10).fillColor(colors.titleText)
    .text('Severity Legend:', marginLeft, legendY);

  const legendStartX = marginLeft + 110;
  const legendItemWidth = 130;

  legendItems.forEach((item, i) => {
    const x = legendStartX + i * legendItemWidth;
    const [cR, cG, cB] = hexToRgb(item.color);
    doc.rect(x, legendY, 14, 14).fill([cR, cG, cB] as any)
      .strokeColor([lR2, lG2, lB2] as any).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(colors.cellText)
      .text(item.label, x + 18, legendY + 2, { width: 110 });
  });

  // Footer
  doc.fontSize(8).fillColor('#999999')
    .text('Generated by PMDD Tracker', marginLeft, legendY + 30, {
      width: usableWidth,
      align: 'center',
    });
}
