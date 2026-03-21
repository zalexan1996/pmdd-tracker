import Sqlite3 from "better-sqlite3";
import { Answer } from "../models/answer.js";
import { Question } from "../models/question.js";
import { QuestionSet } from "../models/questionSet.js";
import { ProvidedAnswer } from "../models/providedAnswer.js";

export interface ProvidedAnswerRow {
    id: number;
    questionId: number;
    answerId: number;
    providedBy: string;
    dateProvided: string;
    answerValue: string;
    answerText: string;
    questionText: string;
    responseType: string;
}

export class DatabaseService {
    private db: Sqlite3.Database;

    constructor(fileName: string) {
        this.db = new Sqlite3(fileName);
        this.db.pragma('journal_mode = WAL');
    }

    // ── Schema ──────────────────────────────────────────────

    create(): void {
        this.db.exec(Question.Create());
        this.db.exec(Answer.Create());
        this.db.exec(ProvidedAnswer.Create());
    }

    // ── Questions ───────────────────────────────────────────

    getQuestions(): Question[] {
        return this.db.prepare(`SELECT * FROM Questions ORDER BY id`).all() as Question[];
    }

    insertQuestion(text: string, responseType: string): number {
        const result = this.db.prepare(
            `INSERT INTO Questions (text, responseType) VALUES (?, ?)`
        ).run(text, responseType);
        return result.lastInsertRowid as number;
    }

    getQuestionCount(): number {
        const row = this.db.prepare(`SELECT COUNT(*) as count FROM Questions`).get() as { count: number };
        return row.count;
    }

    // ── Answers ─────────────────────────────────────────────

    getAnswersForQuestion(questionId: number): Answer[] {
        return this.db.prepare(
            `SELECT * FROM Answers WHERE questionId = ? ORDER BY id`
        ).all(questionId) as Answer[];
    }

    insertAnswer(text: string, value: string, questionId: number): number {
        const result = this.db.prepare(
            `INSERT INTO Answers (text, value, questionId) VALUES (?, ?, ?)`
        ).run(text, value, questionId);
        return result.lastInsertRowid as number;
    }

    // ── Provided Answers ────────────────────────────────────

    saveProvidedAnswers(providedBy: string, dateProvided: string, responses: { questionId: number; answerId: number }[]): void {
        const insertStmt = this.db.prepare(
            `INSERT INTO ProvidedAnswers (questionId, answerId, providedBy, dateProvided)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(questionId, providedBy, dateProvided)
             DO UPDATE SET answerId = excluded.answerId`
        );

        const transaction = this.db.transaction((items: { questionId: number; answerId: number }[]) => {
            for (const item of items) {
                insertStmt.run(item.questionId, item.answerId, providedBy, dateProvided);
            }
        });

        transaction(responses);
    }

    getProvidedAnswersForUser(providedBy: string): ProvidedAnswerRow[] {
        return this.db.prepare(`
            SELECT
                pa.id, pa.questionId, pa.answerId, pa.providedBy, pa.dateProvided,
                a.value AS answerValue, a.text AS answerText,
                q.text AS questionText, q.responseType
            FROM ProvidedAnswers pa
            JOIN Answers a ON pa.answerId = a.id
            JOIN Questions q ON pa.questionId = q.id
            WHERE pa.providedBy = ?
            ORDER BY pa.dateProvided, pa.questionId
        `).all(providedBy) as ProvidedAnswerRow[];
    }

    getProvidedAnswerCountForUser(providedBy: string): number {
        const row = this.db.prepare(
            `SELECT COUNT(DISTINCT dateProvided) as count FROM ProvidedAnswers WHERE providedBy = ?`
        ).get(providedBy) as { count: number };
        return row.count;
    }

    clearProvidedAnswersForUser(providedBy: string): number {
        const result = this.db.prepare(
            `DELETE FROM ProvidedAnswers WHERE providedBy = ?`
        ).run(providedBy);
        return result.changes;
    }

    getAnswerIdByQuestionAndValue(questionId: number, value: string): number | undefined {
        const row = this.db.prepare(
            `SELECT id FROM Answers WHERE questionId = ? AND value = ?`
        ).get(questionId, value) as { id: number } | undefined;
        return row?.id;
    }

    // ── Question Sets ────────────────────────────────────

    getQuestionsForSet(questionSetId: number): Question[] {
        return this.db.prepare(
            `SELECT q.* FROM Questions q
             JOIN QuestionSetQuestions qsq ON q.id = qsq.questionId
             WHERE qsq.questionSetId = ?
             ORDER BY q.id`
        ).all(questionSetId) as Question[];
    }

    createQuestionSetTables(): void {
        this.db.exec(QuestionSet.Create());
        this.db.exec(QuestionSet.CreateJoin());
    }

    getQuestionSetCount(): number {
        const row = this.db.prepare(`SELECT COUNT(*) as count FROM QuestionSets`).get() as { count: number };
        return row.count;
    }

    insertQuestionSet(name: string): number {
        const result = this.db.prepare(
            `INSERT INTO QuestionSets (name) VALUES (?)`
        ).run(name);
        return result.lastInsertRowid as number;
    }

    linkQuestionToSet(questionSetId: number, questionId: number): void {
        this.db.prepare(
            `INSERT INTO QuestionSetQuestions (questionSetId, questionId) VALUES (?, ?)`
        ).run(questionSetId, questionId);
    }

    close(): void {
        this.db.close();
    }
}