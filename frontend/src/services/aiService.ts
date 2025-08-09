import { ChatMessage, LearningProfile, EmotionalTone, LearningMetrics } from '../types';

export class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  }

  async generateResponse(
    message: string,
    conversationHistory: ChatMessage[],
    learningProfile: LearningProfile,
    audioBlob?: Blob
  ): Promise<{
    response: string;
    audioUrl?: string;
    emotionalTone: EmotionalTone;
    learningMetrics: LearningMetrics;
  }> {
    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('learningProfile', JSON.stringify(learningProfile));
      formData.append('conversationHistory', JSON.stringify(conversationHistory.slice(-10))); // Last 10 messages
      
      if (audioBlob) {
        formData.append('audio', audioBlob, 'audio.wav');
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }
  async updateLearningProfile(
    userId: string,
    interactions: ChatMessage[]
  ): Promise<LearningProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/api/learning-profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          userId,
          interactions: interactions.slice(-20) // Last 20 interactions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update learning profile');
      }

      const updatedProfile = await response.json();
      return updatedProfile;
    } catch (error) {
      console.error('Error updating learning profile:', error);
      throw error;
    }
  }

  async generatePersonalizedExplanation(
    concept: string,
    difficulty: string,
    learningProfile: LearningProfile
  ): Promise<string> {
    const prompt = this.createPersonalizedPrompt(concept, difficulty, learningProfile);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Explain: ${concept}` }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating personalized explanation:', error);
      throw error;
    }
  }
  private createPersonalizedPrompt(
    concept: string,
    difficulty: string,
    profile: LearningProfile
  ): string {
    return `You are ProfAI, an emotionally intelligent AI professor specializing in AI and machine learning education.

Student Profile:
- Learning Style: ${profile.preferredLearningStyle}
- Conceptual Understanding: ${profile.conceptualUnderstanding}/10
- Practical Skills: ${profile.practicalSkills}/10
- Preferred Pace: ${profile.preferredPace}
- Explanation Depth: ${profile.preferredExplanationDepth}
- Response to Encouragement: ${profile.responseToEncouragement}/10
- Difficult Concepts: ${profile.difficultConcepts.join(', ')}
- Mastered Concepts: ${profile.masteredConcepts.join(', ')}
- Total Interactions: ${profile.totalInteractions}

Teaching Guidelines:
1. Adapt your explanation style based on their learning preferences
2. Use ${profile.preferredLearningStyle === 'visual' ? 'visual analogies and diagrams' : 
     profile.preferredLearningStyle === 'auditory' ? 'verbal explanations and sound metaphors' :
     profile.preferredLearningStyle === 'kinesthetic' ? 'hands-on examples and interactive elements' :
     'a mix of visual, auditory, and hands-on approaches'}
3. Pace: ${profile.preferredPace === 'slow' ? 'Take time to explain each step thoroughly' :
          profile.preferredPace === 'fast' ? 'Be concise but comprehensive' :
          'Balance detail with efficiency'}
4. ${profile.responseToEncouragement > 7 ? 'Use plenty of encouragement and positive reinforcement' :
     profile.responseToEncouragement < 4 ? 'Focus on direct, matter-of-fact explanations' :
     'Use moderate encouragement'}
5. Depth: Explain at ${profile.preferredExplanationDepth} level
6. If this concept relates to their difficult concepts, provide extra support and alternative explanations
7. Build upon their mastered concepts when possible

Be engaging, adaptive, and ensure the student feels supported in their learning journey.`;
  }
}

export const aiService = new AIService();
