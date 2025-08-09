from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import openai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import logging
from datetime import datetime, timedelta
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import speech_recognition as sr
import io
from pydub import AudioSegment
import tempfile

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])  # Allow frontend requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

# Initialize Firebase Admin SDK
firebase_config = {
    "type": "service_account",
    "project_id": os.getenv('FIREBASE_PROJECT_ID'),
    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
    "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
    "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
    "client_id": os.getenv('FIREBASE_CLIENT_ID'),
    "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
    "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
    "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
    "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
}

try:
    cred = credentials.Certificate(firebase_config)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logger.info("Firebase initialized successfully")
except Exception as e:
    logger.error(f"Firebase initialization failed: {e}")
    db = None
class LearningProfileAnalyzer:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.learning_patterns = {}
    
    def analyze_conversation(self, messages, user_profile):
        """Analyze conversation patterns to understand learning effectiveness"""
        try:
            # Extract text content from messages
            user_messages = [msg['content'] for msg in messages if msg['role'] == 'user']
            assistant_messages = [msg['content'] for msg in messages if msg['role'] == 'assistant']
            
            if not user_messages:
                return self._default_metrics()
            
            # Analyze question complexity and understanding patterns
            complexity_scores = self._analyze_question_complexity(user_messages)
            comprehension_level = self._estimate_comprehension(user_messages, assistant_messages)
            engagement_level = self._measure_engagement(user_messages)
            
            # Detect emotional tone from text
            emotional_tone = self._detect_emotional_tone(user_messages[-1] if user_messages else "")
            
            # Generate learning metrics
            learning_metrics = {
                'comprehensionLevel': min(10, max(1, int(comprehension_level * 10))),
                'questionComplexity': min(10, max(1, int(np.mean(complexity_scores) * 10))),
                'topicMastery': self._estimate_topic_mastery(user_messages, user_profile),
                'needsReinforcement': comprehension_level < 0.6,
                'suggestedNextTopic': self._suggest_next_topic(user_messages, user_profile)
            }
            
            return {
                'emotionalTone': emotional_tone,
                'learningMetrics': learning_metrics
            }
            
        except Exception as e:
            logger.error(f"Error analyzing conversation: {e}")
            return self._default_metrics()
    
    def _analyze_question_complexity(self, messages):
        """Analyze the complexity of user questions"""
        complexity_scores = []
        for message in messages:
            words = len(message.split())
            question_marks = message.count('?')
            technical_terms = len([word for word in message.lower().split() 
                                 if word in ['algorithm', 'neural', 'model', 'training', 'deep', 'learning']])
            
            # Simple complexity scoring
            complexity = (words / 20) + (question_marks * 0.2) + (technical_terms * 0.3)
            complexity_scores.append(min(1.0, complexity))
        
        return complexity_scores
    
    def _estimate_comprehension(self, user_messages, assistant_messages):
        """Estimate user comprehension based on conversation flow"""
        if len(user_messages) < 2:
            return 0.5
        
        # Look for follow-up questions, clarifications, and building on concepts
        follow_ups = sum(1 for msg in user_messages if any(word in msg.lower() 
                        for word in ['what', 'how', 'why', 'can you explain']))
        
        clarifications = sum(1 for msg in user_messages if any(word in msg.lower() 
                           for word in ['confused', "don't understand", 'unclear']))
        
        building_questions = sum(1 for msg in user_messages if any(word in msg.lower() 
                               for word in ['also', 'additionally', 'what about', 'how does this relate']))
        
        total_messages = len(user_messages)
        comprehension_score = 0.5 + (building_questions / total_messages * 0.3) - (clarifications / total_messages * 0.2)
        
        return max(0.1, min(1.0, comprehension_score))
    
    def _measure_engagement(self, messages):
        """Measure user engagement level"""
        if not messages:
            return 0.5
        
        avg_length = np.mean([len(msg.split()) for msg in messages])
        enthusiasm_words = sum(msg.lower().count(word) for msg in messages 
                             for word in ['interesting', 'cool', 'amazing', 'great', 'awesome'])
        
        engagement = min(1.0, (avg_length / 15) + (enthusiasm_words / len(messages) * 0.2))
        return engagement    
    def _detect_emotional_tone(self, message):
        """Detect emotional tone from message content"""
        positive_words = ['excited', 'great', 'awesome', 'love', 'amazing', 'fantastic']
        negative_words = ['confused', 'frustrated', 'difficult', 'hard', 'stuck', 'lost']
        question_words = ['what', 'how', 'why', 'when', 'where']
        
        message_lower = message.lower()
        
        positive_count = sum(word in message_lower for word in positive_words)
        negative_count = sum(word in message_lower for word in negative_words)
        question_count = sum(word in message_lower for word in question_words)
        
        if negative_count > 0:
            sentiment = 'frustrated' if 'frustrated' in message_lower else 'confused'
        elif positive_count > 0:
            sentiment = 'excited' if 'excited' in message_lower else 'positive'
        elif question_count > 0:
            sentiment = 'confused' if len(message.split()) > 15 else 'neutral'
        else:
            sentiment = 'neutral'
        
        confidence = min(0.9, max(0.3, (positive_count + negative_count + question_count) / 10))
        engagement = min(1.0, len(message.split()) / 20)
        
        return {
            'sentiment': sentiment,
            'confidence': confidence,
            'engagement': engagement
        }
    
    def _estimate_topic_mastery(self, messages, user_profile):
        """Estimate mastery level for current topic"""
        mastered_concepts = user_profile.get('masteredConcepts', [])
        difficult_concepts = user_profile.get('difficultConcepts', [])
        
        # Simple heuristic based on profile
        base_mastery = len(mastered_concepts) / max(1, len(mastered_concepts) + len(difficult_concepts))
        
        # Adjust based on current conversation complexity
        recent_complexity = self._analyze_question_complexity(messages[-3:] if len(messages) >= 3 else messages)
        complexity_adjustment = np.mean(recent_complexity) if recent_complexity else 0.5
        
        mastery_score = (base_mastery * 0.7) + (complexity_adjustment * 0.3)
        return min(10, max(1, int(mastery_score * 10)))
    
    def _suggest_next_topic(self, messages, user_profile):
        """Suggest next learning topic based on conversation"""
        topics = [
            'Neural Networks', 'Deep Learning', 'Machine Learning Algorithms',
            'Natural Language Processing', 'Computer Vision', 'Reinforcement Learning',
            'Data Preprocessing', 'Model Evaluation', 'Transfer Learning', 'Transformers'
        ]
        
        mastered = user_profile.get('masteredConcepts', [])
        current_topic_words = ' '.join(messages[-5:] if len(messages) >= 5 else messages).lower()
        
        # Simple suggestion logic
        for topic in topics:
            if topic.lower() not in ' '.join(mastered).lower() and topic.lower() not in current_topic_words:
                return topic
        
        return 'Advanced AI Applications'
    
    def _default_metrics(self):
        """Return default metrics when analysis fails"""
        return {
            'emotionalTone': {
                'sentiment': 'neutral',
                'confidence': 0.5,
                'engagement': 0.5
            },
            'learningMetrics': {
                'comprehensionLevel': 5,
                'questionComplexity': 5,
                'topicMastery': 5,
                'needsReinforcement': False,
                'suggestedNextTopic': 'Machine Learning Basics'
            }
        }

# Initialize analyzer
analyzer = LearningProfileAnalyzer()
def create_personalized_prompt(message, learning_profile, conversation_history):
    """Create a personalized prompt based on user's learning profile"""
    
    profile = learning_profile
    recent_messages = conversation_history[-6:] if len(conversation_history) >= 6 else conversation_history
    
    system_prompt = f"""You are ProfAI, an emotionally intelligent AI professor specializing in AI and machine learning education. 

Student Learning Profile:
- Learning Style: {profile.get('preferredLearningStyle', 'mixed')}
- Conceptual Understanding: {profile.get('conceptualUnderstanding', 5)}/10
- Practical Skills: {profile.get('practicalSkills', 5)}/10
- Preferred Pace: {profile.get('preferredPace', 'medium')}
- Explanation Depth: {profile.get('preferredExplanationDepth', 'intermediate')}
- Response to Encouragement: {profile.get('responseToEncouragement', 5)}/10
- Difficult Concepts: {', '.join(profile.get('difficultConcepts', []))}
- Mastered Concepts: {', '.join(profile.get('masteredConcepts', []))}
- Total Interactions: {profile.get('totalInteractions', 0)}

Teaching Adaptations:
1. Learning Style: {'Use visual analogies, diagrams, and step-by-step breakdowns' if profile.get('preferredLearningStyle') == 'visual' else 
                   'Use verbal explanations, audio metaphors, and spoken examples' if profile.get('preferredLearningStyle') == 'auditory' else
                   'Use hands-on examples, interactive elements, and practical applications' if profile.get('preferredLearningStyle') == 'kinesthetic' else
                   'Use a balanced mix of visual, auditory, and hands-on approaches'}

2. Pacing: {'Take extra time to explain each concept thoroughly with multiple examples' if profile.get('preferredPace') == 'slow' else
           'Be concise but comprehensive, cover topics efficiently' if profile.get('preferredPace') == 'fast' else
           'Balance detail with efficiency, moderate pacing'}

3. Encouragement: {'Use plenty of positive reinforcement and celebrate progress' if profile.get('responseToEncouragement', 5) > 7 else
                   'Focus on direct, matter-of-fact explanations without excessive praise' if profile.get('responseToEncouragement', 5) < 4 else
                   'Use moderate encouragement and supportive language'}

4. Depth: Explain concepts at {profile.get('preferredExplanationDepth', 'intermediate')} level

5. Build on mastered concepts and provide extra support for difficult ones

Conversation Context: {json.dumps([msg['content'] for msg in recent_messages[-3:]])}

Your personality: Enthusiastic, patient, adaptive, and genuinely excited about helping students learn AI. 
Make learning engaging and fun while being academically rigorous."""

    return system_prompt

def transcribe_audio(audio_file):
    """Transcribe audio to text using speech recognition"""
    try:
        recognizer = sr.Recognizer()
        
        # Convert audio file to wav if needed
        audio = AudioSegment.from_file(io.BytesIO(audio_file.read()))
        
        # Create temporary wav file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
            audio.export(temp_wav.name, format="wav")
            
            with sr.AudioFile(temp_wav.name) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_google(audio_data)
                
        os.unlink(temp_wav.name)  # Clean up temp file
        return text
        
    except Exception as e:
        logger.error(f"Audio transcription failed: {e}")
        return None
@app.route('/api/chat', methods=['POST'])
def chat():
    """Main chat endpoint for generating AI responses"""
    try:
        # Get form data
        message = request.form.get('message')
        learning_profile = json.loads(request.form.get('learningProfile', '{}'))
        conversation_history = json.loads(request.form.get('conversationHistory', '[]'))
        
        # Handle audio input if present
        if 'audio' in request.files:
            audio_file = request.files['audio']
            transcribed_text = transcribe_audio(audio_file)
            if transcribed_text:
                message = transcribed_text
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Create personalized prompt
        system_prompt = create_personalized_prompt(message, learning_profile, conversation_history)
        
        # Prepare messages for OpenAI
        messages = [{'role': 'system', 'content': system_prompt}]
        
        # Add recent conversation history
        for msg in conversation_history[-6:]:  # Last 6 messages for context
            messages.append({
                'role': msg['role'],
                'content': msg['content']
            })
        
        # Add current user message
        messages.append({'role': 'user', 'content': message})
        
        # Generate response with OpenAI
        response = openai.ChatCompletion.create(
            model='gpt-4',
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        ai_response = response.choices[0].message.content
        
        # Analyze the conversation for learning insights
        analysis_messages = conversation_history + [{'role': 'user', 'content': message}]
        analysis_result = analyzer.analyze_conversation(analysis_messages, learning_profile)
        
        # Generate audio response (optional - you could use text-to-speech service)
        audio_url = None  # Implement TTS service if needed
        
        return jsonify({
            'response': ai_response,
            'audioUrl': audio_url,
            'emotionalTone': analysis_result['emotionalTone'],
            'learningMetrics': analysis_result['learningMetrics']
        })
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        return jsonify({'error': 'Failed to generate response'}), 500
@app.route('/api/learning-profile/update', methods=['POST'])
def update_learning_profile():
    """Update user's learning profile based on interaction history"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        interactions = data.get('interactions', [])
        
        if not user_id or not db:
            return jsonify({'error': 'Invalid request or database unavailable'}), 400
        
        # Analyze recent interactions to update learning profile
        user_messages = [msg for msg in interactions if msg['role'] == 'user']
        
        if not user_messages:
            return jsonify({'error': 'No user interactions found'}), 400
        
        # Calculate updated metrics
        avg_message_length = np.mean([len(msg['content'].split()) for msg in user_messages])
        question_complexity = analyzer._analyze_question_complexity([msg['content'] for msg in user_messages])
        
        # Determine learning patterns
        conceptual_understanding = min(10, max(1, int(np.mean(question_complexity) * 10)))
        
        # Detect learning style from interaction patterns
        visual_indicators = sum('show' in msg['content'].lower() or 'see' in msg['content'].lower() 
                               for msg in user_messages)
        auditory_indicators = sum('explain' in msg['content'].lower() or 'tell' in msg['content'].lower() 
                                 for msg in user_messages)
        kinesthetic_indicators = sum('try' in msg['content'].lower() or 'practice' in msg['content'].lower() 
                                    for msg in user_messages)
        
        # Determine preferred learning style
        if visual_indicators > auditory_indicators and visual_indicators > kinesthetic_indicators:
            preferred_style = 'visual'
        elif auditory_indicators > kinesthetic_indicators:
            preferred_style = 'auditory'
        elif kinesthetic_indicators > 0:
            preferred_style = 'kinesthetic'
        else:
            preferred_style = 'mixed'
        
        # Update learning profile in Firebase
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            current_profile = user_doc.to_dict().get('learningProfile', {})
            
            updated_profile = {
                **current_profile,
                'preferredLearningStyle': preferred_style,
                'conceptualUnderstanding': conceptual_understanding,
                'totalInteractions': current_profile.get('totalInteractions', 0) + len(interactions),
                'averageSessionDuration': avg_message_length,  # Simplified metric
                'lastUpdated': datetime.now().isoformat()
            }
            
            user_ref.update({'learningProfile': updated_profile})
            return jsonify(updated_profile)
        else:
            return jsonify({'error': 'User not found'}), 404
            
    except Exception as e:
        logger.error(f"Learning profile update error: {e}")
        return jsonify({'error': 'Failed to update learning profile'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'openai': bool(os.getenv('OPENAI_API_KEY')),
            'firebase': db is not None
        }
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
