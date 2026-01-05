"""
Audio Feature Extraction for Pronunciation Analysis

Extracts MFCC, pitch, energy, and timing features from audio recordings.
These features are used to compare user recitation against reference audio.
"""

import io
import tempfile
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf


@dataclass
class AudioFeatures:
    """Container for extracted audio features"""
    # Raw audio data
    audio: np.ndarray
    sample_rate: int
    duration: float

    # Spectral features (for makhraj detection)
    mfcc: np.ndarray           # Mel-frequency cepstral coefficients (shape: n_mfcc x frames)
    mfcc_delta: np.ndarray     # First derivative of MFCC
    spectral_centroid: np.ndarray  # "Brightness" of sound

    # Pitch features (for intonation)
    pitch: np.ndarray          # Fundamental frequency (F0)
    pitch_confidence: np.ndarray  # Confidence of pitch detection

    # Energy features (for qalqalah, emphasis)
    rms_energy: np.ndarray     # Root mean square energy
    zero_crossing_rate: np.ndarray  # Indicates fricatives vs vowels

    # Timing info
    frame_times: np.ndarray    # Time of each frame in seconds
    hop_length: int
    n_frames: int


def extract_features(
    audio_data: bytes,
    sample_rate: int = 22050,
    n_mfcc: int = 13,
    hop_length: int = 512,
    n_fft: int = 2048,
) -> AudioFeatures:
    """
    Extract audio features from raw audio bytes.

    Args:
        audio_data: Raw audio bytes (supports wav, mp3, m4a, etc.)
        sample_rate: Target sample rate for analysis
        n_mfcc: Number of MFCC coefficients to extract
        hop_length: Samples between frames
        n_fft: FFT window size

    Returns:
        AudioFeatures object with all extracted features
    """
    # Load audio from bytes
    audio, sr = load_audio_from_bytes(audio_data, sample_rate)

    duration = len(audio) / sr
    n_frames = 1 + (len(audio) - n_fft) // hop_length

    # Frame times for alignment
    frame_times = librosa.frames_to_time(
        np.arange(n_frames),
        sr=sr,
        hop_length=hop_length
    )

    # Extract MFCC (captures spectral envelope - key for makhraj)
    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=sr,
        n_mfcc=n_mfcc,
        hop_length=hop_length,
        n_fft=n_fft
    )

    # MFCC delta (captures transitions between sounds)
    mfcc_delta = librosa.feature.delta(mfcc)

    # Spectral centroid (brightness - helps distinguish letters)
    spectral_centroid = librosa.feature.spectral_centroid(
        y=audio,
        sr=sr,
        hop_length=hop_length,
        n_fft=n_fft
    )[0]

    # Pitch extraction using PYIN (probabilistic YIN)
    pitch, voiced_flag, voiced_probs = librosa.pyin(
        audio,
        fmin=librosa.note_to_hz('C2'),  # ~65 Hz (low male voice)
        fmax=librosa.note_to_hz('C6'),  # ~1047 Hz (high female/child voice)
        sr=sr,
        hop_length=hop_length
    )

    # Replace NaN with 0 for unvoiced regions
    pitch = np.nan_to_num(pitch, nan=0.0)
    pitch_confidence = voiced_probs

    # RMS energy (volume/intensity)
    rms_energy = librosa.feature.rms(
        y=audio,
        hop_length=hop_length,
        frame_length=n_fft
    )[0]

    # Zero crossing rate (helps distinguish consonants)
    zcr = librosa.feature.zero_crossing_rate(
        audio,
        hop_length=hop_length,
        frame_length=n_fft
    )[0]

    return AudioFeatures(
        audio=audio,
        sample_rate=sr,
        duration=duration,
        mfcc=mfcc,
        mfcc_delta=mfcc_delta,
        spectral_centroid=spectral_centroid,
        pitch=pitch,
        pitch_confidence=pitch_confidence,
        rms_energy=rms_energy,
        zero_crossing_rate=zcr,
        frame_times=frame_times,
        hop_length=hop_length,
        n_frames=n_frames,
    )


def detect_audio_format(audio_bytes: bytes) -> str:
    """
    Detect audio format from magic bytes.

    Returns file extension (e.g., '.m4a', '.webm', '.3gp')
    """
    # Check magic bytes
    if len(audio_bytes) < 12:
        return ".bin"

    # MP4/M4A (ftyp box)
    if audio_bytes[4:8] == b'ftyp':
        return ".m4a"

    # WebM/Matroska
    if audio_bytes[:4] == b'\x1a\x45\xdf\xa3':
        return ".webm"

    # OGG
    if audio_bytes[:4] == b'OggS':
        return ".ogg"

    # WAV
    if audio_bytes[:4] == b'RIFF' and audio_bytes[8:12] == b'WAVE':
        return ".wav"

    # MP3 (ID3 tag or frame sync)
    if audio_bytes[:3] == b'ID3' or (audio_bytes[0] == 0xff and (audio_bytes[1] & 0xe0) == 0xe0):
        return ".mp3"

    # FLAC
    if audio_bytes[:4] == b'fLaC':
        return ".flac"

    # AMR
    if audio_bytes[:6] == b'#!AMR\n':
        return ".amr"

    # 3GP (also uses ftyp but with different brand)
    if b'3gp' in audio_bytes[:20].lower():
        return ".3gp"

    # Default to m4a (common on mobile)
    return ".m4a"


def load_audio_from_bytes(audio_bytes: bytes, target_sr: int = 22050) -> tuple[np.ndarray, int]:
    """
    Load audio from bytes, handling various formats including iOS m4a and Android formats.

    Args:
        audio_bytes: Raw audio bytes
        target_sr: Target sample rate

    Returns:
        Tuple of (audio array, sample rate)
    """
    from pydub import AudioSegment

    # Try to load directly with soundfile first (works for wav, flac)
    try:
        audio_io = io.BytesIO(audio_bytes)
        audio, sr = sf.read(audio_io)

        # Convert to mono if stereo
        if len(audio.shape) > 1:
            audio = np.mean(audio, axis=1)

        # Resample if needed
        if sr != target_sr:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
            sr = target_sr

        return audio.astype(np.float32), sr
    except Exception:
        pass

    # Use pydub to handle various formats (m4a, 3gp, amr, webm, etc.)
    temp_input = None
    temp_wav = None

    # Detect format from magic bytes
    suffix = detect_audio_format(audio_bytes)

    try:
        # Write input to temp file
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio_bytes)
            temp_input = f.name

        # Convert to WAV using pydub (uses ffmpeg)
        audio_segment = AudioSegment.from_file(temp_input)

        # Export as WAV
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_wav = f.name

        audio_segment.export(temp_wav, format="wav")

        # Load the WAV file with librosa
        audio, sr = librosa.load(temp_wav, sr=target_sr, mono=True)
        return audio, sr

    except Exception as e:
        print(f"Audio loading error: {e}")
        raise RuntimeError(f"Failed to load audio: {e}")

    finally:
        # Clean up temp files
        if temp_input:
            Path(temp_input).unlink(missing_ok=True)
        if temp_wav:
            Path(temp_wav).unlink(missing_ok=True)


def compute_feature_distance(features1: AudioFeatures, features2: AudioFeatures) -> float:
    """
    Compute overall distance between two feature sets.
    Used for quick similarity check before detailed analysis.
    """
    # Use mean MFCC as a compact representation
    mfcc1_mean = np.mean(features1.mfcc, axis=1)
    mfcc2_mean = np.mean(features2.mfcc, axis=1)

    return float(np.linalg.norm(mfcc1_mean - mfcc2_mean))
