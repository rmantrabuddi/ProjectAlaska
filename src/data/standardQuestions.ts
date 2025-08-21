import { StandardQuestion } from '../types';

export const STANDARD_INTERVIEW_QUESTIONS: StandardQuestion[] = [
  // Licensing & Permits Overview
  { id: 'q1', question: 'Can you briefly describe the licenses and permits your Department issues to Alaskan citizens and businesses?', category: 'licensing' },
  { id: 'q2', question: 'Which licenses and permits are issued the most frequently?', category: 'licensing' },
  { id: 'q3', question: 'Which licenses and permits take the longest time to process?', category: 'licensing' },
  { id: 'q4', question: 'How long does it typically take to issue a license or permit?', category: 'licensing' },
  { id: 'q5', question: 'What policies and procedures govern licensing and permitting within your department?', category: 'licensing' },
  
  // Cross-Departmental & Processes
  { id: 'q6', question: 'Please describe any cross-departmental interactions and overlapping permits (e.g., mining permits for DNR and DEC).', category: 'processes' },
  { id: 'q7', question: 'Which of your licenses and permits require approval from personnel outside of your department?', category: 'processes' },
  
  // Challenges
  { id: 'q8', question: 'What are the biggest challenges facing your department, with regards to licensing and permits?', category: 'challenges' },
  { id: 'q9', question: 'What are the biggest challenges that Alaskan citizens/applicants face with regards to licensing and permits?', category: 'challenges' },
  { id: 'q10', question: 'Are there any inefficiencies in your department\'s licensing and permitting processes?', category: 'challenges' },
  { id: 'q11', question: 'Can you describe what is working well within the licensing and permitting processes? (i.e., what are your Department\'s strengths?)', category: 'processes' },
  
  // Staffing & People
  { id: 'q12', question: 'How many people in your Department support the licensing and permitting process(es)?', category: 'staffing' },
  { id: 'q13', question: 'How many people perform the same role within your Department?', category: 'staffing' },
  { id: 'q14', question: 'How long, on average, have people been in their positions?', category: 'staffing' },
  { id: 'q15', question: 'Are there any People challenges with your Department?', category: 'staffing' },
  { id: 'q16', question: 'Are there any skill challenges or staffing gaps related to the license and permitting system technology areas?', category: 'staffing' },
  
  // Initiatives
  { id: 'q17', question: 'Can you please describe any ongoing or planned initiatives your Department is undertaking in regard to licensing and permitting.', category: 'initiatives' },
  
  // Technology Systems
  { id: 'q18', question: 'Is there one back-end system that governs your licensing and permitting processes?', category: 'technology' },
  { id: 'q19', question: 'Please elaborate on your standards and guidelines related to technology, hardware and software?', category: 'technology' },
  { id: 'q20', question: 'Please describe the systems/applications your Department uses to process licenses and permits.', category: 'technology' },
  { id: 'q21', question: 'What data analytics reporting features do your current systems have?', category: 'technology' },
  { id: 'q22', question: 'Please describe what portion of the licensing and permitting process is digitized and automated?', category: 'technology' },
  { id: 'q23', question: 'Are there any workloads on legacy or outdated systems? What workloads are most urgent to migrate off those (for example mainframe)?', category: 'technology' },
  { id: 'q24', question: 'Please describe any known issues and challenges with these license and permit systems or applications?', category: 'technology' },
  { id: 'q25', question: 'What limitations currently exist in your IT infrastructure? (e.g., legacy systems, lack of integration)', category: 'technology' },
  { id: 'q26', question: 'Where are bottlenecks (if any) in cross-departmental license and permitting data sharing? Any systems that are black boxes with no visibility?', category: 'technology' },
  
  // Compliance
  { id: 'q27', question: 'How does your Department ensure compliance with regulations?', category: 'compliance' },
  { id: 'q28', question: 'Have there been any compliance or audit-related issues with the license and permitting processes?', category: 'compliance' },
  
  // Revenue
  { id: 'q29', question: 'Do you experience revenue or cost challenges with your permits and licenses?', category: 'revenue' },
  { id: 'q30', question: 'Additional comments or observations?', category: 'licensing' }
];

export const QUESTION_CATEGORIES = {
  licensing: { label: 'Licensing & Permits', color: 'bg-blue-100 text-blue-700' },
  processes: { label: 'Processes & Procedures', color: 'bg-green-100 text-green-700' },
  challenges: { label: 'Challenges & Issues', color: 'bg-red-100 text-red-700' },
  staffing: { label: 'Staffing & People', color: 'bg-purple-100 text-purple-700' },
  initiatives: { label: 'Initiatives & Planning', color: 'bg-yellow-100 text-yellow-700' },
  technology: { label: 'Technology & Systems', color: 'bg-indigo-100 text-indigo-700' },
  compliance: { label: 'Compliance & Regulations', color: 'bg-orange-100 text-orange-700' },
  revenue: { label: 'Revenue & Costs', color: 'bg-pink-100 text-pink-700' }
};