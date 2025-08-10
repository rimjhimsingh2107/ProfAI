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

# Initialize OpenAI and configure logging
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# OpenAI voice IDs for podcast personas  
PODCAST_VOICES = {
    'sarah': {
        'voice_id': 'shimmer',  # OpenAI's shimmer voice - bright, energetic female
        'name': 'Sarah',
        'style': 'AI researcher and educator',
        'personality': 'warm, analytical, excellent at breaking down complex concepts'
    },
    'marcus': {
        'voice_id': 'echo',  # OpenAI's echo voice - male voice
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
    
    # Make follow-ups shorter and more focused
    is_followup = len(conversation_history) > 0
    script_length = "short" if is_followup else "medium"  # Shorter for follow-ups
    
    prompt = f"""You are creating a script for an engaging educational podcast in {language_name}. Respond entirely in {language_name}.

PODCAST SETUP:
- 2 AI experts having a natural, conversational discussion in {language_name}
- Sarah: AI researcher (warm, analytical, breaks down concepts with empathy)
- Marcus: Tech journalist (engaging, practical, connects theory to real-world applications)

CONVERSATION STYLE in {language_name}:
- Natural, flowing conversation like a real podcast between two colleagues
- {"Each speaker has 1-2 turns (15-30 words each) - keep it concise" if is_followup else "Each speaker has 2-4 turns (25-50 words each)"}
- Include natural speech: "Well...", "Actually...", "That's interesting...", "You know what...", "Uhhh...", "Right...", "Exactly..."
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
    """Regular multilingual single-response chat endpoint with adaptive prompts"""
    try:
        data = request.get_json() or {}
        message = data.get('message', '')
        sentiment_level = data.get('sentimentLevel', 'neutral')
        adaptive_prompt = data.get('adaptivePrompt', 'Provide a clear, engaging explanation.')
        conversation_history = data.get('conversationHistory', [])
        language = data.get('language', 'en-US')
        language_name = data.get('languageName', 'English')
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        logger.info(f"Processing {language_name} chat (sentiment: {sentiment_level}): {message[:50]}...")
        
        # Create adaptive system prompt based on sentiment
        system_prompt = f"""You are ProfAI, a knowledgeable and empathetic AI educator. Respond entirely in {language_name}.

ADAPTIVE INSTRUCTION: {adaptive_prompt}

Core Guidelines:
- Speak naturally as if talking to a friend
- Keep responses conversational (20-30 seconds when spoken)
- Use appropriate analogies and examples
- Be warm, patient, and encouraging
- Ask thoughtful follow-up questions

Respond entirely in {language_name}."""

        # Prepare messages for OpenAI
        messages = [{'role': 'system', 'content': system_prompt}]
        
        # Add recent conversation history (reduced to prevent token overflow)
        for msg in conversation_history[-2:]:  # Only last 2 messages instead of 6
            if msg.get('role') and msg.get('content'):
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
        
        # Generate audio using OpenAI TTS for natural voice
        audio_data = None
        try:
            audio_data = generate_audio_with_openai(
                ai_response, 
                'nova'  # Using nova voice for ProfAI (warm, engaging female voice)
            )
            if audio_data:
                # Convert audio data to hex string for frontend
                audio_hex = audio_data.hex()
                logger.info(f"Generated audio for ProfAI using OpenAI voice nova")
            else:
                audio_hex = None
        except Exception as e:
            logger.error(f"OpenAI TTS failed for ProfAI: {e}")
            audio_hex = None
        
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
            'audioData': audio_hex,  # Now includes OpenAI audio data
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
    app.run(host='0.0.0.0', port=port, debug=debug)
