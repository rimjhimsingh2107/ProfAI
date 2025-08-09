export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  learningProfile: LearningProfile;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface LearningProfile {
  preferredLearningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  conceptualUnderstanding: number; // 1-10 scale
  practicalSkills: number; // 1-10 scale
  preferredPace: 'slow' | 'medium' | 'fast';
  interestsTopics: string[];
  difficultConcepts: string[];
  masteredConcepts: string[];
  totalInteractions: number;
  averageSessionDuration: number;
  preferredExplanationDepth: 'beginner' | 'intermediate' | 'advanced';
  responseToEncouragement: number; // How well they respond to encouragement (1-10)
  confusionPatterns: string[]; // Common confusion triggers
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  emotionalTone?: EmotionalTone;
  learningMetrics?: LearningMetrics;
}

export interface EmotionalTone {
  sentiment: 'positive' | 'neutral' | 'negative' | 'confused' | 'frustrated' | 'excited';
  confidence: number; // 0-1 scale
  engagement: number; // 0-1 scale
}

export interface LearningMetrics {
  comprehensionLevel: number; // 1-10
  questionComplexity: number; // 1-10
  topicMastery: number; // 1-10
  needsReinforcement: boolean;
  suggestedNextTopic?: string;
}