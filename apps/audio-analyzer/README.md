# Audio Analyzer Service

Python microservice for analyzing Quran recitation pronunciation quality.

## Features

- **MFCC Analysis**: Compares spectral features to detect makhraj (articulation) errors
- **Timing Analysis**: Detects madd (elongation) issues
- **DTW Alignment**: Aligns user audio with reference for accurate comparison
- **Reference Audio**: Downloads and caches Qari recitations from EveryAyah.com

## Setup

### Prerequisites

- Python 3.10+
- FFmpeg (for audio format conversion)

### Install FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Install Python Dependencies

```bash
cd apps/audio-analyzer
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running the Service

```bash
# Activate virtual environment
source venv/bin/activate

# Run the server
python main.py
```

The service runs on `http://localhost:8000` by default.

## API Endpoints

### Health Check
```
GET /health
```

### Analyze Pronunciation
```
POST /analyze
Content-Type: application/json

{
  "audio_base64": "<base64 encoded audio>",
  "surah": 1,
  "ayah": 1,
  "qari": "ar.alafasy"  // optional, defaults to Mishary Rashid Alafasy
}
```

Response:
```json
{
  "overall_score": 85.5,
  "makhraj_score": 88.0,
  "timing_score": 82.0,
  "fluency_score": 86.5,
  "segments": [
    {
      "start_time": 0.0,
      "end_time": 1.5,
      "makhraj_score": 90.0,
      "timing_score": 85.0,
      "overall_score": 88.0,
      "issues": []
    }
  ],
  "summary": "Good recitation with minor areas for improvement."
}
```

### Check Reference Availability
```
GET /reference/{surah}/{ayah}?qari=ar.alafasy
```

## Available Qaris

| ID | Reciter |
|----|---------|
| ar.alafasy | Mishary Rashid Alafasy |
| ar.husary | Mahmoud Khalil Al-Husary |
| ar.minshawi | Mohamed Siddiq El-Minshawi |
| ar.abdulbasit | Abdul Basit Abdul Samad |
| ar.sudais | Abdurrahman As-Sudais |

## Architecture

```
main.py              # FastAPI server
features.py          # Audio feature extraction (MFCC, pitch, energy)
alignment.py         # DTW alignment algorithm
comparison.py        # Feature comparison and scoring
reference_audio.py   # Reference audio fetching and caching
```
