"""
Reference Audio Fetching

Downloads and caches reference Qari audio for comparison.
Uses EveryAyah.com which provides free high-quality recitations.
"""

import asyncio
import hashlib
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
