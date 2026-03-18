export class ProvidedAnswer {
    id!: number;
    questionId!: number;
    answerId!: number;
    providedBy!: string;
    dateProvided!: string;

    static Create(): string {
        return `CREATE TABLE IF NOT EXISTS ProvidedAnswers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            questionId INTEGER NOT NULL,
            answerId INTEGER NOT NULL,
            providedBy TEXT NOT NULL,
            dateProvided TEXT NOT NULL,
            FOREIGN KEY (questionId) REFERENCES Questions(id),
            FOREIGN KEY (answerId) REFERENCES Answers(id),
            UNIQUE(questionId, providedBy, dateProvided)
        )`;
    }
}