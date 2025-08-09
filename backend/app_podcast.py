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
CORS(app, origins=['http://localhost:3000', 'http://localhost:3001'])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI and ElevenLabs
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')

# OpenAI voice IDs for podcast personas  
PODCAST_VOICES = {
    'sarah': {
        'voice_id': 'shimmer',  # OpenAI's shimmer voice - bright, energetic female
        'name': 'Sarah',
        'style': 'AI researcher and educator',
        'personality': 'warm, analytical, excellent at breaking down complex concepts'
    },
    'marcus': {
        'voice_id': 'alloy',  # OpenAI's alloy voice - neutral, balanced
        'name': 'Marcus',
        'style': 'Tech journalist and industry expert',
        'personality': 'engaging, practical, asks great questions and connects theory to real-world'
    }
}

def generate_audio_with_openai(text, voice_id):
    """Generate audio using OpenAI's TTS API"""
    
    try:
        response = openai_client.audio.speech.create(
            model="tts-1-hd",  # Higher quality model
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

def generate_podcast_script(topic, conversation_history, language='en-US', language_name='English'):
    """Generate a multilingual multi-speaker podcast script about the topic"""
    
    script_length = "medium" # 2-3 exchanges per speaker
    
    prompt = f"""You are creating a script for an engaging educational podcast in {language_name}. Respond entirely in {language_name}.

PODCAST SETUP:
- 2 AI experts having a natural, conversational discussion in {language_name}
- Sarah: AI researcher (warm, analytical, breaks down concepts with empathy)
- Marcus: Tech journalist (engaging, practical, connects theory to real-world applications)

CONVERSATION STYLE in {language_name}:
- Natural, flowing conversation like a real podcast between two colleagues
- Each speaker has 2-4 turns (25-50 words each)
- Include natural speech: "Well...", "Actually...", "That's interesting...", "You know what..."
- Build on each other's points naturally
- Ask follow-up questions and show genuine curiosity
- Use relatable analogies and examples
- Keep it engaging and educational
- Show genuine enthusiasm and interest in the topic
- Create a back-and-forth dynamic that feels like listening to real experts

IMPORTANT: Respond entirely in {language_name}. Do not mix languages.

FORMAT YOUR RESPONSE AS JSON:
{{
  "speakers": [
    {{"speaker": "sarah", "text": "Response in {language_name}..."}},
    {{"speaker": "marcus", "text": "Response in {language_name}..."}}
  ],
  "topic_summary": "Brief summary in {language_name}"
}}

TOPIC: {topic}
LANGUAGE: {language_name}
CONVERSATION CONTEXT: {json.dumps(conversation_history[-2:] if conversation_history else [])}

Create an engaging {script_length} conversation (6-9 total exchanges) entirely in {language_name} that educates about this topic."""

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
                    {"speaker": "alex", "text": f"Great question about {topic}. Let me break this down for you."},
                    {"speaker": "maya", "text": "From a practical standpoint, this is really important to understand."},
                    {"speaker": "sam", "text": "So what does this mean for someone just getting started?"}
                ],
                "topic_summary": f"Discussion about {topic}"
            }
            
    except Exception as e:
        logger.error(f"Error generating podcast script: {e}")
        return {
            "speakers": [
                {"speaker": "alex", "text": f"Let's discuss {topic} in detail."}
            ],
            "topic_summary": f"Discussion about {topic}"
        }

def generate_audio_with_elevenlabs(text, voice_id, output_format="mp3_44100_128"):
    """Generate audio using ElevenLabs API"""
    
    if not ELEVENLABS_API_KEY:
        logger.warning("ElevenLabs API key not found")
        return None
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    data = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.6,
            "similarity_boost": 0.7,
            "style": 0.8,
            "use_speaker_boost": True
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        
        if response.status_code == 200:
            return response.content
        else:
            logger.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error calling ElevenLabs API: {e}")
        return None

@app.route('/', methods=['GET'])
def home():
    """Home endpoint"""
    return jsonify({
        'message': '🎙️ ProfAI Podcast Backend API',
        'status': 'running',
        'version': '2.0.0',
        'features': ['Multi-speaker conversations', 'ElevenLabs voice synthesis', 'Podcast-style discussions'],
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
            'elevenlabs': bool(os.getenv('ELEVENLABS_API_KEY'))
        }
    })

@app.route('/api/podcast', methods=['POST'])
def create_podcast():
    """Create a multilingual multi-speaker podcast about the topic"""
    try:
        data = request.get_json() or {}
        topic = data.get('message', data.get('topic', ''))
        conversation_history = data.get('conversationHistory', [])
        language = data.get('language', 'en-US')
        language_name = data.get('languageName', 'English')
        
        if not topic:
            return jsonify({'error': 'No topic provided'}), 400
        
        logger.info(f"Creating {language_name} podcast about: {topic}")
        
        # Generate the multilingual podcast script
        script_data = generate_podcast_script(topic, conversation_history, language, language_name)
        
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
                
                # Use OpenAI's TTS API for high-quality voices
                audio_data = None
                try:
                    audio_data = generate_audio_with_openai(
                        text, 
                        voice_config['voice_id']
                    )
                    logger.info(f"Generated audio for {voice_config['name']} using OpenAI voice {voice_config['voice_id']}")
                except Exception as e:
                    logger.error(f"OpenAI TTS failed for {voice_config['name']}: {e}")
                
                podcast_segments.append({
                    'speaker': voice_config['name'],
                    'text': text,
                    'audio_data': audio_data.hex() if audio_data else None,
                    'voice_id': voice_config['voice_id'],
                    'personality': voice_config['personality'],
                    'language': language
                })
                
                full_transcript.append(f"{voice_config['name']}: {text}")
        
        response_data = {
            'type': 'podcast',
            'topic': topic,
            'language': language,
            'language_name': language_name,
            'summary': script_data.get('topic_summary', f'Podcast discussion about {topic}'),
            'segments': podcast_segments,
            'full_transcript': '\n\n'.join(full_transcript),
            'speakers_count': len(podcast_segments),
            'total_segments': len(podcast_segments)
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Podcast creation error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Regular multilingual single-response chat endpoint"""
    try:
        data = request.get_json() or {}
        message = data.get('message', '')
        learning_profile = data.get('learningProfile', {})
        conversation_history = data.get('conversationHistory', [])
        custom_prompt = data.get('systemPrompt', '')
        language = data.get('language', 'en-US')
        language_name = data.get('languageName', 'English')
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        logger.info(f"Processing {language_name} chat: {message[:50]}...")
        
        # Create multilingual personalized prompt
        if custom_prompt:
            system_prompt = custom_prompt
        else:
            system_prompt = f"""You are ProfAI, a knowledgeable and multilingual AI educator. Respond entirely in {language_name}.

IMPORTANT: Respond only in {language_name}. Do not use any other language.

Teaching Style: Adapt to {learning_profile.get('preferredLearningStyle', 'conversational')} learning style.
Explanation Level: {learning_profile.get('preferredExplanationDepth', 'intermediate')}
Pace: {learning_profile.get('preferredPace', 'natural')}

Guidelines for responses in {language_name}:
- Speak naturally as if talking to a colleague or friend
- Use natural speech patterns appropriate for {language_name}
- Keep responses conversational (30-45 seconds when spoken)
- Use culturally relevant analogies and examples
- Show enthusiasm appropriate for the culture
- Ask follow-up questions to keep conversation flowing
- Explain topics accessibly without being condescending
- Use appropriate connectors and expressions for {language_name}

Be enthusiastic, patient, and engaging. Make learning fun and accessible in {language_name}!"""

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
            'language': language,
            'language_name': language_name,
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
    print(f"🎙️ ProfAI Podcast Backend starting on http://localhost:{port}")
    print(f"📊 ElevenLabs: {'✅ Enabled' if ELEVENLABS_API_KEY else '❌ Disabled (add ELEVENLABS_API_KEY)'}")
    app.run(host='0.0.0.0', port=port, debug=debug)
