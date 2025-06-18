import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from codecarbon import track_emissions
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

@track_emissions()
def generate_sustainability_insights_with_tracking(stats):
    """
    Generate sustainability insights with carbon tracking
    """
    if not stats:
        raise ValueError('Invalid stats provided')

    # Calculate percentage for low waste choices
    low_waste_percentage = round((stats['lowWasteItems'] / stats['totalItems']) * 100) if stats['totalItems'] > 0 else 0

    prompt = f"""
You are a sustainability coach analyzing packaging choices. Based on these user stats:

- Total recent purchases: {stats['totalItems']}
- Low-waste choices: {stats['lowWasteItems']}/{stats['totalItems']} ({low_waste_percentage}%)
- Sustainable switches made: {stats['sustainableSwitches']}
- Common high-waste packaging: {', '.join(stats['commonHighWastePackaging']) if stats['commonHighWastePackaging'] else 'None'}
- Frequently bought items: {', '.join([f'{food} ({count}x)' for food, count in list(stats['mostLoggedFoods'].items())[:5]]) if stats['mostLoggedFoods'] else 'None'}

Generate 3-4 personalized sustainability insights following this JSON format strictly:
{{
  "insights": [
    {{
      "type": "environmental_impact/improvement_suggestion/achievement/challenge",
      "title": "Insight title",
      "description": "Detailed description with specific data",
      "actionItems": ["Specific action 1", "Specific action 2"]
    }}
  ]
}}

Focus on:
1. Environmental impact calculations (if applicable and simple)
2. Specific improvement suggestions  
3. Celebrating achievements
4. Personalized challenges
Ensure the output is a valid JSON object starting with {{ and ending with }}. Do not include any text before or after the JSON structure.
    """.strip()

    print('Python Service: Making request to Anthropic for sustainability insights...')
    anthropic_response = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        json={
            'model': 'claude-3-haiku-20240307',
            'max_tokens': 2000,
            'temperature': 0.7,
            'messages': [{'role': 'user', 'content': prompt}],
        }
    )

    if not anthropic_response.ok:
        error_text = anthropic_response.text
        print(f'Python Service: Anthropic API error: {anthropic_response.status_code} {error_text}')
        raise Exception(f'Anthropic API error: {anthropic_response.status_code}')

    response_data = anthropic_response.json()

    if response_data.get('content') and len(response_data['content']) > 0 and response_data['content'][0].get('text'):
        try:
            parsed_json = json.loads(response_data['content'][0]['text'])
            print('Python Service: Successfully received and parsed response from Anthropic.')
            return parsed_json
        except json.JSONDecodeError as e:
            print(f'Python Service: Error parsing JSON from Anthropic: {e}')
            print(f'Python Service: Raw text from Anthropic: {response_data["content"][0]["text"]}')
            raise Exception('Failed to parse response from AI model.')
    else:
        print('Python Service: No content found in Anthropic response or unexpected format.')
        raise Exception('No content returned from AI model.')

@app.route('/api/sustainability-insights', methods=['POST'])
def sustainability_insights():
    try:
        data = request.get_json()
        stats = data.get('stats')
        
        if not stats:
            return jsonify({'error': 'Invalid stats provided'}), 400

        result = generate_sustainability_insights_with_tracking(stats)
        return jsonify(result)
    
    except Exception as e:
        print(f'Python Service: Error in sustainability insights: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'carbon-tracked-api'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True) 