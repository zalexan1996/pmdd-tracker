import { DatabaseService, ProvidedAnswerRow } from '../../domain/services/database-service.js';
import { SYMPTOM_LABELS } from '../../form-interaction/constants.js';

export function exportCsv(db: DatabaseService, userId: string): string {
    const rows = db.getProvidedAnswersForUser(userId);

    if (rows.length === 0) {
        return '';
    }

    const questions = db.getQuestions();
    const header = ['Date', ...questions.map((_, i) => SYMPTOM_LABELS[i] ?? `Q${i + 1}`)].join(',');

    // Group rows by date
    const byDate = new Map<string, Map<number, string>>();
    for (const row of rows) {
        if (!byDate.has(row.dateProvided)) {
            byDate.set(row.dateProvided, new Map());
        }
        byDate.get(row.dateProvided)!.set(row.questionId, row.answerValue);
    }

    const csvRows: string[] = [header];
    for (const [date, answers] of byDate) {
        const values = questions.map(q => answers.get(q.id) ?? '');
        csvRows.push([date, ...values].join(','));
    }

    return csvRows.join('\n');
}