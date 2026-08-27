// ============================================
// RESUME PARSER — Extract & Normalize
// Pure function: no side effects, no external dependencies
// ============================================

/**
 * Parse a resume string and extract normalized sections.
 * @param {string} rawText - Raw resume text
 * @returns {object} { rawText, cleanedText, sections }
 */
export function parseResume(rawText = '') {
  const text = String(rawText || '').trim();
  
  if (!text) {
    return {
      rawText: '',
      cleanedText: '',
      sections: {
        skills: [],
        projects: [],
        others: []
      }
    };
  }

  // Normalize: lowercase, remove extra whitespace, but preserve some structure
  const cleanedText = text
    .toLowerCase()
    .replace(/[^\w\s+#.,-]/g, ' ')  // Remove most symbols except +, #, ., comma, hyphen
    .replace(/\s+/g, ' ')            // Collapse whitespace
    .trim();

  // Split into lines for section detection
  const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean);

  // Simple section detection keywords
  const skillsKeywords = ['skill', 'technical skill', 'proficiency', 'expertise', 'tech stack', 'technologies', 'languages'];
  const projectKeywords = ['project', 'experience', 'work', 'achievement', 'responsibility', 'contribution'];
  const educationKeywords = ['education', 'degree', 'certification', 'course', 'training', 'university', 'college'];

  let sections = {
    skills: [],
    projects: [],
    others: []
  };

  let currentSection = 'others';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Detect section headers
    if (skillsKeywords.some(kw => lowerLine.includes(kw))) {
      currentSection = 'skills';
      continue;
    }
    if (projectKeywords.some(kw => lowerLine.includes(kw))) {
      currentSection = 'projects';
      continue;
    }
    if (educationKeywords.some(kw => lowerLine.includes(kw))) {
      currentSection = 'others';
      continue;
    }

    // Add non-empty lines to current section
    if (line && line.length > 2) {
      sections[currentSection].push(line);
    }
  }

  return {
    rawText: text,
    cleanedText,
    sections
  };
}

export default { parseResume };
