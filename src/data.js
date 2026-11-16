import { students } from './data/students.js';
import { cases } from './data/cases.js';
export const roster = students;
export const basePoints = [1000, 850, 700, 550, 400, 250, 100];
const studentsById = new Map(students.map(student => [student.id, student]));
const casesByDate = new Map(cases.filter(entry => entry.date).map(entry => [entry.date, entry]));
export function getMystery(date = null) {
  const entry = date === null ? cases.find(entry => entry.id === 'prototype-001') : casesByDate.get(date);
  if (!entry) return null;
  const student = studentsById.get(entry.studentId);
  if (!student) throw new Error(`Unknown case student: ${entry.studentId}`);
  return { ...entry, ...student, studentId: student.id, caseId: entry.id,
    portrait: '/assets/initials.svg',
    quote: 'Prototype case: these seven clues are placeholders, not biographical facts about Niseem.',
    signature: '', interests: [] };
}
export const mystery = getMystery();
