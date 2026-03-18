export class Question {
    id!: number;
    text!: string;
    responseType!: string; // 'severity' or 'yes_no'

    static Create(): string {
        return `CREATE TABLE IF NOT EXISTS Questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            responseType TEXT NOT NULL DEFAULT 'severity'
        )`;
    }
}