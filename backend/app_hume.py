from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
from dotenv import load_dotenv
from openai import OpenAI
import json
import logging
from datetime import datetime
import requests
import io

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# OpenAI Voice API configurations for 2-person podcast
PODCAST_VOICES = {
    'sarah': {
        'voice_id': 'shimmer',  # OpenAI's shimmer voice - warm female voice
        'name': 'Sarah',
        'style': 'AI educator and researcher',
        'personality': 'warm, analytical, excellent at breaking down complex concepts with empathy'
    },
    'marcus': {
        'voice_id': 'echo',  # OpenAI's echo voice - clear, professional male
        'name': 'Marcus',
        'style': 'Tech journalist and industry expert',
        'personality': 'engaging, practical, asks great questions and connects theory to real-world applications'
    }
}

def generate_podcast_script(topic, conversation_history):
    """Generate a 2-speaker podcast script about the topic"""
    
    prompt = f"""You are creating a script for an engaging AI education podcast. The topic is: "{topic}"

PODCAST SETUP:
- 2 AI experts having a natural, conversational discussion
- Sarah: AI educator/researcher (warm, analytical, breaks down concepts with empathy)
- Marcus: Tech journalist/industry expert (engaging, practical, connects theory to real-world)

CONVERSATION STYLE:
- Natural, flowing conversation like a real podcast between two colleagues
- Each speaker has 2-4 turns (25-50 words each)
- Include natural speech: "Well...", "Actually...", "That's interesting...", "You know what..."
- Build on each other's points naturally
- Ask follow-up questions and show genuine curiosity
- Use relatable analogies and examples
- Keep it engaging and educational
- Show genuine enthusiasm and interest in the topic
- Create a back-and-forth dynamic that feels like listening to real experts

FORMAT YOUR RESPONSE AS JSON:
{{
  "speakers": [
    {{"speaker": "sarah", "text": "Well, that's a fascinating question about machine learning..."}},
    {{"speaker": "marcus", "text": "Exactly! And what I've seen in the industry is..."}},
    {{"speaker": "sarah", "text": "That's such a great point, Marcus..."}}
  ],
  "topic_summary": "Brief summary of what was discussed"
}}

TOPIC: {topic}
CONVERSATION CONTEXT: {json.dumps(conversation_history[-2:] if conversation_history else [])}

Create an engaging conversation (6-10 total exchanges) that educates about this topic with natural back-and-forth between Sarah and Marcus."""

    try:
        response = openai_client.chat.completions.create(
            model='gpt-4o',
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Create a podcast conversation about: {topic}"}
            ],
            temperature=0.8,
            max_tokens=1500
        )
        
        script_text = response.choices[0].message.content
        
        # Parse JSON response
        try:
            script_data = json.loads(script_text)
            return script_data
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            logger.warning("Failed to parse JSON from GPT response")
            return {
                "speakers": [
                    {"speaker": "sarah", "text": f"That's a great question about {topic}. Let me break this down for you in a way that's easy to understand."},
                    {"speaker": "marcus", "text": "Absolutely, Sarah. And from what I've seen in the industry, this is becoming incredibly important."},
                    {"speaker": "sarah", "text": "Exactly! The key thing to understand is how this applies in practice."},
                    {"speaker": "marcus", "text": "So what would you recommend for someone just getting started with this?"}
                ],
                "topic_summary": f"Discussion between Sarah and Marcus about {topic}"
            }
            
    except Exception as e:
        logger.error(f"Error generating podcast script: {e}")
        return {
            "speakers": [
                {"speaker": "sarah", "text": f"Let's explore {topic} together."},
                {"speaker": "marcus", "text": "That sounds like a fascinating topic to discuss."}
            ],
            "topic_summary": f"Discussion about {topic}"
        }

def generate_audio_with_openai(text, voice_id):
    """Generate audio using OpenAI's TTS API"""
    
    try:
        response = openai_client.audio.speech.create(
            model="tts-1",  # or "tts-1-hd" for higher quality
            voice=voice_id,
            input=text,
            response_format="mp3",
            speed=1.0
        )
        
        # Return audio data as bytes
        return response.content
        
    except Exception as e:
        logger.error(f"Error calling OpenAI TTS API: {e}")
        return None

@app.route('/', methods=['GET'])
def home():
    """Home endpoint"""
    return jsonify({
        'message': '🎙️ ProfAI 2-Speaker Podcast Backend',
        'status': 'running',
        'version': '2.2.0',
        'features': ['2-speaker conversations', 'OpenAI voice synthesis', 'Natural podcast discussions'],
        'speakers': ['Sarah (Shimmer voice)', 'Marcus (Echo voice)'],
        'voice_provider': 'OpenAI TTS API',
        'endpoints': {
            'health': '/api/health',
            'chat': '/api/chat (POST)',
            'podcast': '/api/podcast (POST)'
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'openai': bool(os.getenv('OPENAI_API_KEY')),
            'openai_tts': bool(os.getenv('OPENAI_API_KEY'))
        }
    })

@app.route('/api/podcast', methods=['POST'])
def create_podcast():
    """Create a 2-speaker podcast about the topic"""
    try:
        data = request.get_json() or {}
        topic = data.get('message', data.get('topic', ''))
        conversation_history = data.get('conversationHistory', [])
        
        if not topic:
            return jsonify({'error': 'No topic provided'}), 400
        
        logger.info(f"Creating 2-speaker podcast about: {topic}")
        
        # Generate the podcast script
        script_data = generate_podcast_script(topic, conversation_history)
        
        if not script_data or 'speakers' not in script_data:
            return jsonify({'error': 'Failed to generate podcast script'}), 500
        
        # Generate audio for each speaker segment
        podcast_segments = []
        full_transcript = []
        
        for segment in script_data['speakers']:
            speaker_name = segment['speaker']
            text = segment['text']
            
            if speaker_name in PODCAST_VOICES:
                voice_config = PODCAST_VOICES[speaker_name]
                
                # Generate audio with OpenAI TTS
                audio_data = generate_audio_with_openai(
                    text, 
                    voice_config['voice_id']
                )
                
                podcast_segments.append({
                    'speaker': voice_config['name'],
                    'text': text,
                    'audio_data': audio_data.hex() if audio_data else None,
                    'voice_id': voice_config['voice_id'],
                    'personality': voice_config['personality'],
                    'voice_type': voice_config['voice_id']
                })
                
                full_transcript.append(f"{voice_config['name']}: {text}")
        
        response_data = {
            'type': 'podcast',
            'topic': topic,
            'summary': script_data.get('topic_summary', f'Podcast discussion about {topic}'),
            'segments': podcast_segments,
            'full_transcript': '\n\n'.join(full_transcript),
            'speakers_count': len(podcast_segments),
            'total_segments': len(podcast_segments),
            'speakers': ['Sarah (Warm American Female)', 'Marcus (Male Podcaster)']
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Podcast creation error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Regular single-response chat endpoint"""
    try:
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
            system_prompt = f"""You are ProfAI, a knowledgeable and approachable AI educator. You're having a natural conversation with someone curious about various topics.

Teaching Style: Adapt to {learning_profile.get('preferredLearningStyle', 'conversational')} learning style.
Explanation Level: {learning_profile.get('preferredExplanationDepth', 'intermediate')}
Pace: {learning_profile.get('preferredPace', 'natural')}

Guidelines for natural conversation:
- Speak as if talking to a friend or colleague
- Use natural speech patterns: "Well, that's interesting..." "You know what..." "Here's the thing..."
- Keep responses conversational (30-45 seconds when spoken)
- Use relatable analogies and examples
- Show genuine enthusiasm for the topic
- Ask follow-up questions to keep the conversation flowing
- Be helpful with any topic, not just AI/ML

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
        
        # Generate response with OpenAI
        response = openai_client.chat.completions.create(
            model='gpt-4o',
            messages=messages,
            temperature=0.8,
            max_tokens=800,
            presence_penalty=0.1,
            frequency_penalty=0.1
        )
        
        ai_response = response.choices[0].message.content
        
        # Generate audio with OpenAI TTS for single mode too
        audio_data = generate_audio_with_openai(ai_response, 'nova')  # Use nova voice for single mode
        
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
            'suggestedNextTopic': 'Related Concepts'
        }
        
        return jsonify({
            'type': 'single',
            'response': ai_response,
            'audioData': audio_data.hex() if audio_data else None,
            'audioUrl': None,
            'emotionalTone': emotional_tone,
            'learningMetrics': learning_metrics
        })
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    print(f"🎙️ ProfAI 2-Speaker Podcast Backend starting on http://localhost:{port}")
    print(f"🗣️ OpenAI TTS: {'✅ Enabled' if os.getenv('OPENAI_API_KEY') else '❌ Disabled'}")
    print(f"🎭 Speakers: Sarah (Shimmer voice) & Marcus (Echo voice)")
    app.run(host='0.0.0.0', port=port, debug=debug)
