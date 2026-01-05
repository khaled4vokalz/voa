"""
Reference Audio Fetching

Downloads and caches reference Qari audio for comparison.
Uses EveryAyah.com which provides free high-quality recitations.
Uses Quran.com API for word-level timestamps.
"""

import asyncio
import json
from pathlib import Path
from typing import Optional

import httpx
import aiofiles

# Cache directory for downloaded audio
CACHE_DIR = Path(__file__).parent / ".audio_cache"
CACHE_DIR.mkdir(exist_ok=True)

# Available Qaris from EveryAyah.com
# Format: identifier -> folder name on everyayah.com
QARIS = {
    "ar.alafasy": "Alafasy_128kbps",           # Mishary Rashid Alafasy
    "ar.husary": "Husary_128kbps",             # Mahmoud Khalil Al-Husary
    "ar.minshawi": "Minshawy_Murattal_128kbps", # Mohamed Siddiq El-Minshawi
    "ar.abdulbasit": "Abdul_Basit_Murattal_192kbps",  # Abdul Basit
    "ar.sudais": "Sudais_128kbps",             # Abdurrahman As-Sudais
}

# Base URL for EveryAyah
EVERYAYAH_BASE = "https://everyayah.com/data"


def get_audio_url(surah: int, ayah: int, qari: str = "ar.husary") -> str:
    """
    Get the URL for a specific ayah's audio.

    EveryAyah uses format: SSSAAA.mp3 (3-digit surah, 3-digit ayah)
    """
    qari_folder = QARIS.get(qari, QARIS["ar.husary"])
    filename = f"{surah:03d}{ayah:03d}.mp3"
    return f"{EVERYAYAH_BASE}/{qari_folder}/{filename}"


def get_cache_path(surah: int, ayah: int, qari: str) -> Path:
    """Get the local cache path for an ayah's audio"""
    return CACHE_DIR / f"{qari}_{surah:03d}_{ayah:03d}.mp3"


async def get_reference_audio(
    surah: int,
    ayah: int,
    qari: str = "ar.husary"
) -> Optional[bytes]:
    """
    Get reference audio for a specific ayah.

    First checks local cache, then downloads if needed.

    Args:
        surah: Surah number (1-114)
        ayah: Ayah number
        qari: Qari identifier (default: ar.husary)

    Returns:
        Audio bytes or None if not available
    """
    # Validate inputs
    if surah < 1 or surah > 114:
        return None
    if ayah < 1:
        return None

    # Check cache first
    cache_path = get_cache_path(surah, ayah, qari)
    if cache_path.exists():
        async with aiofiles.open(cache_path, "rb") as f:
            return await f.read()

    # Download from EveryAyah
    url = get_audio_url(surah, ayah, qari)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            audio_bytes = response.content

            # Cache for future use
            async with aiofiles.open(cache_path, "wb") as f:
                await f.write(audio_bytes)

            return audio_bytes

    except httpx.HTTPStatusError as e:
        print(f"Failed to fetch reference audio: {e}")
        return None
    except httpx.RequestError as e:
        print(f"Network error fetching reference audio: {e}")
        return None


async def prefetch_surah(surah: int, qari: str = "ar.husary") -> int:
    """
    Pre-download all ayahs for a surah.

    Returns the number of successfully downloaded ayahs.
    """
    # Get ayah count for this surah
    ayah_counts = {
        1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75,
        9: 129, 10: 109, 11: 123, 12: 111, 13: 43, 14: 52, 15: 99,
        16: 128, 17: 111, 18: 110, 19: 98, 20: 135, 21: 112, 22: 78,
        23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69,
        30: 60, 31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83,
        37: 182, 38: 88, 39: 75, 40: 85, 41: 54, 42: 53, 43: 89,
        44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
        51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29,
        58: 22, 59: 24, 60: 13, 61: 14, 62: 11, 63: 11, 64: 18,
        65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44, 71: 28,
        72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40,
        79: 46, 80: 42, 81: 29, 82: 19, 83: 36, 84: 25, 85: 22,
        86: 17, 87: 19, 88: 26, 89: 30, 90: 20, 91: 15, 92: 21,
        93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8,
        100: 11, 101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4,
        107: 7, 108: 3, 109: 6, 110: 3, 111: 5, 112: 4, 113: 5, 114: 6,
    }

    total_ayahs = ayah_counts.get(surah, 0)
    if total_ayahs == 0:
        return 0

    downloaded = 0
    for ayah in range(1, total_ayahs + 1):
        audio = await get_reference_audio(surah, ayah, qari)
        if audio:
            downloaded += 1

    return downloaded


def list_available_qaris() -> dict[str, str]:
    """List available Qaris with their identifiers"""
    return {
        "ar.alafasy": "Mishary Rashid Alafasy",
        "ar.husary": "Mahmoud Khalil Al-Husary",
        "ar.minshawi": "Mohamed Siddiq El-Minshawi",
        "ar.abdulbasit": "Abdul Basit Abdul Samad",
        "ar.sudais": "Abdurrahman As-Sudais",
    }


def clear_cache() -> int:
    """Clear the audio cache. Returns number of files deleted."""
    count = 0
    for file in CACHE_DIR.glob("*.mp3"):
        file.unlink()
        count += 1
    return count


# QuranWBW reciter IDs for word-level timestamps
# Only these have wbw timestamps: 1, 2, 6, 8, 10, 15
QURANWBW_RECITERS = {
    "ar.husary": 8,       # Mahmoud Khalil Al-Husary
    "ar.alafasy": 10,     # Mishary Rashid Alafasy
    "ar.abdulbasit": 2,   # Abdul Basit (Murattal)
    "ar.minshawi": 8,     # Fallback to Husary
    "ar.sudais": 8,       # Fallback to Husary
}

# QuranWBW static data endpoint
QURANWBW_STATIC = "https://static.quranwbw.com/data/v4"

# Cache for timestamps (loaded once)
_timestamps_cache = None


async def fetch_quranwbw_timestamps() -> Optional[dict]:
    """Fetch and cache the QuranWBW timestamps file."""
    global _timestamps_cache

    if _timestamps_cache is not None:
        return _timestamps_cache

    # Check local cache
    cache_path = CACHE_DIR / "quranwbw_timestamps.json"
    if cache_path.exists():
        async with aiofiles.open(cache_path, "r") as f:
            content = await f.read()
            _timestamps_cache = json.loads(content)
            return _timestamps_cache

    # Fetch from QuranWBW
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(f"{QURANWBW_STATIC}/timestamps/timestamps.json")
            response.raise_for_status()
            _timestamps_cache = response.json()

            # Cache locally
            async with aiofiles.open(cache_path, "w") as f:
                await f.write(json.dumps(_timestamps_cache))

            return _timestamps_cache
    except Exception as e:
        print(f"Failed to fetch QuranWBW timestamps: {e}")
        return None


async def get_word_timings(
    surah: int,
    ayah: int,
    qari: str = "ar.husary"
) -> Optional[list[dict]]:
    """
    Get word-level timestamps from QuranWBW.

    Returns list of word timing data:
    [
        {"word_index": 0, "text": "بِسْمِ", "start_ms": 0, "end_ms": 500},
        {"word_index": 1, "text": "اللَّهِ", "start_ms": 500, "end_ms": 1000},
        ...
    ]
    """
    reciter_id = QURANWBW_RECITERS.get(qari, 8)  # Default to Husary (ID 8)

    # Check cache first
    cache_path = CACHE_DIR / f"wordtiming_{surah}_{ayah}_{reciter_id}.json"
    if cache_path.exists():
        async with aiofiles.open(cache_path, "r") as f:
            content = await f.read()
            return json.loads(content)

    try:
        # Fetch timestamps data
        timestamps_data = await fetch_quranwbw_timestamps()
        if not timestamps_data:
            return None

        # Get word text from Quran.com API
        words_url = f"https://api.quran.com/api/v4/verses/by_key/{surah}:{ayah}?words=true&word_fields=text_uthmani"

        async with httpx.AsyncClient(timeout=30.0) as client:
            words_response = await client.get(words_url)
            words_response.raise_for_status()
            words_data = words_response.json()

        words = words_data.get("verse", {}).get("words", [])
        print(f"  Fetched {len(words)} words from Quran.com API")

        # Get timestamps for this verse from QuranWBW
        verse_timestamps = (
            timestamps_data.get("data", {})
            .get(str(surah), {})
            .get(str(ayah), {})
            .get(str(reciter_id), "")
        )

        if not verse_timestamps:
            print(f"  No timestamps found for {surah}:{ayah} reciter {reciter_id}")
            # Try fallback to Husary
            if reciter_id != 8:
                verse_timestamps = (
                    timestamps_data.get("data", {})
                    .get(str(surah), {})
                    .get(str(ayah), {})
                    .get("8", "")
                )

        # Parse pipe-separated start times (in seconds)
        start_times = []
        if verse_timestamps:
            start_times = [float(t) if t and t != "0" else 0.0 for t in verse_timestamps.split("|")]
        print(f"  Parsed {len(start_times)} word timestamps: {start_times[:5]}...")

        # Combine words with timing
        result = []
        word_idx = 0
        for i, word in enumerate(words):
            # Skip end markers (verse number at end)
            if word.get("char_type_name") == "end":
                continue

            word_text = word.get("text_uthmani", word.get("text", ""))

            # Get start time for this word
            start_sec = start_times[word_idx] if word_idx < len(start_times) else 0
            # End time is start of next word (or estimate)
            end_sec = start_times[word_idx + 1] if word_idx + 1 < len(start_times) else start_sec + 0.5

            # Convert to milliseconds
            start_ms = int(start_sec * 1000)
            end_ms = int(end_sec * 1000)

            print(f"  Word {word_idx}: '{word_text}' {start_ms}ms - {end_ms}ms")

            result.append({
                "word_index": word_idx,
                "text": word_text,
                "start_ms": start_ms,
                "end_ms": end_ms,
            })
            word_idx += 1

        # Cache the result
        async with aiofiles.open(cache_path, "w") as f:
            await f.write(json.dumps(result, ensure_ascii=False))

        return result

    except Exception as e:
        print(f"Failed to fetch word timings: {e}")
        import traceback
        traceback.print_exc()
        return None


async def get_reference_with_timings(
    surah: int,
    ayah: int,
    qari: str = "ar.husary"
) -> tuple[Optional[bytes], Optional[list[dict]]]:
    """
    Get both reference audio and word-level timestamps.

    Returns (audio_bytes, word_timings)
    """
    # Fetch both in parallel
    audio_task = get_reference_audio(surah, ayah, qari)
    timing_task = get_word_timings(surah, ayah, qari)

    audio, timings = await asyncio.gather(audio_task, timing_task)

    return audio, timings
