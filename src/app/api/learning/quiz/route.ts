import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALL_QUESTIONS = [
    // --- PHARMACIST: EASY ---
    {
        id: 'q1_easy',
        type: 'pharmacist',
        difficulty: 'easy',
        question: 'Which of the following is an over-the-counter (OTC) medication commonly used to relieve mild to moderate pain and reduce fever?',
        options: ['Amoxicillin', 'Paracetamol (Acetaminophen)', 'Levothyroxine', 'Lisinopril'],
        correctIndex: 1,
        explanation: 'Paracetamol is a widely used OTC analgesic and antipyretic. The others are prescription medications.'
    },
    {
        id: 'q2_easy',
        type: 'pharmacist',
        difficulty: 'easy',
        question: 'What is the most common side effect of first-generation antihistamines like Diphenhydramine (Benadryl)?',
        options: ['Insomnia', 'Drowsiness/Sedation', 'Hypertension', 'Increased appetite'],
        correctIndex: 1,
        explanation: 'First-generation antihistamines easily cross the blood-brain barrier, leading to significant sedation and drowsiness.'
    },
    {
        id: 'q3_easy',
        type: 'pharmacist',
        difficulty: 'easy',
        question: 'Which vitamin is essential for blood clotting and is often given to newborns?',
        options: ['Vitamin C', 'Vitamin D', 'Vitamin K', 'Vitamin B12'],
        correctIndex: 2,
        explanation: 'Vitamin K is required for the synthesis of coagulation factors II, VII, IX, and X in the liver.'
    },

    // --- PHARMACIST: HARD ---
    {
        id: 'q1_hard',
        type: 'pharmacist',
        difficulty: 'hard',
        question: 'A patient is taking Warfarin. Which of these OTC medications should they categorically avoid?',
        options: ['Loratadine (Claritin)', 'Paracetamol (Tylenol)', 'Ibuprofen (Advil)', 'Guaifenesin'],
        correctIndex: 2,
        explanation: 'Ibuprofen (an NSAID) can increase the risk of bleeding when taken with Warfarin and can displace Warfarin from protein binding sites, increasing its active concentration.'
    },
    {
        id: 'q2_hard',
        type: 'pharmacist',
        difficulty: 'hard',
        question: 'What is the most common side effect of ACE inhibitors like Lisinopril?',
        options: ['Persistent dry cough', 'Hypokalemia', 'Bradycardia', 'Gingival hyperplasia'],
        correctIndex: 0,
        explanation: 'A persistent, dry, hacking cough is a well-known side effect of ACE inhibitors, caused by the accumulation of bradykinin in the lungs.'
    },
    {
        id: 'q3_hard',
        type: 'pharmacist',
        difficulty: 'hard',
        question: 'Which antibiotic class is widely known to carry a Black Box Warning for increased risk of tendon rupture?',
        options: ['Macrolides', 'Fluoroquinolones', 'Cephalosporins', 'Tetracyclines'],
        correctIndex: 1,
        explanation: 'Fluoroquinolones (like Ciprofloxacin and Levofloxacin) carry a Black Box Warning for tendinitis and tendon rupture, especially in older adults or those concurrently taking corticosteroids.'
    },

    // --- PHARMACIST: EXCEPTIONAL ---
    {
        id: 'q1_exceptional',
        type: 'pharmacist',
        difficulty: 'exceptional',
        question: 'Which of the following describes the primary mechanism of action of Entresto (sacubitril/valsartan) in heart failure?',
        options: ['Inhibition of sodium-potassium ATPase', 'Neprilysin inhibition paired with Angiotensin II receptor blockade', 'Direct vasodilation of arterial smooth muscle', 'Selective beta-1 adrenergic antagonism'],
        correctIndex: 1,
        explanation: 'Entresto is an ARNI. Sacubitril inhibits neprilysin (preventing degradation of natriuretic peptides), while valsartan blocks the angiotensin II type-1 receptor.'
    },
    {
        id: 'q2_exceptional',
        type: 'pharmacist',
        difficulty: 'exceptional',
        question: 'A patient is started on Clozapine. What critical, potentially fatal hematologic lab anomaly must be strictly monitored via the REMS program?',
        options: ['Aplastic Anemia', 'Severe Neutropenia (Agranulocytosis)', 'Thrombocytopenic Purpura (TTP)', 'Hemolytic Uremia'],
        correctIndex: 1,
        explanation: 'Clozapine can cause severe neutropenia (agranulocytosis). The absolute neutrophil count (ANC) must be strictly monitored before and during treatment.'
    },
    {
        id: 'q3_exceptional',
        type: 'pharmacist',
        difficulty: 'exceptional',
        question: 'Which antifungal agent exerts its action by inhibiting the synthesis of Beta (1,3)-D-glucan, an essential component of the fungal cell wall?',
        options: ['Amphotericin B', 'Fluconazole', 'Caspofungin', 'Terbinafine'],
        correctIndex: 2,
        explanation: 'Caspofungin is an echinocandin. Echinocandins work by non-competitively inhibiting the synthesis of beta (1,3)-D-glucan, compromising fungal cell wall integrity.'
    },

    // --- PATIENT: EASY ---
    {
        id: 'p1_easy',
        type: 'patient',
        difficulty: 'easy',
        question: 'How much water is generally recommended for an average healthy adult to purely drink per day?',
        options: ['2-3 cups', '8-10 glasses (about 2-2.5 liters)', '5 liters minimum', 'Only when you feel extremely thirsty'],
        correctIndex: 1,
        explanation: 'While it varies by person, the general "8x8 rule" (8 glasses of 8 ounces) or roughly 2-2.5 liters is a great baseline for staying hydrated.'
    },
    {
        id: 'p2_easy',
        type: 'patient',
        difficulty: 'easy',
        question: 'Which of the following foods is naturally highest in Vitamin C?',
        options: ['Bananas', 'Chicken Breast', 'Red Bell Peppers', 'Oatmeal'],
        correctIndex: 2,
        explanation: 'Red bell peppers contain almost three times more Vitamin C than an orange! They are fantastic for your immune system.'
    },
    {
        id: 'p3_easy',
        type: 'patient',
        difficulty: 'easy',
        question: 'What is the recommended average amount of sleep for an adult?',
        options: ['4-5 hours', '7-9 hours', '10-12 hours', 'It doesn\'t matter'],
        correctIndex: 1,
        explanation: 'Most adults need 7 to 9 hours of quality sleep per night to function at their best.'
    },
    
    // --- PATIENT: HARD ---
    {
        id: 'p1_hard',
        type: 'patient',
        difficulty: 'hard',
        question: 'Why is it important to complete a full prescribed course of antibiotics, even if you feel better after a few days?',
        options: ['To save the leftover pills for next time', 'To prevent the bacteria from developing resistance', 'Because stopping early causes a viral infection instead', 'To build tolerance to the antibiotic'],
        correctIndex: 1,
        explanation: 'Stopping antibiotics early can leave behind the strongest bacteria, which can then multiply and become resistant to that antibiotic in the future.'
    },
    {
        id: 'p2_hard',
        type: 'patient',
        difficulty: 'hard',
        question: 'Which type of dietary fat is generally considered the most "heart healthy"?',
        options: ['Saturated fats (like butter)', 'Trans fats (like partially hydrogenated oils)', 'Monounsaturated fats (like olive oil)', 'Cholesterol'],
        correctIndex: 2,
        explanation: 'Monounsaturated fats (found in olive oil, avocados, and nuts) can help lower bad cholesterol levels and reduce the risk of heart disease.'
    },
    {
        id: 'p3_hard',
        type: 'patient',
        difficulty: 'hard',
        question: 'Which of these is a symptom of severe dehydration?',
        options: ['Increased energy', 'Extreme thirst and dark yellow urine', 'Slow heart rate', 'Sweating profusely'],
        correctIndex: 1,
        explanation: 'Dark urine and extreme thirst are key indicators that your body needs urgent rehydration.'
    },

    // --- PATIENT: EXCEPTIONAL ---
    {
        id: 'p1_exceptional',
        type: 'patient',
        difficulty: 'exceptional',
        question: 'Which of the following statements about probiotics and the microbiome is most accurate?',
        options: ['Probiotics permanently change your genetic DNA', 'Probiotics are only useful after taking antibiotics', 'They supply beneficial live bacteria that help balance your gut flora', 'All fermented foods contain the exact same bacterial strains'],
        correctIndex: 2,
        explanation: 'Probiotics introduce beneficial live microorganisms into the gut, helping balance your intestinal flora which supports digestion and immune function.'
    },
    {
        id: 'p2_exceptional',
        type: 'patient',
        difficulty: 'exceptional',
        question: 'What is the primary role of "electrolytes" (like sodium, potassium, and magnesium) in your body?',
        options: ['They act as the main source of calories', 'They help transmit electrical signals for muscle and nerve function', 'They replace the need for physical exercise', 'They prevent all forms of viral infections'],
        correctIndex: 1,
        explanation: 'Electrolytes are minerals that carry an electrical charge. They are crucial for maintaining fluid balance, nerve transmission, and muscle contractions, including your heartbeat.'
    }
];

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const difficulty = url.searchParams.get('difficulty') || 'easy';
        const type = url.searchParams.get('type') || 'pharmacist';

        // Filter questions by difficulty and type
        const filtered = ALL_QUESTIONS.filter(q => q.difficulty === difficulty && q.type === type);

        // Randomly select up to 3 questions
        const shuffled = [...filtered].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        
        return NextResponse.json(selected, { status: 200 });
    } catch (error) {
        console.error('Quiz GET API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
