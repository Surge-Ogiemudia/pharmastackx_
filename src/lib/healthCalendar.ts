export interface HealthEvent {
  name: string;
  month: number; // 1-12
  day: number | string; // number for specific day, string for descriptions like 'First Wednesday'
  description: string;
  suggestedPillars: string[];
}

// Nigerian and Global Health Awareness Days relevant to Pharmacies
export const healthCalendar: HealthEvent[] = [
  {
    name: 'World Cancer Day',
    month: 2,
    day: 4,
    description: 'Awareness on cancer prevention, detection, and treatment.',
    suggestedPillars: ['education', 'wellness']
  },
  {
    name: 'World Health Day',
    month: 4,
    day: 7,
    description: 'Global health awareness day.',
    suggestedPillars: ['wellness', 'spotlight']
  },
  {
    name: 'World Malaria Day',
    month: 4,
    day: 25,
    description: 'Highlighting the need for continued investment and sustained political commitment for malaria prevention and control.',
    suggestedPillars: ['education', 'spotlight'] // Perfect for ACTs, mosquito nets, repellents
  },
  {
    name: 'World Hypertension Day',
    month: 5,
    day: 17,
    description: 'Promoting public awareness of hypertension and encouraging citizens to prevent and control this silent killer.',
    suggestedPillars: ['education', 'wellness'] // BP monitors, low-sodium supplements
  },
  {
    name: 'World Sickle Cell Day',
    month: 6,
    day: 19,
    description: 'Increase public knowledge and understanding of sickle cell disease.',
    suggestedPillars: ['education', 'wellness'] // Folic acid, antimalarials, pain management
  },
  {
    name: 'World Hepatitis Day',
    month: 7,
    day: 28,
    description: 'Raise global awareness of hepatitis.',
    suggestedPillars: ['education'] // Liver supplements
  },
  {
    name: 'World Pharmacists Day',
    month: 9,
    day: 25,
    description: 'Celebrating the role of pharmacists in improving health globally.',
    suggestedPillars: ['custom', 'spotlight'] // Behind the scenes, meet the team
  },
  {
    name: 'World Mental Health Day',
    month: 10,
    day: 10,
    description: 'Raising awareness of mental health issues around the world.',
    suggestedPillars: ['wellness', 'education']
  },
  {
    name: 'World Diabetes Day',
    month: 11,
    day: 14,
    description: 'Global awareness campaign focusing on diabetes mellitus.',
    suggestedPillars: ['education', 'spotlight'] // Glucometers, sugar-free products
  },
  {
    name: 'World AIDS Day',
    month: 12,
    day: 1,
    description: 'Dedicated to raising awareness of the AIDS pandemic.',
    suggestedPillars: ['education', 'wellness']
  }
];

export const getUpcomingEvents = (daysAhead: number = 7): HealthEvent[] => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDate = today.getDate();

  return healthCalendar.filter((event) => {
    if (typeof event.day === 'number') {
      const isThisMonthAndUpcoming = event.month === currentMonth && event.day >= currentDate && event.day <= (currentDate + daysAhead);
      
      // Handle month wrap-around (e.g. it's Jan 28, event is Feb 2)
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const isNextMonthEarly = event.month === nextMonth && (event.day as number) <= daysAhead - (31 - currentDate);

      return isThisMonthAndUpcoming || isNextMonthEarly;
    }
    return false; // Complex string-based dates like "First Wednesday" need advanced parsing, skipped for MVP
  });
};
