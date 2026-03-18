export class Answer {
    id!: number;
    text!: string;
    value!: string;
    questionId!: number;

    static Create(): string {
        return `CREATE TABLE IF NOT EXISTS Answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            value TEXT NOT NULL,
            questionId INTEGER NOT NULL,
            FOREIGN KEY (questionId) REFERENCES Questions(id)
        )`;
    }
}