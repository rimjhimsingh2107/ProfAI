from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from openai import OpenAI
import json
import logging
from datetime import datetime


load_dotenv()

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:3001', 'https://profai-frontend.onrender.com'])


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# two hosts for podcast mode, each mapped to an OpenAI TTS voice
PODCAST_VOICES = {
    'sarah': {
        'voice_id': 'shimmer',
        'name': 'Sarah',
        'style': 'AI researcher and educator',
        'personality': 'warm, analytical, excellent at breaking down complex concepts'
    },
    'marcus': {
        'voice_id': 'echo',
        'name': 'Marcus',
        'style': 'Tech journalist and industry expert',
        'personality': 'engaging, practical, asks great questions and connects theory to real-world'
    }
}

def generate_audio_with_openai(text, voice_id):
    try:
        response = openai_client.audio.speech.create(
            model="tts-1-hd",
            voice=voice_id,
            input=text,
            response_format="mp3",
            speed=1.0
        )

        return response.content
        
    except Exception as e:
        logger.error(f"Error calling OpenAI TTS API: {e}")
        return None

def generate_podcast_script(topic, conversation_history, language='en-US', language_name='English'):
    # follow-up questions get a shorter back-and-forth
    is_followup = len(conversation_history) > 0
    script_length = "short" if is_followup else "medium"
    
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

        try:
            script_data = json.loads(script_text)
            return script_data
        except json.JSONDecodeError:
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
    return jsonify({
        'message': 'ProfAI backend',
        'status': 'running',
        'version': '2.0.0',
        'features': ['chat', 'podcast mode', 'quizzes'],
        'endpoints': {
            'health': '/api/health',
            'chat': '/api/chat (POST)',
            'podcast': '/api/podcast (POST)'
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'openai': bool(os.getenv('OPENAI_API_KEY'))
        }
    })

@app.route('/api/podcast', methods=['POST'])
def create_podcast():
    try:
        data = request.get_json() or {}
        topic = data.get('message', data.get('topic', ''))
        conversation_history = data.get('conversationHistory', [])
        language = data.get('language', 'en-US')
        language_name = data.get('languageName', 'English')
        
        if not topic:
            return jsonify({'error': 'No topic provided'}), 400
        
        logger.info(f"Creating {language_name} podcast about: {topic}")

        script_data = generate_podcast_script(topic, conversation_history, language, language_name)
        
        if not script_data or 'speakers' not in script_data:
            return jsonify({'error': 'Failed to generate podcast script'}), 500
        
        podcast_segments = []
        full_transcript = []
        
        for segment in script_data['speakers']:
            speaker_name = segment['speaker']
            text = segment['text']
            
            if speaker_name in PODCAST_VOICES:
                voice_config = PODCAST_VOICES[speaker_name]

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
        
        # adaptive_prompt comes from the frontend's sentiment check
        system_prompt = f"""You are ProfAI, a knowledgeable and empathetic AI educator. Respond entirely in {language_name}.

ADAPTIVE INSTRUCTION: {adaptive_prompt}

Core Guidelines:
- Speak naturally as if talking to a friend
- Keep responses conversational (20-30 seconds when spoken)
- Use appropriate analogies and examples
- Be warm, patient, and encouraging
- Ask thoughtful follow-up questions

Respond entirely in {language_name}."""

        messages = [{'role': 'system', 'content': system_prompt}]

        # only the last two messages, to keep the prompt small
        for msg in conversation_history[-2:]:
            if msg.get('role') and msg.get('content'):
                messages.append({
                    'role': msg['role'],
                    'content': msg['content']
                })

        messages.append({'role': 'user', 'content': message})

        response = openai_client.chat.completions.create(
            model='gpt-4o',
            messages=messages,
            temperature=0.8,
            max_tokens=800,
            presence_penalty=0.1,
            frequency_penalty=0.1
        )
        
        ai_response = response.choices[0].message.content
        
        audio_data = None
        try:
            audio_data = generate_audio_with_openai(
                ai_response, 
                'nova'
            )
            if audio_data:
                audio_hex = audio_data.hex()
                logger.info("Generated audio for ProfAI using OpenAI voice nova")
            else:
                audio_hex = None
        except Exception as e:
            logger.error(f"OpenAI TTS failed for ProfAI: {e}")
            audio_hex = None
        
        # placeholder values until real analysis is added
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
            'audioData': audio_hex,
            'audioUrl': None,
            'emotionalTone': emotional_tone,
            'learningMetrics': learning_metrics
        })
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    try:
        data = request.get_json() or {}
        user_responses = data.get('userResponses', [])
        recent_conversation = data.get('recentConversation', [])

        topics_context = ' '.join(user_responses[-3:])
        
        quiz_prompt = f"""Based on the user's recent questions and responses about: "{topics_context}"

Create a multiple-choice quiz question to test their understanding. 

FORMAT YOUR RESPONSE AS JSON:
{{
  "question": "Clear, specific question about the topic discussed",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Brief explanation of why this answer is correct"
}}

Make the question:
- Relevant to what they've been learning
- Not too easy or too hard
- Test practical understanding, not just memorization
- Include one clearly correct answer and three plausible distractors"""
        
        response = openai_client.chat.completions.create(
            model='gpt-4o',
            messages=[
                {'role': 'system', 'content': quiz_prompt},
                {'role': 'user', 'content': f'Generate a quiz question about: {topics_context}'}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        quiz_response = response.choices[0].message.content
        logger.info(f"Raw quiz response: {quiz_response[:100]}...")
        
        try:
            quiz_data = json.loads(quiz_response)
        except json.JSONDecodeError:
            quiz_data = {
                "question": "What is the main concept we've been discussing?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": 0,
                "explanation": "Based on our conversation about the topic."
            }
        
        logger.info(f"Generated quiz question about: {topics_context[:50]}...")
        
        return jsonify(quiz_data)
        
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    print(f"ProfAI backend running on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
