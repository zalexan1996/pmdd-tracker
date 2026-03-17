import { createReadStream, existsSync } from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';

const CSV_FILE_PATH = 'pmdd_data.csv';

// CSV headers
const CSV_HEADERS = [
  { id: 'userId', title: 'User ID' },
  { id: 'username', title: 'Username' },
  { id: 'date', title: 'Date' },
  { id: 'q1', title: 'Q1' },
  { id: 'q2', title: 'Q2' },
  { id: 'q3', title: 'Q3' },
  { id: 'q4', title: 'Q4' },
  { id: 'q5', title: 'Q5' },
  { id: 'q6', title: 'Q6' },
  { id: 'q7', title: 'Q7' },
  { id: 'q8', title: 'Q8' },
  { id: 'q9', title: 'Q9' },
  { id: 'q10', title: 'Q10' },
  { id: 'q11', title: 'Q11' },
  { id: 'q12', title: 'Q12' },
  { id: 'q13', title: 'Q13' },
  { id: 'q14', title: 'Q14' },
  { id: 'q15', title: 'Q15' }
];

export interface SymptomRecord {
  userId: string;
  username: string;
  date: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  q7: string;
  q8: string;
  q9: string;
  q10: string;
  q11: string;
  q12: string;
  q13: string;
  q14: string;
  q15: string;
}

/**
 * Reads all existing records from the CSV file
 */
export async function readAllRecords(): Promise<SymptomRecord[]> {
  if (!existsSync(CSV_FILE_PATH)) {
    return [];
  }
  
  return new Promise((resolve, reject) => {
    const records: SymptomRecord[] = [];
    
    createReadStream(CSV_FILE_PATH)
      .pipe(csv({
        mapHeaders: ({ header }: { header: string }) =>
          header === 'User ID' ? 'userId' :
          header === 'Username' ? 'username' :
          header === 'Date' ? 'date' :
          header.toLowerCase()
      }))
      .on('data', (data) => records.push(data as SymptomRecord))
      .on('end', () => resolve(records))
      .on('error', (error) => reject(error));
  });
}

/**
 * Writes all records to the CSV file
 */
async function writeAllRecords(records: SymptomRecord[]): Promise<void> {
  const csvWriter = createObjectCsvWriter({
    path: CSV_FILE_PATH,
    header: CSV_HEADERS
  });
  
  await csvWriter.writeRecords(records);
}

/**
 * Saves symptom data for a user on a specific date
 * If an entry already exists for this user+date, it will be replaced
 */
export async function saveSymptomData(
  userId: string,
  username: string,
  date: string,
  responses: string[]
): Promise<void> {
  if (responses.length !== 15) {
    throw new Error('Expected 14 responses');
  }
  
  // Create the new record
  const newRecord: SymptomRecord = {
    userId,
    username,
    date,
    q1: responses[0],
    q2: responses[1],
    q3: responses[2],
    q4: responses[3],
    q5: responses[4],
    q6: responses[5],
    q7: responses[6],
    q8: responses[7],
    q9: responses[8],
    q10: responses[9],
    q11: responses[10],
    q12: responses[11],
    q13: responses[12],
    q14: responses[13],
    q15: responses[14],
  };
  
  // Read existing records
  const existingRecords = await readAllRecords();
  
  // Find and remove any existing record for this user+date combination
  const filteredRecords = existingRecords.filter(
    record => !(record.userId === userId && record.date === date)
  );
  
  // Add the new record
  filteredRecords.push(newRecord);
  
  // Write all records back to the file
  await writeAllRecords(filteredRecords);
  
  console.log(`💾 Saved symptom data: ${username} (${userId}) on ${date}`);
}

/**
 * Clears all data for a specific user from the CSV file
 */
export async function clearUserData(userId: string): Promise<number> {
  const records = await readAllRecords();
  const remaining = records.filter(r => r.userId !== userId);
  await writeAllRecords(remaining);
  const removed = records.length - remaining.length;
  console.log(`🗑️  Cleared ${removed} records for user ${userId}`);
  return removed;
}

/**
 * Clears all data from the CSV file (keeps headers)
 */
export async function clearAllData(): Promise<void> {
  // Write an empty array, which creates a file with just headers
  await writeAllRecords([]);
  console.log('🗑️  Cleared all symptom data from CSV');
}

/**
 * Gets records for a specific user as a CSV string
 */
export async function getUserCsvString(userId: string): Promise<string> {
  const records = await readAllRecords();
  const filtered = records.filter(r => r.userId === userId);
  const header = CSV_HEADERS.map(h => h.title).join(',');
  const rows = filtered.map(r =>
    [r.userId, r.username, r.date, r.q1, r.q2, r.q3, r.q4, r.q5, r.q6, r.q7, r.q8, r.q9, r.q10, r.q11, r.q12, r.q13, r.q14, r.q15].join(',')
  );
  return [header, ...rows].join('\n');
}

/**
 * Checks if the CSV file exists
 */
export function csvFileExists(): boolean {
  return existsSync(CSV_FILE_PATH);
}

/**
 * Gets the path to the CSV file
 */
export function getCsvFilePath(): string {
  return path.resolve(CSV_FILE_PATH);
}

/**
 * Gets the count of records in the CSV file, optionally filtered by userId
 */
export async function getRecordCount(userId?: string): Promise<number> {
  const records = await readAllRecords();
  if (userId) return records.filter(r => r.userId === userId).length;
  return records.length;
}
