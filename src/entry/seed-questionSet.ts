import { DatabaseService } from '../domain/services/database-service.js';
import { ConfigurationManager } from '../core/configuration-manager.js';
import { DiscordSettings } from '../discord-settings.js';

const configManager = new ConfigurationManager();
configManager.loadJson('appsettings.json');
const settings = configManager.bind(DiscordSettings);

const DB_PATH = settings.DbPath;

async function seedQuestionSet() {
    const db = new DatabaseService(DB_PATH);

    console.log('🗄️  Creating QuestionSet tables...');
    db.createQuestionSetTables();

    const existing = db.getQuestionSetCount();
    if (existing > 0) {
        console.log('ℹ️  QuestionSet already seeded, skipping.');
    } else {
        console.log('📝 Seeding default question set...');
        const questionSetId = db.insertQuestionSet('Default');

        const questions = db.getQuestions();
        for (const q of questions) {
            db.linkQuestionToSet(questionSetId, q.id);
        }
        console.log(`✅ Created question set "Default" with ${questions.length} questions.`);
    }

    db.close();
    console.log('🎉 QuestionSet seeding complete!');
}

seedQuestionSet().catch((error) => {
    console.error('❌ Error seeding question sets:', error);
    process.exit(1);
});
