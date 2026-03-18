import PDFDocument from 'pdfkit';
import { DatabaseService, ProvidedAnswerRow } from '../../domain/services/database-service.js';
import { SYMPTOM_LABELS } from '../../form-interaction/constants.js';

const colors = {
    headerBg: '#5B4A9E',
    headerText: '#FFFFFF',
    titleText: '#5B4A9E',
    rowEvenBg: '#F3F1FA',
    rowOddBg: '#FFFFFF',
    gridLine: '#D1CBE8',
    cellText: '#333333',
    severity1: '#E8F5E9',
    severity2: '#FFF9C4',
    severity3: '#FFE0B2',
    severity4: '#FFCCBC',
    severity5: '#EF9A9A',
    severity6: '#E57373',
    periodYes: '#CE93D8',
};

function getSeverityColor(value: string): string {
    switch (value) {
        case '1': return colors.severity1;
        case '2': return colors.severity2;
        case '3': return colors.severity3;
        case '4': return colors.severity4;
        case '5': return colors.severity5;
        case '6': return colors.severity6;
        case 'yes': return colors.periodYes;
        default: return '#FFFFFF';
    }
}

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
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
    days: Map<number, Map<number, string>>; // day -> questionId -> answerValue
}

function groupByMonth(rows: ProvidedAnswerRow[], questionIds: number[]): MonthData[] {
    const monthMap = new Map<string, MonthData>();

    for (const row of rows) {
        const [yearStr, monthStr, dayStr] = row.dateProvided.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const day = parseInt(dayStr);
        const key = `${year}-${String(month).padStart(2, '0')}`;

        if (!monthMap.has(key)) {
            monthMap.set(key, { year, month, days: new Map() });
        }
        const monthData = monthMap.get(key)!;
        if (!monthData.days.has(day)) {
            monthData.days.set(day, new Map());
        }
        monthData.days.get(day)!.set(row.questionId, row.answerValue);
    }

    return Array.from(monthMap.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });
}

export async function exportPdf(db: DatabaseService, userId: string): Promise<Buffer> {
    const rows = db.getProvidedAnswersForUser(userId);
    const questions = db.getQuestions();
    const questionIds = questions.map(q => q.id);
    const months = groupByMonth(rows, questionIds);

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: [1190, 1684],
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        if (months.length === 0) {
            doc.fontSize(24).fillColor(colors.titleText).text('PMDD Symptom Tracker', 0, 200, { align: 'center' });
            doc.fontSize(14).fillColor(colors.cellText).text('No data recorded yet.', 0, 250, { align: 'center' });
            doc.end();
            return;
        }

        months.forEach((monthData, index) => {
            if (index > 0) doc.addPage();
            drawMonthPage(doc, monthData, questionIds);
        });

        doc.end();
    });
}

function drawMonthPage(doc: PDFKit.PDFDocument, monthData: MonthData, questionIds: number[]) {
    const pageWidth = 1190;
    const marginLeft = 40;
    const marginRight = 40;
    const marginTop = 40;
    const usableWidth = pageWidth - marginLeft - marginRight;
    const totalQuestions = questionIds.length;

    const daysInMonth = getDaysInMonth(monthData.year, monthData.month);
    const monthName = getMonthName(monthData.month);

    const labelColWidth = 200;
    const dayColWidth = (usableWidth - labelColWidth) / daysInMonth;
    const headerHeight = 22;
    const titleHeight = 70;
    const rowHeight = 18;

    doc.fontSize(22).fillColor(colors.titleText)
        .text(`PMDD Symptom Tracker — ${monthName} ${monthData.year}`, marginLeft, marginTop, {
            width: usableWidth, align: 'center',
        });

    const tableTop = marginTop + titleHeight;
    const [hR, hG, hB] = hexToRgb(colors.headerBg);

    doc.rect(marginLeft, tableTop, usableWidth, headerHeight).fill([hR, hG, hB] as any);
    doc.fontSize(8).fillColor(colors.headerText)
        .text('Symptom', marginLeft + 5, tableTop + 5, { width: labelColWidth - 10, align: 'center' });

    for (let d = 1; d <= daysInMonth; d++) {
        const x = marginLeft + labelColWidth + (d - 1) * dayColWidth;
        doc.fontSize(8).fillColor(colors.headerText)
            .text(String(d), x, tableTop + 5, { width: dayColWidth, align: 'center' });
    }

    const [lR, lG, lB] = hexToRgb(colors.gridLine);

    for (let row = 0; row < totalQuestions; row++) {
        const y = tableTop + headerHeight + row * rowHeight;
        const bgColor = row % 2 === 0 ? colors.rowEvenBg : colors.rowOddBg;
        const [rR, rG, rB] = hexToRgb(bgColor);

        doc.rect(marginLeft, y, usableWidth, rowHeight).fill([rR, rG, rB] as any);
        doc.rect(marginLeft, y, usableWidth, rowHeight)
            .lineWidth(0.5).strokeColor([lR, lG, lB] as any).stroke();

        doc.fontSize(8).fillColor(colors.cellText)
            .text(SYMPTOM_LABELS[row] ?? `Q${row + 1}`, marginLeft + 5, y + 4, {
                width: labelColWidth - 10, lineBreak: false,
            });

        for (let d = 1; d <= daysInMonth; d++) {
            const x = marginLeft + labelColWidth + (d - 1) * dayColWidth;
            doc.moveTo(x, y).lineTo(x, y + rowHeight)
                .lineWidth(0.25).strokeColor([lR, lG, lB] as any).stroke();

            const dayData = monthData.days.get(d);
            if (dayData) {
                const value = dayData.get(questionIds[row]);
                if (value) {
                    const [sR, sG, sB] = hexToRgb(getSeverityColor(value));
                    doc.rect(x + 0.5, y + 0.5, dayColWidth - 1, rowHeight - 1)
                        .fill([sR, sG, sB] as any);
                    doc.fontSize(8).fillColor(colors.cellText)
                        .text(value, x, y + 4, { width: dayColWidth, align: 'center' });
                }
            }
        }
    }

    doc.moveTo(marginLeft + labelColWidth, tableTop)
        .lineTo(marginLeft + labelColWidth, tableTop + headerHeight + totalQuestions * rowHeight)
        .lineWidth(1).strokeColor([lR, lG, lB] as any).stroke();

    doc.rect(marginLeft, tableTop, usableWidth, headerHeight + totalQuestions * rowHeight)
        .lineWidth(1.5).strokeColor([hR, hG, hB] as any).stroke();

    // Legend
    const legendY = tableTop + headerHeight + totalQuestions * rowHeight + 15;
    const legendItems = [
        { label: '1 - Not at all', color: colors.severity1 },
        { label: '2 - Minimal', color: colors.severity2 },
        { label: '3 - Mild', color: colors.severity3 },
        { label: '4 - Moderate', color: colors.severity4 },
        { label: '5 - Severe', color: colors.severity5 },
        { label: '6 - Extreme', color: colors.severity6 },
        { label: 'On period', color: colors.periodYes },
    ];

    doc.fontSize(10).fillColor(colors.titleText).text('Legend:', marginLeft, legendY);
    const legendStartX = marginLeft + 60;
    const legendItemWidth = 130;

    legendItems.forEach((item, i) => {
        const x = legendStartX + i * legendItemWidth;
        const [cR, cG, cB] = hexToRgb(item.color);
        doc.rect(x, legendY, 14, 14).fill([cR, cG, cB] as any)
            .strokeColor([lR, lG, lB] as any).lineWidth(0.5).stroke();
        doc.fontSize(9).fillColor(colors.cellText)
            .text(item.label, x + 18, legendY + 2, { width: 110 });
    });

    doc.fontSize(8).fillColor('#999999')
        .text('Generated by PMDD Tracker', marginLeft, legendY + 30, { width: usableWidth, align: 'center' });
}