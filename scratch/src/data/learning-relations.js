import { LEARNING_SUBJECTS, getLearningSubject, getTopicById } from './learning-content.js';

const LESSONS_PER_TOPIC = 5;

function buildLessonTitle(topicTitle, idx) {
  if (idx === 1) return `${topicTitle}: Foundations`;
  if (idx === 2) return `${topicTitle}: Deep Dive`;
  if (idx === 3) return `${topicTitle}: Systems Perspective`;
  if (idx === 4) return `${topicTitle}: Interview & Pitfalls`;
  return `${topicTitle}: Revision Sprint`;
}

function buildLessonSummary(topic, idx) {
  if (idx === 1) return topic.content.beginnerExplanation || 'Core fundamentals and baseline understanding.';
  if (idx === 2) return topic.content.intuition || 'Advanced intuition, trade-offs, and implementation detail.';
  if (idx === 3) return topic.content.realWorldUse || `Production architecture and implementation decisions for ${topic.title}.`;
  if (idx === 4) return `Interview framing, trade-offs, and common pitfalls for ${topic.title}.`;
  return `Fast revision checklist, self-test prompts, and memory hooks for ${topic.title}.`;
}

export function buildLearningGraph() {
  const subjects = Object.values(LEARNING_SUBJECTS).map((subject) => ({
    id: subject.id,
    title: subject.title,
    shortTitle: subject.shortTitle,
    summary: subject.summary,
    stages: subject.stages,
  }));

  const topics = [];
  const lessons = [];
  const lessonProblems = [];

  subjects.forEach((subject) => {
    const full = getLearningSubject(subject.id);
    (full?.topics || []).forEach((topic, topicIndex) => {
      topics.push({
        id: topic.id,
        subjectId: subject.id,
        title: topic.title,
        stage: topic.stage,
        orderIndex: topicIndex + 1,
        estimatedMins: topic.estimatedMins || 18,
      });

      for (let i = 1; i <= LESSONS_PER_TOPIC; i += 1) {
        const lessonId = `${subject.id}-${topic.id}-l${i}`;
        lessons.push({
          id: lessonId,
          subjectId: subject.id,
          topicId: topic.id,
          title: buildLessonTitle(topic.title, i),
          summary: buildLessonSummary(topic, i),
          objective:
            i === 1
              ? (topic.content.beginnerExplanation || topic.title)
              : i === 2
                ? (topic.content.intuition || topic.title)
                : i === 3
                  ? (topic.content.realWorldUse || topic.title)
                  : i === 4
                    ? `Explain ${topic.title} with trade-offs and edge cases in interview-ready language.`
                    : `Revise ${topic.title} quickly with retention-oriented checkpoints and likely traps.`,
          orderIndex: i,
          content: topic.content,
          revisionNotes: topic.content.revisionNotes || [],
          practiceQuestions: topic.practiceQuestions || [],
          quiz: topic.quiz || [],
        });

        (topic.practiceQuestions || []).forEach((question, questionIndex) => {
          lessonProblems.push({
            id: `${lessonId}-p${questionIndex + 1}`,
            lessonId,
            title: question,
            difficulty: i === 1 ? 'Easy' : i === 2 ? 'Medium' : 'Hard',
          });
        });
      }
    });
  });

  return { subjects, topics, lessons, lessonProblems };
}

export function getTopicsBySubject(subjectId) {
  const graph = buildLearningGraph();
  return graph.topics.filter((topic) => topic.subjectId === subjectId);
}

export function getLessonsByTopic(topicId) {
  const graph = buildLearningGraph();
  return graph.lessons.filter((lesson) => lesson.topicId === topicId).sort((a, b) => a.orderIndex - b.orderIndex);
}

export function getLessonById(lessonId) {
  const graph = buildLearningGraph();
  return graph.lessons.find((lesson) => lesson.id === lessonId) || null;
}

export function getTopicContext(subjectId, topicId) {
  const subject = getLearningSubject(subjectId);
  const topic = getTopicById(subjectId, topicId);
  return { subject, topic };
}

