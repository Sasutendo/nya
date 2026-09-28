import type { NursingSkill, StudyCard, StudyReflection } from '../types'

const now = new Date().toISOString()
const today = now.slice(0, 10)

export const DEMO_STUDY_CARDS: StudyCard[] = [
  { id: 'demo_card_1', question: 'What are the five moments for hand hygiene?', answer: 'Before touching a patient; before a clean or aseptic procedure; after body-fluid exposure risk; after touching a patient; after touching patient surroundings.', category: 'Hygiene', createdAt: now, updatedAt: now },
  { id: 'demo_card_2', question: 'What does SBAR stand for?', answer: 'Situation, Background, Assessment and Recommendation.', category: 'Communication', createdAt: now, updatedAt: now },
  { id: 'demo_card_3', question: 'What should I do if I am unsure during practical care?', answer: 'Pause, keep the person safe, follow current local guidance and ask the qualified supervisor responsible for the situation.', category: 'Safe learning', createdAt: now, updatedAt: now },
]

export const DEMO_NURSING_SKILLS: NursingSkill[] = [
  { id: 'demo_skill_1', title: 'Measure and document vital signs', category: 'Core care', status: 'practising', notes: 'Focus on a calm explanation and accurate documentation.', createdAt: now, updatedAt: now },
  { id: 'demo_skill_2', title: 'Perform hygienic hand disinfection', category: 'Hygiene', status: 'confident', notes: 'Keep reviewing all indications, not only the technique.', createdAt: now, updatedAt: now },
  { id: 'demo_skill_3', title: 'Give a structured handover', category: 'Communication', status: 'learning', notes: 'Practise with a short SBAR-style structure.', createdAt: now, updatedAt: now },
]

export const DEMO_STUDY_REFLECTIONS: StudyReflection[] = [
  { id: 'demo_reflection_1', date: today, win: 'I made a calm start and organised the next steps.', learned: 'Short active-recall rounds feel easier than rereading everything.', revisit: 'Create cards for the first anatomy topic.', createdAt: now, updatedAt: now },
]
