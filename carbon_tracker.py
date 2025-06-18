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

    prompt = f"""
You are a sustainability coach analyzing packaging choices. Based on these user stats:

- Total recent purchases: {stats['totalItems']}
- Low-waste choices: {stats['lowWasteItems']}/{stats['totalItems']} ({stats['totalItems'] > 0 ? round((stats['lowWasteItems']/stats['totalItems']) * 100) : 0}%)
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

@track_emissions()
def generate_packaging_alternatives_with_tracking(food_item, current_packaging):
    """
    Generate packaging alternatives with carbon tracking
    """
    prompt = f"""
You are a sustainability expert helping users find eco-friendly packaging alternatives. 

Food item: {food_item}
Current packaging: {current_packaging}

Generate 3-4 sustainable packaging alternatives following this JSON format strictly:
{{
  "alternatives": [
    {{
      "name": "Alternative name",
      "description": "Detailed description",
      "environmental_benefit": "Specific environmental benefit",
      "availability": "How easy to find",
      "cost_comparison": "Cost relative to current option"
    }}
  ]
}}

Focus on:
1. Practical alternatives that are widely available
2. Clear environmental benefits
3. Cost considerations
4. Ease of implementation

Ensure the output is a valid JSON object starting with {{ and ending with }}. Do not include any text before or after the JSON structure.
    """.strip()

    print('Python Service: Making request to Anthropic for packaging alternatives...')
    anthropic_response = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        json={
            'model': 'claude-3-haiku-20240307',
            'max_tokens': 1500,
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

@track_emissions()
def generate_disposal_guidance_with_tracking(food_item, packaging_type):
    """
    Generate disposal guidance with carbon tracking
    """
    prompt = f"""
You are a waste management expert helping users dispose of food packaging responsibly.

Food item: {food_item}
Packaging type: {packaging_type}

Generate disposal guidance following this JSON format strictly:
{{
  "disposal_guide": {{
    "method": "Primary disposal method",
    "steps": ["Step 1", "Step 2", "Step 3"],
    "environmental_impact": "Impact of this disposal method",
    "alternatives": ["Alternative method 1", "Alternative method 2"],
    "tips": ["Tip 1", "Tip 2"]
  }}
}}

Focus on:
1. Most environmentally friendly disposal method
2. Clear step-by-step instructions
3. Environmental impact explanation
4. Alternative options if available
5. Practical tips for better disposal

Ensure the output is a valid JSON object starting with {{ and ending with }}. Do not include any text before or after the JSON structure.
    """.strip()

    print('Python Service: Making request to Anthropic for disposal guidance...')
    anthropic_response = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        json={
            'model': 'claude-3-haiku-20240307',
            'max_tokens': 1500,
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

@track_emissions()
def generate_recipes_with_tracking(ingredients, dietary_preferences):
    """
    Generate recipes with carbon tracking
    """
    prompt = f"""
You are a sustainable cooking expert helping users create recipes from available ingredients.

Available ingredients: {', '.join(ingredients)}
Dietary preferences: {dietary_preferences}

Generate 2-3 recipes following this JSON format strictly:
{{
  "recipes": [
    {{
      "name": "Recipe name",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "sustainability_score": "High/Medium/Low",
      "waste_reduction_tips": ["Tip 1", "Tip 2"],
      "cooking_time": "X minutes",
      "difficulty": "Easy/Medium/Hard"
    }}
  ]
}}

Focus on:
1. Using all available ingredients efficiently
2. Minimizing food waste
3. Sustainable cooking practices
4. Clear, simple instructions
5. Dietary preference compliance

Ensure the output is a valid JSON object starting with {{ and ending with }}. Do not include any text before or after the JSON structure.
    """.strip()

    print('Python Service: Making request to Anthropic for recipes...')
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

@app.route('/api/packaging-alternatives', methods=['POST'])
def packaging_alternatives():
    try:
        data = request.get_json()
        food_item = data.get('food_item')
        current_packaging = data.get('current_packaging')
        
        if not food_item or not current_packaging:
            return jsonify({'error': 'Food item and current packaging are required'}), 400

        result = generate_packaging_alternatives_with_tracking(food_item, current_packaging)
        return jsonify(result)
    
    except Exception as e:
        print(f'Python Service: Error in packaging alternatives: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/disposal-guidance', methods=['POST'])
def disposal_guidance():
    try:
        data = request.get_json()
        food_item = data.get('food_item')
        packaging_type = data.get('packaging_type')
        
        if not food_item or not packaging_type:
            return jsonify({'error': 'Food item and packaging type are required'}), 400

        result = generate_disposal_guidance_with_tracking(food_item, packaging_type)
        return jsonify(result)
    
    except Exception as e:
        print(f'Python Service: Error in disposal guidance: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/recipes', methods=['POST'])
def recipes():
    try:
        data = request.get_json()
        ingredients = data.get('ingredients', [])
        dietary_preferences = data.get('dietary_preferences', '')
        
        if not ingredients:
            return jsonify({'error': 'Ingredients are required'}), 400

        result = generate_recipes_with_tracking(ingredients, dietary_preferences)
        return jsonify(result)
    
    except Exception as e:
        print(f'Python Service: Error in recipes: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'carbon-tracked-api'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True) 