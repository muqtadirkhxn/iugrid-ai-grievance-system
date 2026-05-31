export type UserRole = 'student' | 'admin';

export type ComplaintCategory = 'Academic' | 'Hostel' | 'Administrative' | 'Technical';

export type ComplaintPriority = 'High' | 'Medium' | 'Low';

export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved';

export type SentimentTone = 'frustrated' | 'angry' | 'concerned' | 'neutral' | 'hopeful';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category?: ComplaintCategory;
  priority?: ComplaintPriority;
  status: ComplaintStatus;
  department_assigned?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedEntity {
  type: 'room' | 'building' | 'date' | 'course_code' | 'time' | 'equipment';
  value: string;
  confidence: number;
}

export interface SmartSuggestion {
  action: string;
  description: string;
  relevance: number;
}

export interface AIProcessing {
  id: string;
  complaint_id: string;
  category_detected: ComplaintCategory;
  priority_detected: ComplaintPriority;
  urgency_keywords: string[];
  confidence_score: number;
  category_scores: Record<ComplaintCategory, number>;
  sentiment_score: number;
  sentiment_tone: SentimentTone;
  entities: ExtractedEntity[];
  suggestions: SmartSuggestion[];
  key_phrases: string[];
  language_quality: 'formal' | 'informal' | 'poor';
  duplicate_warning: boolean;
  processed_at: string;
}

export interface StatusTracking {
  id: string;
  complaint_id: string;
  current_status: ComplaintStatus;
  updated_by: string;
  remarks: string;
  updated_at: string;
}

export interface ComplaintWithDetails extends Complaint {
  user?: User;
  ai_processing?: AIProcessing;
  status_history?: StatusTracking[];
}

export interface DuplicateMatch {
  complaintId: string;
  title: string;
  similarity: number;
}

export interface LivePreview {
  suggestedCategory: ComplaintCategory | null;
  suggestedPriority: ComplaintPriority | null;
  sentiment: SentimentTone | null;
  qualityWarning: string | null;
  detectedEntities: ExtractedEntity[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}
