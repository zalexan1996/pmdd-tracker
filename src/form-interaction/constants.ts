export const QUESTIONS: { text: string; responseType: 'severity' | 'yes_no' }[] = [
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

export const SEVERITY_OPTIONS = [
    { label: '1 - Not at all', value: '1' },
    { label: '2 - Minimal', value: '2' },
    { label: '3 - Mild', value: '3' },
    { label: '4 - Moderate', value: '4' },
    { label: '5 - Severe', value: '5' },
    { label: '6 - Extreme', value: '6' },
];

export const YES_NO_OPTIONS = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
];

export const SYMPTOM_LABELS = [
    'Depressed/sad/hopeless',
    'Anxious/tense/on edge',
    'Mood swings/sensitive',
    'Angry/irritable',
    'Less interest in activities',
    'Difficulty concentrating',
    'Lethargic/tired/fatigued',
    'Increased appetite/cravings',
    'Sleep changes',
    'Overwhelmed/out of control',
    'Physical symptoms',
    'Reduced productivity',
    'Avoided social activities',
    'Interfered with relationships',
    'On period',
];