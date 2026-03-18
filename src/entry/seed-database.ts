import { existsSync, createReadStream } from 'fs';
import csv from 'csv-parser';
import { DatabaseService } from '../domain/services/database-service.js';
import { ConfigurationManager } from '../core/configuration-manager.js';
import { DiscordSettings } from '../discord-settings.js';

const configManager = new ConfigurationManager();
configManager.loadJson('appsettings.json');
const settings = configManager.bind(DiscordSettings);

const DB_PATH = settings.DbPath;
const CSV_FILE_PATH = 'pmdd_data.csv';

const questions: { text: string; responseType: string }[] = [
    { text: "Felt depressed, sad, down, or blue or felt hopeless; or felt worthless or guilty", responseType: "severity" },
    { text: "Felt anxious, tense, keyed up or on edge", responseType: "severity" },
    { text: "Had mood swings (i.e., suddenly feeling sad or tearful) or was sensitive to rejection or feelings were easily hurt", responseType: "severity" },
    { text: "Felt angry or irritable", responseType: "severity" },
    { text: "Had less interest in usual activities (work, school, friends, hobbies)", responseType: "severity" },
    { text: "Had difficulty concentrating", responseType: "severity" },
    { text: "Felt lethargic, tired, or fatigued; or had lack of energy", responseType: "severity" },
    { text: "Had increased appetite or overate; or had cravings for specific foods", responseType: "severity" },
    { text: "Slept more, took naps, found it hard to get up when intended; or had trouble getting to sleep or staying asleep", responseType: "severity" },
    { text: "Felt overwhelmed or unable to cope; or felt out of control", responseType: "severity" },
    { text: "Had breast tenderness, breast swelling, bloated sensation, weight gain, headache, joint or muscle pain, or other physical symptoms", responseType: "severity" },
    { text: "At work, school, home, or in daily routine, at least one of the problems noted above caused reduction of production of efficiency", responseType: "severity" },
    { text: "At least one of the problems noted above caused avoidance of or less participation in hobbies or social activities", responseType: "severity" },
    { text: "At least one of the problems noted above interfered with relationships with others", responseType: "severity" },
    { text: "Are you on your period?", responseType: "yes_no" },
];

const severityAnswers = [
    { text: '1 - Not at all', value: '1' },
    { text: '2 - Minimal', value: '2' },
    { text: '3 - Mild', value: '3' },
    { text: '4 - Moderate', value: '4' },
    { text: '5 - Severe', value: '5' },
    { text: '6 - Extreme', value: '6' },
];

const yesNoAnswers = [
    { text: 'Yes', value: 'yes' },
    { text: 'No', value: 'no' },
];

interface CsvRow {
    [key: string]: string;
}

function readCsvData(): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
        const records: CsvRow[] = [];
        createReadStream(CSV_FILE_PATH)
            .pipe(csv({
                mapHeaders: ({ header }: { header: string }) =>
                    header === 'User ID' ? 'userId' :
                    header === 'Username' ? 'username' :
                    header === 'Date' ? 'date' :
                    header.toLowerCase()
            }))
            .on('data', (data) => records.push(data))
            .on('end', () => resolve(records))
            .on('error', (error) => reject(error));
    });
}

async function seed() {
    const db = new DatabaseService(DB_PATH);

    console.log('🗄️  Creating database tables...');
    db.create();

    // Only seed questions/answers if the table is empty
    if (db.getQuestionCount() > 0) {
        console.log('ℹ️  Questions already seeded, skipping question/answer seeding.');
    } else {
        console.log('📝 Seeding questions and answers...');
        for (const q of questions) {
            const questionId = db.insertQuestion(q.text, q.responseType);
            const answers = q.responseType === 'yes_no' ? yesNoAnswers : severityAnswers;
            for (const a of answers) {
                db.insertAnswer(a.text, a.value, questionId);
            }
        }
        console.log(`✅ Seeded ${questions.length} questions with answers.`);
    }

    // Import existing CSV data if the file exists
    if (existsSync(CSV_FILE_PATH)) {
        console.log('📥 Found existing CSV file, importing data...');
        const csvRows = await readCsvData();
        const dbQuestions = db.getQuestions();
        let importedCount = 0;

        for (const row of csvRows) {
            const userId = row.userId;
            const date = row.date;
            if (!userId || !date) continue;

            const responses: { questionId: number; answerId: number }[] = [];
            for (let i = 0; i < dbQuestions.length; i++) {
                const qKey = `q${i + 1}`;
                const value = row[qKey];
                if (!value) continue;

                const answerId = db.getAnswerIdByQuestionAndValue(dbQuestions[i].id, value);
                if (answerId !== undefined) {
                    responses.push({ questionId: dbQuestions[i].id, answerId });
                }
            }

            if (responses.length > 0) {
                db.saveProvidedAnswers(userId, date, responses);
                importedCount++;
            }
        }
        console.log(`✅ Imported ${importedCount} records from CSV.`);
    } else {
        console.log('ℹ️  No existing CSV file found, skipping CSV import.');
    }

    db.close();
    console.log('🎉 Database seeding complete!');
}

seed().catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
});