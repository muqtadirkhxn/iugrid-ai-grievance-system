import type { ComplaintCategory, ComplaintPriority } from '../types';

// ============================================================
// PORTER STEMMER - Reduces words to root form
// exam/exams/examination -> exam; running/ran -> run
// ============================================================

function porterStem(word: string): string {
  const w = word.toLowerCase();
  if (w.length < 3) return w;

  const step2replacements: Record<string, string> = {
    ational: 'ate', tional: 'tion', enci: 'ence', anci: 'ance',
    izer: 'ize', abli: 'able', alli: 'al', entli: 'ent',
    eli: 'e', ousli: 'ous', ization: 'ize', ation: 'ate',
    ator: 'ate', alism: 'al', iveness: 'ive', fulness: 'ful',
    ousness: 'ous', aliti: 'al', iviti: 'ive', biliti: 'ble',
  };
  const step3replacements: Record<string, string> = {
    icate: 'ic', ative: '', alize: 'al', iciti: 'ic',
    ical: 'ic', ful: '', ness: '',
  };

  let s = w;

  // Step 1a
  if (s.endsWith('sses')) s = s.slice(0, -2);
  else if (s.endsWith('ies')) s = s.slice(0, -2);
  else if (s.endsWith('ss')) { /* no change */ }
  else if (s.endsWith('s')) s = s.slice(0, -1);

  // Step 1b
  if (s.endsWith('eed')) {
    if (s.length > 4) s = s.slice(0, -1);
  } else {
    let removed = false;
    if (s.endsWith('ed')) { s = s.slice(0, -2); removed = true; }
    else if (s.endsWith('ing')) { s = s.slice(0, -3); removed = true; }
    if (removed) {
      if (s.endsWith('at') || s.endsWith('bl') || s.endsWith('iz')) s += 'e';
      else if (doubleConsonant(s) && !s.endsWith('l') && !s.endsWith('s') && !s.endsWith('z')) s = s.slice(0, -1);
      else if (measure(s) === 1 && cvc(s)) s += 'e';
    }
  }

  // Step 1c
  if (s.endsWith('y') && measure(s) > 0) s = s.slice(0, -1) + 'i';

  // Step 2
  for (const [suffix, replacement] of Object.entries(step2replacements)) {
    if (s.endsWith(suffix) && measure(s.slice(0, -suffix.length)) > 0) {
      s = s.slice(0, -suffix.length) + replacement;
      break;
    }
  }

  // Step 3
  for (const [suffix, replacement] of Object.entries(step3replacements)) {
    if (s.endsWith(suffix) && measure(s.slice(0, -suffix.length)) > 0) {
      s = s.slice(0, -suffix.length) + replacement;
      break;
    }
  }

  // Step 4
  const step4suffixes = ['al', 'ance', 'ence', 'er', 'ic', 'able', 'ible', 'ant', 'ement', 'ment', 'ent', 'ion', 'ou', 'ism', 'ate', 'iti', 'ous', 'ive', 'ize'];
  for (const suffix of step4suffixes) {
    if (s.endsWith(suffix) && measure(s.slice(0, -suffix.length)) > 1) {
      if (suffix === 'ion') {
        const base = s.slice(0, -3);
        if (base.endsWith('s') || base.endsWith('t')) s = base;
      } else {
        s = s.slice(0, -suffix.length);
      }
      break;
    }
  }

  // Step 5a
  if (s.endsWith('e') && measure(s.slice(0, -1)) > 1) s = s.slice(0, -1);
  else if (s.endsWith('e') && measure(s.slice(0, -1)) === 1 && !cvc(s.slice(0, -1))) s = s.slice(0, -1);

  // Step 5b
  if (doubleConsonant(s) && s.endsWith('l') && measure(s) > 1) s = s.slice(0, -1);

  return s;
}

function isVowel(c: string): boolean { return 'aeiou'.includes(c); }

function measure(word: string): number {
  let m = 0;
  let inVowelGroup = false;
  for (const c of word) {
    const v = isVowel(c);
    if (v && !inVowelGroup) { m++; inVowelGroup = true; }
    else if (!v) { inVowelGroup = false; }
  }
  return m;
}

function doubleConsonant(word: string): boolean {
  if (word.length < 2) return false;
  const last = word[word.length - 1];
  return word[word.length - 2] === last && !isVowel(last);
}

function cvc(word: string): boolean {
  if (word.length < 3) return false;
  const c = !isVowel(word[word.length - 1]);
  const v = isVowel(word[word.length - 2]);
  const c2 = !isVowel(word[word.length - 3]);
  const lastNotWXY = !'wxy'.includes(word[word.length - 1]);
  return c && v && c2 && lastNotWXY;
}

// ============================================================
// STOP WORDS
// ============================================================

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'was', 'are', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'shall', 'not', 'no',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'she', 'they', 'them', 'their', 'what',
  'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'than', 'too', 'very', 'just', 'about', 'also', 'if',
  'then', 'so', 'up', 'out', 'am', 'as', 'into', 'through',
]);

// ============================================================
// LEVENSHTEIN DISTANCE - Fuzzy matching for typos
// ============================================================

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function fuzzyMatch(word: string, target: string, threshold = 2): boolean {
  if (word === target) return true;
  if (Math.abs(word.length - target.length) > threshold) return false;
  return levenshtein(word, target) <= threshold;
}

// ============================================================
// TOKENIZER
// ============================================================

interface TokenizedText {
  raw: string;
  tokens: string[];
  stems: string[];
  bigrams: string[];
  trigrams: string[];
  allWords: string[];  // includes negation words, for negation detection
}

const NEGATION_WORDS = new Set(['not', 'no', 'never', 'cannot', 'isnt', 'dont', 'doesnt', 'wasnt', 'wont', 'neither', 'nor', 'nothing', 'nowhere', 'nobody']);

function tokenize(text: string): TokenizedText {
  const raw = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const allWords = raw.split(' ').filter(w => w.length > 0);
  // Keep negation words even though they're in STOP_WORDS
  const words = allWords.filter(w => w.length > 1 && (!STOP_WORDS.has(w) || NEGATION_WORDS.has(w)));
  const stems = words.map(porterStem);
  const bigrams: string[] = [];
  const trigrams: string[] = [];
  for (let i = 0; i < stems.length - 1; i++) bigrams.push(`${stems[i]}_${stems[i + 1]}`);
  for (let i = 0; i < stems.length - 2; i++) trigrams.push(`${stems[i]}_${stems[i + 1]}_${stems[i + 2]}`);
  return { raw, tokens: words, stems, bigrams, trigrams, allWords };
}

// ============================================================
// KNOWLEDGE BASE - Weighted keyword dictionaries
// ============================================================

interface CategoryRule {
  keywords: string[];
  weights: number[];
  phrases: string[];
  phraseWeights: number[];
}

const categoryRules: Record<ComplaintCategory, CategoryRule> = {
  Academic: {
    keywords: ['exam', 'mark', 'grade', 'attend', 'cours', 'teach', 'professor', 'lectur', 'semester', 'result', 'score', 'assign', 'project', 'syllab', 'class', 'studi', 'educ', 'paper', 'curriculum', 'credit', 'degre', 'diploma', 'enrol', 'tuition', 'academic', 'evalu', 'theses', 'research', 'supervis', 'viva', 'practic', 'intern', 'scholar', 'fellow'],
    weights:  [3.0,   2.5,    3.0,    2.0,       2.5,     2.0,     2.5,        2.0,      2.5,        2.5,     2.5,     2.0,        2.0,      1.5,      2.0,    1.5,     2.0,     2.0,     1.8,          2.0,     2.5,     2.0,     1.5,      2.0,      2.0,       2.0,     2.0,      1.8,      2.0,        1.5,    2.0,      2.0,      2.0,      2.0,     1.5],
    phrases: ['exam_schedul', 'grade_card', 'attend_requir', 'cours_registr', 'semest_exam', 'result_declar', 'assign_deadlin', 'lectur_schedul', 'credit_load', 'paper_evalu', 'degre_certif'],
    phraseWeights: [4.0, 4.0, 3.5, 4.0, 4.0, 4.0, 3.5, 3.5, 3.0, 3.5, 4.0],
  },
  Hostel: {
    keywords: ['mess', 'room', 'warden', 'accommod', 'hostel', 'food', 'canteen', 'bed', 'bathroom', 'laundri', 'water', 'electr', 'clean', 'facil', 'hygien', 'rent', 'mainten', 'repair', 'secur', 'nois', 'neighbor', 'kitchen', 'dustbin', 'pest', 'roach', 'mosquito', 'plumb', 'leak', 'draing', 'heater', 'geyser'],
    weights:  [2.5,   2.0,   2.5,     2.0,         3.0,     2.5,    2.0,      1.5,   2.5,       2.0,      2.5,     2.5,      2.0,     1.8,     2.5,     2.0,   2.5,        2.0,     2.5,     2.0,   1.8,       2.0,      2.0,      2.0,   2.5,     2.5,      2.5,     2.0,   2.5,     2.5,     2.5],
    phrases: ['mess_food', 'hostel_room', 'room_clean', 'water_suppli', 'electric_failur', 'bathroom_clean', 'nois_complain', 'room_repair', 'warden_complain', 'food_qualiti', 'mainten_reques'],
    phraseWeights: [4.5, 4.5, 3.5, 4.0, 3.5, 3.5, 3.0, 3.5, 3.5, 4.0, 3.0],
  },
  Administrative: {
    keywords: ['fee', 'certif', 'scholar', 'admiss', 'registr', 'document', 'id_card', 'librari', 'applic', 'form', 'offic', 'administr', 'record', 'transcript', 'degre', 'enrol', 'identity', 'bonafid', 'character', 'migrat', 'leav', 'no_du', 'refund', 'receipt', 'invoice', 'dues', 'fine', 'penalti'],
    weights:  [2.5,   2.5,     2.5,      2.5,      2.0,       2.5,       3.0,      2.0,      2.0,     2.0,   2.0,    2.0,        2.5,      2.5,        2.5,    2.0,    2.5,      2.5,      2.5,       2.0,      2.0,   2.5,    2.5,     2.5,      2.0,     2.0,   2.0,    2.0],
    phrases: ['fee_refund', 'id_card', 'bonafid_certif', 'no_du_certif', 'admiss_process', 'scholar_applic', 'librari_fine', 'transcript_reques', 'certif_applic', 'registr_process'],
    phraseWeights: [4.0, 4.0, 4.5, 4.5, 3.5, 4.0, 3.0, 4.0, 3.5, 3.5],
  },
  Technical: {
    keywords: ['wifi', 'internet', 'lab', 'comput', 'system', 'softwar', 'hardwar', 'network', 'server', 'websit', 'login', 'password', 'portal', 'technic', 'equip', 'printer', 'projector', 'charger', 'connect', 'bandwidth', 'download', 'upload', 'firewall', 'vpn', 'access', 'authent', 'crash', 'bug', 'error', 'slow', 'outag'],
    weights:  [3.0,   3.0,     2.5,   2.5,      2.0,     2.5,      2.5,      2.5,     2.0,     2.0,     2.5,    3.0,      2.5,    2.0,      2.0,     2.0,      2.0,      1.8,      2.5,      2.0,       1.8,       1.8,      2.0,    2.0,   2.5,    2.5,       2.5,    2.0,   2.5,   2.5,   2.5],
    phrases: ['wifi_connect', 'internet_access', 'lab_equip', 'login_failur', 'system_crash', 'portal_down', 'server_error', 'password_reset', 'network_down', 'slow_internet'],
    phraseWeights: [4.5, 4.5, 3.5, 4.5, 4.0, 4.0, 4.0, 4.0, 4.5, 4.0],
  },
};

const priorityRules: Record<ComplaintPriority, { keywords: string[]; weights: number[] }> = {
  High: {
    keywords: ['urgent', 'immedi', 'critic', 'emerg', 'asap', 'sever', 'serious', 'deadlin', 'crucial', 'danger', 'hazard', 'unsafe', 'threat', 'harass', 'discrimin', 'violat', 'illegal', 'suspens', 'expuls', 'failur', 'block', 'stop', 'unable', 'breakdown', 'outag', 'crash'],
    weights:  [4.0,     4.0,      4.0,     4.5,     3.5,    4.0,     3.5,       3.5,      3.5,      4.5,     4.0,     4.0,     4.0,     4.5,     4.5,         4.0,      3.5,     4.0,      4.0,     3.5,    3.5,   3.0,   3.5,    3.5,        3.5,    3.0],
  },
  Medium: {
    keywords: ['import', 'soon', 'need', 'requir', 'necessari', 'moder', 'attent', 'concern', 'issu', 'problem', 'affect', 'impact', 'delai', 'inconveni', 'troubl'],
    weights:  [2.5,    2.5,   2.5,   2.5,     2.5,        2.0,    2.5,      2.5,      2.0,    2.0,      2.5,      2.5,    2.5,     2.0,        2.0],
  },
  Low: {
    keywords: ['minor', 'small', 'queri', 'question', 'suggest', 'feedback', 'inconveni', 'enhanc', 'improv', 'request', 'hope', 'wish', 'prefer', 'nice', 'better'],
    weights:  [2.0,   2.0,    2.0,    2.0,      2.0,     2.0,      1.5,        1.8,      1.8,     1.8,     1.5,   1.5,   1.5,     1.5,   1.5],
  },
};

// ============================================================
// SENTIMENT ANALYSIS
// ============================================================

interface SentimentResult {
  score: number;
  magnitude: number;
  tone: 'frustrated' | 'angry' | 'concerned' | 'neutral' | 'hopeful';
  emotionKeywords: string[];
}

const sentimentLexicon: Record<string, number> = {
  terrible: -0.9, horrible: -0.9, awful: -0.8, worst: -0.9, disgusting: -0.9,
  unacceptable: -0.8, frustrated: -0.7, angry: -0.8, furious: -0.9, disappointed: -0.6,
  annoyed: -0.5, irritated: -0.6, upset: -0.6, miserable: -0.8, suffering: -0.7,
  complaining: -0.4, unfair: -0.7, broken: -0.6, failed: -0.6, failure: -0.6,
  useless: -0.7, hopeless: -0.8, desperate: -0.8, neglected: -0.7, ignored: -0.6,
  harassment: -0.9, unsafe: -0.8, danger: -0.8, pathetic: -0.8, waste: -0.5,
  bad: -0.4, poor: -0.4, slow: -0.3, dirty: -0.4, late: -0.3, wrong: -0.4,
  error: -0.3, issue: -0.2, problem: -0.2, stuck: -0.4, confused: -0.3,
  okay: 0.0, fine: 0.0, normal: 0.0, average: 0.0, standard: 0.0,
  good: 0.4, nice: 0.3, helpful: 0.5, thanks: 0.3, appreciate: 0.4,
  very: 0.3, extremely: 0.5, really: 0.3, absolutely: 0.4, completely: 0.3,
  not: -0.5, never: -0.5, no: -0.3, cannot: -0.5, nothing: -0.4,
};

function analyzeSentiment(text: string): SentimentResult {
  const tokens = tokenize(text);
  let totalScore = 0;
  let totalMagnitude = 0;
  const emotionKeywords: string[] = [];
  let negated = false;

  for (let i = 0; i < tokens.tokens.length; i++) {
    const word = tokens.tokens[i];
    const stemmed = tokens.stems[i];
    let score = 0;

    if (sentimentLexicon[word] !== undefined) {
      score = sentimentLexicon[word];
    } else if (sentimentLexicon[stemmed] !== undefined) {
      score = sentimentLexicon[stemmed];
    } else {
      continue;
    }

    if (i >= 1 && ['not', 'no', 'never', 'cannot'].includes(tokens.tokens[i - 1])) negated = true;
    if (i >= 2 && ['not', 'no', 'never'].includes(tokens.tokens[i - 2])) negated = true;

    if (negated && score < 0) {
      score *= -0.5;
      negated = false;
    }

    if (i >= 1 && sentimentLexicon[tokens.tokens[i - 1]] !== undefined && sentimentLexicon[tokens.tokens[i - 1]] > 0 && tokens.tokens[i - 1].length <= 8) {
      score *= 1 + sentimentLexicon[tokens.tokens[i - 1]] * 0.5;
    }

    totalScore += score;
    totalMagnitude += Math.abs(score);
    if (Math.abs(score) >= 0.5) emotionKeywords.push(word);
  }

  const count = Math.max(1, tokens.tokens.length);
  const normalizedScore = Math.max(-1, Math.min(1, totalScore / count * 3));
  const normalizedMagnitude = Math.min(1, totalMagnitude / count * 2);

  let tone: SentimentResult['tone'] = 'neutral';
  if (normalizedScore < -0.5) tone = 'angry';
  else if (normalizedScore < -0.25) tone = 'frustrated';
  else if (normalizedScore < -0.05) tone = 'concerned';
  else if (normalizedScore > 0.1) tone = 'hopeful';

  return { score: normalizedScore, magnitude: normalizedMagnitude, tone, emotionKeywords };
}

// ============================================================
// ENTITY EXTRACTION
// ============================================================

interface ExtractedEntity {
  type: 'room' | 'building' | 'date' | 'course_code' | 'time' | 'equipment';
  value: string;
  confidence: number;
}

function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lower = text.toLowerCase();

  const roomRegex = /(?:room\s*(?:no\.?|number)?\s*)([a-z]?-?\d{1,4}[a-z]?)/gi;
  let match;
  while ((match = roomRegex.exec(text)) !== null) {
    entities.push({ type: 'room', value: match[1].toUpperCase(), confidence: 0.9 });
  }

  const buildingRegex = /(?:block|building)\s*[-]?\s*([a-z0-9]+)/gi;
  while ((match = buildingRegex.exec(text)) !== null) {
    entities.push({ type: 'building', value: `Block ${match[1].toUpperCase()}`, confidence: 0.85 });
  }

  const dateRegex = /(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[,.]?\s*\d{0,4})|(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})/gi;
  while ((match = dateRegex.exec(text)) !== null) {
    entities.push({ type: 'date', value: match[0], confidence: 0.8 });
  }

  const courseRegex = /\b([a-z]{2,4}[-]?\d{3,4})\b/gi;
  while ((match = courseRegex.exec(text)) !== null) {
    const code = match[1].toUpperCase();
    if (!['THE', 'AND', 'BUT', 'FOR'].includes(code.substring(0, 3))) {
      entities.push({ type: 'course_code', value: code, confidence: 0.7 });
    }
  }

  const timeRegex = /\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\b/gi;
  while ((match = timeRegex.exec(text)) !== null) {
    entities.push({ type: 'time', value: match[0].toUpperCase(), confidence: 0.75 });
  }

  const equipmentWords = ['laptop', 'printer', 'projector', 'computer', 'pc', 'ac', 'air conditioner', 'fan', 'heater', 'geyser', 'charger', 'router', 'switch', 'monitor', 'keyboard', 'mouse'];
  for (const eq of equipmentWords) {
    if (lower.includes(eq)) {
      entities.push({ type: 'equipment', value: eq.toUpperCase(), confidence: 0.6 });
    }
  }

  return entities;
}

// ============================================================
// COSINE SIMILARITY - Duplicate detection
// ============================================================

function buildVector(tokens: string[], vocabulary: string[]): number[] {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  return vocabulary.map(word => {
    const count = counts.get(word) || 0;
    return count > 0 ? 1 + Math.log(count) : 0;
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export interface DuplicateMatch {
  complaintId: string;
  title: string;
  similarity: number;
}

export function findDuplicates(title: string, description: string, existingComplaints: Array<{ id: string; title: string; description: string }>, threshold = 0.45): DuplicateMatch[] {
  const newText = `${title} ${description}`;
  const matches: DuplicateMatch[] = [];

  for (const complaint of existingComplaints) {
    const existingText = `${complaint.title} ${complaint.description}`;
    const tokensA = tokenize(newText);
    const tokensB = tokenize(existingText);
    const vocabSet = new Set([...tokensA.stems, ...tokensB.stems]);
    const vocab = [...vocabSet];
    const vecA = buildVector(tokensA.stems, vocab);
    const vecB = buildVector(tokensB.stems, vocab);
    const sim = cosineSimilarity(vecA, vecB);

    if (sim >= threshold) {
      matches.push({
        complaintId: complaint.id,
        title: complaint.title,
        similarity: Math.round(sim * 100) / 100,
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}

// ============================================================
// SMART SUGGESTIONS
// ============================================================

interface SmartSuggestion {
  action: string;
  description: string;
  relevance: number;
}

function generateSuggestions(
  category: ComplaintCategory,
  priority: ComplaintPriority,
  sentiment: SentimentResult,
  entities: ExtractedEntity[],
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  const categoryActions: Record<ComplaintCategory, SmartSuggestion[]> = {
    Academic: [
      { action: 'Contact Course Coordinator', description: 'Reach out to the course coordinator for academic concerns', relevance: 0.9 },
      { action: 'Submit to Dean Academic', description: 'Escalate to the Dean of Academic Affairs', relevance: 0.7 },
      { action: 'Check Academic Calendar', description: 'Verify dates against the official academic calendar', relevance: 0.5 },
    ],
    Hostel: [
      { action: 'Contact Hostel Warden', description: 'Report the issue to your hostel warden first', relevance: 0.9 },
      { action: 'Submit Maintenance Request', description: 'File a formal maintenance request for facilities issues', relevance: 0.8 },
      { action: 'Contact Hostel Committee', description: 'Escalate to the hostel management committee', relevance: 0.6 },
    ],
    Administrative: [
      { action: 'Visit Admin Office', description: 'Visit the concerned administrative office during working hours', relevance: 0.8 },
      { action: 'Download Form', description: 'Check the university portal for required forms', relevance: 0.7 },
      { action: 'Track Application', description: 'Use the portal tracking system to monitor your application', relevance: 0.6 },
    ],
    Technical: [
      { action: 'Contact IT Helpdesk', description: 'Submit a ticket to the IT helpdesk for technical issues', relevance: 0.9 },
      { action: 'Check Service Status', description: 'Verify if there is a known outage on the IT status page', relevance: 0.7 },
      { action: 'Try Basic Troubleshooting', description: 'Clear cache, restart device, or try a different browser', relevance: 0.5 },
    ],
  };
  suggestions.push(...categoryActions[category]);

  if (priority === 'High') {
    suggestions.unshift({
      action: 'Escalate Immediately',
      description: 'High priority complaints require immediate attention from authorities',
      relevance: 1.0,
    });
  }

  if (sentiment.tone === 'angry' || sentiment.tone === 'frustrated') {
    suggestions.push({
      action: 'Counseling Support',
      description: 'Consider reaching out to the student counseling cell for support',
      relevance: 0.6,
    });
  }

  for (const entity of entities) {
    if (entity.type === 'room') {
      suggestions.push({
        action: `Check Room ${entity.value} Status`,
        description: `Verify current status of Room ${entity.value} with hostel management`,
        relevance: 0.75,
      });
    }
    if (entity.type === 'course_code') {
      suggestions.push({
        action: `Contact ${entity.value} Instructor`,
        description: `Reach out to the course instructor for ${entity.value}`,
        relevance: 0.8,
      });
    }
  }

  return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

// ============================================================
// MAIN CLASSIFICATION ENGINE
// ============================================================

export interface AdvancedClassificationResult {
  category: ComplaintCategory;
  priority: ComplaintPriority;
  urgencyKeywords: string[];
  confidence: number;
  categoryScores: Record<ComplaintCategory, number>;
  sentiment: SentimentResult;
  entities: ExtractedEntity[];
  suggestions: SmartSuggestion[];
  duplicateWarning: boolean;
  languageQuality: 'formal' | 'informal' | 'poor';
  wordCount: number;
  keyPhrases: string[];
}

export function classifyComplaint(title: string, description: string): AdvancedClassificationResult {
  const text = `${title} ${description}`;
  const tokenized = tokenize(text);

  const categoryScores: Record<ComplaintCategory, number> = {
    Academic: 0, Hostel: 0, Administrative: 0, Technical: 0,
  };

  for (const [cat, rule] of Object.entries(categoryRules)) {
    let score = 0;

    for (let i = 0; i < tokenized.stems.length; i++) {
      const stem = tokenized.stems[i];
      for (let j = 0; j < rule.keywords.length; j++) {
        const keyword = rule.keywords[j];
        const weight = rule.weights[j];
        if (stem === keyword) {
          score += weight;
        } else if (fuzzyMatch(stem, keyword, 1)) {
          score += weight * 0.6;
        }
      }
    }

    for (let i = 0; i < rule.phrases.length; i++) {
      const phrase = rule.phrases[i];
      const phraseWeight = rule.phraseWeights[i];
      if (tokenized.bigrams.includes(phrase) || tokenized.trigrams.includes(phrase)) {
        score += phraseWeight;
      }
      const parts = phrase.split('_');
      if (parts.length === 2 && tokenized.stems.includes(parts[0]) && tokenized.stems.includes(parts[1])) {
        score += phraseWeight * 0.4;
      }
    }

    categoryScores[cat as ComplaintCategory] = Math.round(score * 100) / 100;
  }

  let detectedCategory: ComplaintCategory = 'Administrative';
  let maxScore = 0;
  for (const [cat, score] of Object.entries(categoryScores)) {
    if (score > maxScore) { maxScore = score; detectedCategory = cat as ComplaintCategory; }
  }
  if (maxScore === 0) detectedCategory = 'Administrative';

  const priorityScores: Record<ComplaintPriority, number> = { High: 0, Medium: 0, Low: 0 };

  for (const [pri, rule] of Object.entries(priorityRules)) {
    let score = 0;
    for (let i = 0; i < tokenized.stems.length; i++) {
      const stem = tokenized.stems[i];
      for (let j = 0; j < rule.keywords.length; j++) {
        if (stem === rule.keywords[j] || fuzzyMatch(stem, rule.keywords[j], 1)) {
          const weight = stem === rule.keywords[j] ? rule.weights[j] : rule.weights[j] * 0.6;
          const isNegated = (i >= 1 && NEGATION_WORDS.has(tokenized.tokens[i - 1])) ||
                           (i >= 2 && NEGATION_WORDS.has(tokenized.tokens[i - 2]));
          score += isNegated ? weight * -0.5 : weight;
        }
      }
    }
    priorityScores[pri as ComplaintPriority] = score;
  }

  let detectedPriority: ComplaintPriority = 'Medium';
  if (priorityScores.High > 0 && priorityScores.High >= priorityScores.Low) detectedPriority = 'High';
  else if (priorityScores.Low > 0 && priorityScores.Low > priorityScores.High && priorityScores.Low > priorityScores.Medium) detectedPriority = 'Low';

  const sentiment = analyzeSentiment(text);
  if (sentiment.tone === 'angry' && detectedPriority !== 'High') detectedPriority = 'Medium';

  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0
    ? Math.min(98, Math.round((maxScore / totalScore) * 60 + 35))
    : 40;

  const urgencyKeywords: string[] = [];
  for (const kw of priorityRules[detectedPriority].keywords) {
    if (tokenized.stems.some(s => s === kw || fuzzyMatch(s, kw, 1))) urgencyKeywords.push(kw);
  }

  const entities = extractEntities(text);

  const wordCount = tokenized.tokens.length;
  let languageQuality: 'formal' | 'informal' | 'poor' = 'informal';
  if (wordCount < 5) languageQuality = 'poor';
  else if (wordCount > 20 && text.match(/[.!?]/g)?.length) languageQuality = 'formal';

  const keyPhrases: string[] = [];
  for (const [, rule] of Object.entries(categoryRules)) {
    for (let i = 0; i < rule.phrases.length; i++) {
      if (tokenized.bigrams.includes(rule.phrases[i]) || tokenized.trigrams.includes(rule.phrases[i])) {
        keyPhrases.push(rule.phrases[i].replace(/_/g, ' '));
      }
    }
  }

  const suggestions = generateSuggestions(detectedCategory, detectedPriority, sentiment, entities);

  return {
    category: detectedCategory,
    priority: detectedPriority,
    urgencyKeywords,
    confidence,
    categoryScores,
    sentiment,
    entities,
    suggestions,
    duplicateWarning: false,
    languageQuality,
    wordCount,
    keyPhrases,
  };
}

export function getDepartmentFromCategory(category: ComplaintCategory): string {
  const mapping: Record<ComplaintCategory, string> = {
    Academic: 'Academic Affairs',
    Hostel: 'Hostel Management',
    Administrative: 'Administration',
    Technical: 'IT Support',
  };
  return mapping[category];
}

// Live preview for typing
export interface LivePreview {
  suggestedCategory: ComplaintCategory | null;
  suggestedPriority: ComplaintPriority | null;
  sentiment: 'frustrated' | 'angry' | 'concerned' | 'neutral' | 'hopeful' | null;
  qualityWarning: string | null;
  detectedEntities: ExtractedEntity[];
}

export function analyzeLive(title: string, description: string): LivePreview {
  if (!title && !description) {
    return { suggestedCategory: null, suggestedPriority: null, sentiment: null, qualityWarning: null, detectedEntities: [] };
  }

  const result = classifyComplaint(title, description);

  let qualityWarning: string | null = null;
  if (result.wordCount < 8) qualityWarning = 'Add more detail for better classification accuracy';
  if (result.languageQuality === 'poor') qualityWarning = 'Description is too short -- please provide more context';

  return {
    suggestedCategory: result.category,
    suggestedPriority: result.priority,
    sentiment: result.sentiment.tone,
    qualityWarning,
    detectedEntities: result.entities,
  };
}
