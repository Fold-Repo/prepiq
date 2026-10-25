interface StructuredGenerator {
  generateStructured<T>(options: { systemPrompt?: string; userPrompt: string }): Promise<T>;
}

const MAX_EXTRACT_CHARS = 24_000;

export interface McqOption {
  label: string;
  text: string;
}

export interface ExtractedExamQuestion {
  questionNumber: string;
  content: string;
  marks?: number | null;
  type?: string;
  pageNumber?: number | null;
  options?: McqOption[] | string[] | null;
  correctOption?: string | null;
  officialAnswer?: string | null;
  explanation?: string | null;
  syllabusRef?: string | null;
  confidence?: number | null;
}

export interface ExtractedSyllabusTopic {
  title: string;
  description?: string | null;
  weekNumber?: number | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  children?: ExtractedSyllabusTopic[];
}

function clipText(text: string, max = MAX_EXTRACT_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[Truncated]`;
}

function clipPages(pages: Array<{ pageNumber: number; content: string }>): string {
  return clipText(
    pages.map((page) => `--- PAGE ${page.pageNumber} ---\n${page.content}`).join('\n\n')
  );
}

export function normalizeOptionLabel(value?: string | null): string | null {
  if (!value) return null;
  const match = value.trim().match(/^([a-dA-D])\b/);
  return match ? match[1].toLowerCase() : value.trim().toLowerCase();
}

export function normalizeOptions(raw?: McqOption[] | string[] | null): McqOption[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (typeof item === 'string') {
        const match = item.trim().match(/^([a-dA-D])\s*[).:\-]\s*(.*)$/);
        if (match) {
          return { label: match[1].toLowerCase(), text: cleanOptionText(match[2]) };
        }
        return { label: String.fromCharCode(97 + index), text: cleanOptionText(item) };
      }
      if (item && typeof item === 'object' && 'text' in item) {
        return {
          label: normalizeOptionLabel(item.label) || String.fromCharCode(97 + index),
          text: cleanOptionText(item.text),
        };
      }
      return null;
    })
    .filter((item): item is McqOption => !!item && item.text.length > 0);
}

function cleanOptionText(text: string): string {
  return text
    .replace(/^(CORRECT|FALSE|TRUE|WRONG)\s*[–—\-:]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanStem(text: string): string {
  return text
    .replace(/Select\s+(ONE|TWO|THREE)\s+options?\s*!?\s*(\([^)]*\))?/gi, '')
    .replace(/\(\s*\d+\s+out of\s+\d+\s*\)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseJustification(text: string): {
  correctLabel: string | null;
  explanation: string | null;
} {
  if (!text.trim()) return { correctLabel: null, explanation: null };

  const optionBlocks = text.split(/(?=(?:^|\n)\s*[a-dA-D]\s*[).])/);
  let correctLabel: string | null = null;
  let explanation: string | null = null;

  for (const block of optionBlocks) {
    const match = block.match(
      /^\s*([a-dA-D])\s*[).]\s*(CORRECT|FALSE|TRUE|WRONG)?\s*[–—\-:]*\s*([\s\S]*)$/i
    );
    if (!match) continue;
    const label = match[1].toLowerCase();
    const verdict = (match[2] || '').toUpperCase();
    const rest = match[3].replace(/\s+/g, ' ').trim();
    if (verdict === 'CORRECT' || verdict === 'TRUE') {
      correctLabel = label;
      explanation = rest || null;
    }
  }

  if (!correctLabel) {
    const fallback = text.match(/([a-dA-D])\s*[).]\s*CORRECT/i);
    if (fallback) correctLabel = fallback[1].toLowerCase();
  }

  return { correctLabel, explanation };
}

export function parseMcqFromText(raw: string): {
  stem: string;
  options: McqOption[];
  correctOption: string | null;
  explanation: string | null;
  syllabusRef: string | null;
} {
  const [questionPart = raw, justificationPart = ''] = raw.split(/\n\s*Justification\s*:/i);
  const syllabusMatch = questionPart.match(
    /\b([A-Z]{1,5}\s*[-–]\s*[\d.]+(?:\s*\([^)]+\))?[^[\n]*?(?:\[[^\]]+\])?)/
  );

  const lines = questionPart.split('\n');
  const options: McqOption[] = [];
  const stemLines: string[] = [];
  let current: McqOption | null = null;
  let seenOption = false;

  for (const line of lines) {
    const optionMatch = line.match(/^\s*([a-dA-D])\s*[).]\s+(.*)$/);
    if (optionMatch) {
      if (current) options.push(current);
      seenOption = true;
      current = { label: optionMatch[1].toLowerCase(), text: cleanOptionText(optionMatch[2]) };
      continue;
    }

    if (seenOption && current) {
      if (/^[A-Z]{1,5}\s*[-–]\s*[\d.]/.test(line.trim()) || /Justification/i.test(line)) {
        options.push(current);
        current = null;
        continue;
      }
      if (line.trim()) current.text = cleanOptionText(`${current.text} ${line}`);
      continue;
    }

    stemLines.push(line);
  }
  if (current) options.push(current);

  const { correctLabel, explanation } = parseJustification(justificationPart);

  return {
    stem: cleanStem(stemLines.join('\n')),
    options: options.filter((option) => option.text.length > 0),
    correctOption: correctLabel,
    explanation,
    syllabusRef: syllabusMatch ? syllabusMatch[1].replace(/\s+/g, ' ').trim() : null,
  };
}

export function normalizeExtractedQuestion(question: ExtractedExamQuestion): ExtractedExamQuestion {
  const parsed = parseMcqFromText(
    [question.content, question.explanation, question.officialAnswer].filter(Boolean).join('\n\n')
  );

  const options = normalizeOptions(question.options?.length ? question.options : parsed.options);
  const stem = cleanStem(question.content || parsed.stem);
  const stemWithoutOptions = options.length
    ? cleanStem(stem.split(/\n\s*[a-dA-D]\s*[).]/)[0] || stem)
    : stem;

  const correctOption =
    normalizeOptionLabel(question.correctOption) || parsed.correctOption || null;

  const explanation = (question.explanation || question.officialAnswer || parsed.explanation || '')
    .replace(/^(CORRECT|FALSE|TRUE|WRONG)\s*[–—\-:]\s*/i, '')
    .trim();

  const looksLikeMcq = options.length >= 2;

  return {
    ...question,
    content: stemWithoutOptions || parsed.stem || question.content,
    type: looksLikeMcq ? 'MCQ' : question.type || 'SHORT_ANSWER',
    options: looksLikeMcq ? options : question.options,
    correctOption,
    officialAnswer: explanation || null,
    explanation: explanation || null,
    syllabusRef: question.syllabusRef || parsed.syllabusRef,
  };
}

function dedupeQuestions(questions: ExtractedExamQuestion[]): ExtractedExamQuestion[] {
  const seen = new Set<string>();
  const result: ExtractedExamQuestion[] = [];
  for (const question of questions) {
    const key = `${(question.questionNumber || '').toLowerCase()}|${(question.content || '')
      .slice(0, 80)
      .toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(question);
  }
  return result;
}

const EXTRACT_SYSTEM_PROMPT =
  `You parse exam papers, including ISTQB-style sample exams that mix questions, options, and answer keys.\n` +
  `Return JSON: { "questions": [ ... ] }.\n` +
  `Each question must contain:\n` +
  `- "questionNumber": e.g. "1", "1.1", "Q3"\n` +
  `- "content": ONLY the question stem. Do NOT include a/b/c/d options, "Select ONE option", Justification, FALSE/CORRECT, or syllabus codes.\n` +
  `- "type": "MCQ" when a/b/c/d choices exist, otherwise SHORT_ANSWER, ESSAY, CALCULATION, TRUE_FALSE, or OTHER\n` +
  `- "options": for MCQ, an array of { "label": "a", "text": "option wording without the letter" }. Usually 4 options.\n` +
  `- "correctOption": the winning letter only, e.g. "c". Find it from Justification lines marked CORRECT. Never put the word CORRECT in this field.\n` +
  `- "explanation": the justification text for the correct option, WITHOUT the prefix "CORRECT" or "FALSE". If there is no justification, null.\n` +
  `- "officialAnswer": same as explanation for MCQ; for written questions the model answer text\n` +
  `- "syllabusRef": e.g. "FL-1.1.1 (K1) Identify typical test objectives [CTFL 4.0]" or null\n` +
  `- "pageNumber": PAGE marker if known\n` +
  `- "marks": integer or null\n` +
  `- "confidence": 0-1\n` +
  `Never copy FALSE/CORRECT labels into option text. Never leave options inside content.`;

export async function extractExamQuestions(
  provider: StructuredGenerator,
  pages: Array<{ pageNumber: number; content: string }>,
  _includeOfficialAnswers = true
): Promise<ExtractedExamQuestion[]> {
  if (pages.length === 0) return [];

  const collected: ExtractedExamQuestion[] = [];
  for (let i = 0; i < pages.length; i += 2) {
    const batch = pages.slice(i, i + 2);
    try {
      const result = await provider.generateStructured<{ questions?: ExtractedExamQuestion[] }>({
        systemPrompt: EXTRACT_SYSTEM_PROMPT,
        userPrompt: clipPages(batch),
      });
      const questions = Array.isArray(result?.questions) ? result.questions : [];
      collected.push(...questions.filter((question) => question?.content).map(normalizeExtractedQuestion));
    } catch (error) {
      console.warn('[extract] AI batch failed, falling back to local MCQ parse:', error);
      for (const page of batch) {
        const blocks = page.content.split(/\n(?=\s*(?:\d+\s*[.)]|Q\s*\d+))/i);
        for (const block of blocks) {
          const parsed = parseMcqFromText(block);
          if (parsed.options.length >= 2 && parsed.stem.length > 20) {
            collected.push(
              normalizeExtractedQuestion({
                questionNumber: parsed.syllabusRef?.split(' ')[0] || 'Q',
                content: parsed.stem,
                type: 'MCQ',
                pageNumber: page.pageNumber,
                options: parsed.options,
                correctOption: parsed.correctOption,
                officialAnswer: parsed.explanation,
                explanation: parsed.explanation,
                syllabusRef: parsed.syllabusRef,
              })
            );
          }
        }
      }
    }
  }

  return dedupeQuestions(collected);
}

export async function inferMcqAnswer(
  provider: StructuredGenerator,
  input: {
    stem: string;
    options: McqOption[];
    syllabusRef?: string | null;
    courseContext?: string | null;
  }
): Promise<{ correctOption: string | null; explanation: string; usedContext: boolean }> {
  const optionLines = input.options.map((option) => `${option.label}) ${option.text}`).join('\n');
  const hasContext = !!input.courseContext?.trim();

  const result = await provider.generateStructured<{
    correctOption?: string;
    explanation?: string;
    usedContext?: boolean;
  }>({
    systemPrompt:
      `You are an exam marking assistant. Choose the single best option.\n` +
      `Prefer the course/syllabus context when it is sufficient. If context is missing or insufficient, use subject knowledge.\n` +
      `Return JSON: { "correctOption": "a"|"b"|"c"|"d", "explanation": "why this option is right and the others are not", "usedContext": boolean }\n` +
      `correctOption must be a letter only. explanation must not start with CORRECT or FALSE.`,
    userPrompt:
      `${input.syllabusRef ? `Syllabus / learning objective: ${input.syllabusRef}\n\n` : ''}` +
      `Question:\n${input.stem}\n\nOptions:\n${optionLines}\n\n` +
      (hasContext
        ? `Course / syllabus excerpts:\n${clipText(input.courseContext || '', 12_000)}`
        : 'No course excerpts were found. Answer from subject knowledge.'),
  });

  return {
    correctOption: normalizeOptionLabel(result?.correctOption),
    explanation: (result?.explanation || '').replace(/^(CORRECT|FALSE)\s*[–—\-:]\s*/i, '').trim(),
    usedContext: hasContext && result?.usedContext !== false,
  };
}

export async function extractSyllabusTopics(
  provider: StructuredGenerator,
  pages: Array<{ pageNumber: number; content: string }>
): Promise<ExtractedSyllabusTopic[]> {
  if (pages.length === 0) return [];

  const systemPrompt =
    `You are an expert academic syllabus parser. Extract the course outline/topics from the syllabus text.\n` +
    `Ignore covers, administrative boilerplate, and assessment policies unless they are topic headings.\n` +
    `Return a JSON object containing a "topics" array.\n` +
    `Each topic must contain:\n` +
    `- "title": short topic name\n` +
    `- "description": optional extra detail or null\n` +
    `- "weekNumber": integer week if present, otherwise null\n` +
    `- "pageStart": PAGE number where the topic appears if known, otherwise null\n` +
    `- "pageEnd": last PAGE for that topic if known, otherwise null\n` +
    `- "children": optional nested subtopics with the same shape`;

  const result = await provider.generateStructured<{ topics?: ExtractedSyllabusTopic[] }>({
    systemPrompt,
    userPrompt: clipPages(pages),
  });

  return Array.isArray(result?.topics) ? result.topics.filter((topic) => topic?.title) : [];
}
