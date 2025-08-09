from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from openai import OpenAI
import json
import logging
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:3001'])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@app.route('/', methods=['GET'])
def home():
    """Home endpoint"""
    return jsonify({
        'message': '🧠 ProfAI Backend API',
        'status': 'running',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health',
            'chat': '/api/chat (POST)'
        }
    })

@app.route('/api/test-voice', methods=['POST'])
def test_voice():
    """Test endpoint for voice responses"""
    try:
        data = request.get_json() or {}
        message = data.get('message', 'Hello, this is a test message')
        
        # Simple conversational response for testing
        test_response = f"Well, you asked about '{message}'. That's actually a really interesting question, and here's what I think about it. The key thing to understand is that this is just a test response to help us check if the voice synthesis is working properly. How does this sound to you?"
        
        return jsonify({
            'response': test_response,
            'audioUrl': None,
            'emotionalTone': {
                'sentiment': 'positive',
                'confidence': 0.9,
                'engagement': 0.8
            },
            'learningMetrics': {
                'comprehensionLevel': 8,
                'questionComplexity': 6,
                'topicMastery': 7,
                'needsReinforcement': False,
                'suggestedNextTopic': 'Voice Testing'
            }
        })
        
    except Exception as e:
        logger.error(f"Test voice endpoint error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'openai': bool(os.getenv('OPENAI_API_KEY'))
        }
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Main chat endpoint for generating AI responses"""
    try:
        # Get form data
        data = request.get_json() or {}
        message = data.get('message', '')
        learning_profile = data.get('learningProfile', {})
        conversation_history = data.get('conversationHistory', [])
        custom_prompt = data.get('systemPrompt', '')
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Create personalized prompt
        if custom_prompt:
            system_prompt = custom_prompt
        else:
            system_prompt = f"""You are ProfAI, an emotionally intelligent AI professor specializing in AI and machine learning education.

Teaching Style: Adapt to {learning_profile.get('preferredLearningStyle', 'mixed')} learning style.
Explanation Level: {learning_profile.get('preferredExplanationDepth', 'intermediate')}
Pace: {learning_profile.get('preferredPace', 'medium')}

Be enthusiastic, patient, and engaging. Make learning fun and accessible!"""

        # Prepare messages for OpenAI
        messages = [{'role': 'system', 'content': system_prompt}]
        
        # Add recent conversation history
        for msg in conversation_history[-6:]:
            messages.append({
                'role': msg['role'],
                'content': msg['content']
            })
        
        # Add current user message
        messages.append({'role': 'user', 'content': message})
        
        # Generate response with OpenAI - using GPT-4 for better conversational responses
        response = client.chat.completions.create(
            model='gpt-4o',  # Using GPT-4o for more natural responses
            messages=messages,
            temperature=0.8,  # Higher temperature for more natural, varied responses
            max_tokens=800,   # Shorter responses for better voice delivery
            presence_penalty=0.1,  # Encourage more diverse vocabulary
            frequency_penalty=0.1  # Reduce repetition
        )
        
        ai_response = response.choices[0].message.content
        
        # Mock analysis for now
        emotional_tone = {
            'sentiment': 'positive',
            'confidence': 0.8,
            'engagement': 0.7
        }
        
        learning_metrics = {
            'comprehensionLevel': 7,
            'questionComplexity': 5,
            'topicMastery': 6,
            'needsReinforcement': False,
            'suggestedNextTopic': 'Neural Networks'
        }
        
        return jsonify({
            'response': ai_response,
            'audioUrl': None,
            'emotionalTone': emotional_tone,
            'learningMetrics': learning_metrics
        })
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    print(f"🧠 ProfAI Backend starting on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
