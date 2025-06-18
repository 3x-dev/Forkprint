# CodeCarbon Integration Setup

This project now includes CodeCarbon tracking to monitor the environmental impact of AI operations. The integration tracks carbon emissions from Anthropic API calls and other computational processes.

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
# Install CodeCarbon and other required packages
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with your API keys:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PYTHON_SERVICE_URL=http://localhost:5001  # Optional, defaults to localhost:5001
```

### 3. Start the Carbon Tracking Service

```bash
# Option 1: Use the startup script (recommended)
python start_carbon_service.py

# Option 2: Run directly
python carbon_service.py
```

The Python service will start on `http://localhost:5001` and automatically track emissions for all AI operations.

### 4. Start Your Main Application

```bash
# Start your existing Node.js/React application
npm run dev
```

## 📊 Monitoring Emissions

### Dashboard Access
- **Experiment ID**: `035b5507-5bcf-494e-9c38-a7fb2860b06c`
- **Dashboard**: Visit [CodeCarbon Dashboard](https://dashboard.codecarbon.io) to view your emissions data
- **Local Files**: Emissions data is also saved locally in `emissions.csv`

### View Local Emissions Data
```bash
# Install carbonboard for local visualization
pip install carbonboard

# View emissions data
carbonboard --filepath="emissions.csv"
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │───▶│  Node.js API     │───▶│ Python Service  │
│                 │    │  (Proxy)         │    │ (CodeCarbon)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────┐
                                              │ Anthropic API   │
                                              │ (Tracked)       │
                                              └─────────────────┘
```

### How It Works

1. **Frontend** makes requests to Node.js API endpoints
2. **Node.js API** proxies requests to Python service
3. **Python Service** wraps all AI calls with `@track_emissions()` decorator
4. **CodeCarbon** automatically tracks:
   - CPU usage
   - GPU usage (if available)
   - Memory consumption
   - Network requests
   - Power consumption estimates

## 📁 File Structure

```
├── .codecarbon.config          # CodeCarbon configuration
├── requirements.txt            # Python dependencies
├── carbon_service.py           # Python service with tracking
├── start_carbon_service.py     # Startup script
├── api/                        # Node.js API endpoints (now proxied)
│   ├── generate-sustainability-insights.js
│   ├── generate-packaging-alternatives.js
│   ├── generate-disposal-guidance.js
│   └── generate-recipes.js
└── CODECARBON_SETUP.md         # This file
```

## 🔧 Configuration

### CodeCarbon Settings (`.codecarbon.config`)
```ini
[codecarbon]
log_level = DEBUG
save_to_api = True
experiment_id = 035b5507-5bcf-494e-9c38-a7fb2860b06c
```

### Environment Variables
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `PYTHON_SERVICE_URL`: URL of the Python service (default: http://localhost:5001)

## 📈 Tracking Features

### What Gets Tracked
- ✅ AI model inference calls (Anthropic API)
- ✅ CPU and memory usage during processing
- ✅ Network requests and responses
- ✅ Power consumption estimates
- ✅ Carbon footprint calculations

### Emissions Data
- **CO2 equivalent emissions** in kg
- **Energy consumption** in kWh
- **Processing time** and efficiency metrics
- **Hardware utilization** statistics

## 🛠️ Development

### Adding New Tracked Endpoints

To add carbon tracking to new API endpoints:

1. **Add the function to `carbon_service.py`:**
```python
@track_emissions()
def your_new_function_with_tracking(data):
    # Your AI processing code here
    return result
```

2. **Add the route:**
```python
@app.route('/api/your-endpoint', methods=['POST'])
def your_endpoint():
    try:
        data = request.get_json()
        result = your_new_function_with_tracking(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

3. **Update the Node.js proxy** in the corresponding API file.

### Testing the Integration

```bash
# Test the Python service directly
curl -X POST http://localhost:5001/api/sustainability-insights \
  -H "Content-Type: application/json" \
  -d '{"stats":{"totalItems":10,"lowWasteItems":7,"sustainableSwitches":3,"commonHighWastePackaging":[],"mostLoggedFoods":{}}}'

# Test health endpoint
curl http://localhost:5001/health
```

## 🚨 Troubleshooting

### Common Issues

1. **Python service won't start**
   - Check if port 5001 is available
   - Verify all dependencies are installed
   - Ensure environment variables are set

2. **No emissions data appearing**
   - Check CodeCarbon dashboard connection
   - Verify experiment ID is correct
   - Check `.codecarbon.config` file

3. **API calls failing**
   - Ensure Python service is running
   - Check `PYTHON_SERVICE_URL` environment variable
   - Verify Anthropic API key is valid

### Debug Mode

Enable debug logging by setting in `.codecarbon.config`:
```ini
[codecarbon]
log_level = DEBUG
```

## 📚 Additional Resources

- [CodeCarbon Documentation](https://mlco2.github.io/codecarbon/)
- [CodeCarbon Dashboard](https://dashboard.codecarbon.io)
- [Anthropic API Documentation](https://docs.anthropic.com/)

## 🌱 Environmental Impact

By tracking emissions, you can:
- **Monitor** the carbon footprint of your AI operations
- **Optimize** code for better energy efficiency
- **Report** on sustainability metrics
- **Make informed decisions** about AI usage

The integration helps make AI development more environmentally conscious and transparent. 