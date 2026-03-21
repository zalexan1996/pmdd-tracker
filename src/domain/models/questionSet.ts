export class QuestionSet {
    id!: number;
    name!: string;

    static Create(): string {
        return `CREATE TABLE IF NOT EXISTS QuestionSets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )`;
    }

    static CreateJoin(): string {
        return `CREATE TABLE IF NOT EXISTS QuestionSetQuestions (
            questionSetId INTEGER NOT NULL,
            questionId INTEGER NOT NULL,
            PRIMARY KEY (questionSetId, questionId),
            FOREIGN KEY (questionSetId) REFERENCES QuestionSets(id),
            FOREIGN KEY (questionId) REFERENCES Questions(id)
        )`;
    }
}
