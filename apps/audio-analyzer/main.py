"""
Audio Analyzer Service for Quran Recitation Validation

Compares user recitation audio against reference Qari recordings
to detect pronunciation (makhraj) and timing (madd) issues.
"""

import base64
import io
import tempfile
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from features import extract_features, AudioFeatures
from alignment import align_audio_features
from comparison import compare_recitations, compare_word_by_word, PronunciationReport
from reference_audio import get_reference_with_timings

app = FastAPI(
    title="Quran Audio Analyzer",
    description="Analyzes Quran recitation pronunciation quality",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    """Request body for pronunciation analysis"""
    audio_base64: str
    surah: int
    ayah: int
    qari: Optional[str] = "ar.husary"  # Default to Mahmoud Khalil Al-Husary


class SegmentFeedback(BaseModel):
    """Feedback for a segment of the recitation"""
    start_time: float
    end_time: float
    makhraj_score: float  # 0-100, articulation quality
    timing_score: float   # 0-100, duration accuracy
    overall_score: float
    issues: list[str]


class WordFeedback(BaseModel):
    """Feedback for a specific word in the recitation"""
    word_index: int
    text: str  # Arabic word text
    start_time: float  # In user's audio (seconds)
    end_time: float
    makhraj_score: float  # 0-100
    timing_score: float  # 0-100
    overall_score: float
    issues: list[str]


class AnalyzeResponse(BaseModel):
    """Response with pronunciation analysis"""
    overall_score: float
    makhraj_score: float
    timing_score: float
    fluency_score: float
    segments: list[SegmentFeedback]
    words: list[WordFeedback]  # Word-by-word feedback
    summary: str


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "audio-analyzer"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_pronunciation(request: AnalyzeRequest):
    """
    Analyze pronunciation quality by comparing user audio to reference.

    1. Decode user audio from base64
    2. Fetch reference audio for the specified ayah
    3. Extract audio features (MFCC, pitch, energy)
    4. Align using Dynamic Time Warping (DTW)
    5. Compare features segment by segment
    6. Generate feedback report
    """
    import traceback

    try:
        print(f"[1/7] Decoding audio for {request.surah}:{request.ayah}...")
        # Decode user audio
        audio_bytes = base64.b64decode(request.audio_base64)
        print(f"      Audio size: {len(audio_bytes)} bytes")

        print(f"[2/7] Fetching reference audio and word timings (qari: {request.qari})...")
        # Get reference audio AND word-level timestamps for this ayah
        reference_audio, word_timings = await get_reference_with_timings(
            surah=request.surah,
            ayah=request.ayah,
            qari=request.qari
        )

        if reference_audio is None:
            raise HTTPException(
                status_code=404,
                detail=f"Reference audio not found for {request.surah}:{request.ayah}"
            )
        print(f"      Reference size: {len(reference_audio)} bytes")
        print(f"      Word timings: {len(word_timings) if word_timings else 0} words")

        print("[3/7] Extracting user audio features...")
        # Extract features from both recordings
        user_features = extract_features(audio_bytes)
        print(f"      User features: {user_features.n_frames} frames, {user_features.duration:.2f}s")

        print("[4/7] Extracting reference audio features...")
        ref_features = extract_features(reference_audio)
        print(f"      Ref features: {ref_features.n_frames} frames, {ref_features.duration:.2f}s")

        print("[5/7] Aligning audio with DTW...")
        # Align the two recordings using DTW
        alignment = align_audio_features(user_features, ref_features)
        print(f"      Alignment distance: {alignment.normalized_distance:.4f}")

        print("[6/7] Comparing segments and generating report...")
        # Compare and generate report (segment-based)
        report = compare_recitations(user_features, ref_features, alignment)
        print(f"      Scores - Overall: {report.overall_score:.1f}, Makhraj: {report.makhraj_score:.1f}")

        print("[7/7] Analyzing word-by-word pronunciation...")
        # Word-by-word comparison using timing data
        word_feedback_list = []
        if word_timings:
            word_feedback_list = compare_word_by_word(
                user_features=user_features,
                ref_features=ref_features,
                alignment=alignment,
                word_timings=word_timings
            )
            print(f"      Analyzed {len(word_feedback_list)} words")
            issues_count = sum(1 for w in word_feedback_list if w.get('issues'))
            print(f"      Words with issues: {issues_count}")

        # Convert dataclass segments to Pydantic-compatible dicts
        segments = [
            SegmentFeedback(
                start_time=s.start_time,
                end_time=s.end_time,
                makhraj_score=s.makhraj_score,
                timing_score=s.timing_score,
                overall_score=s.overall_score,
                issues=s.issues
            )
            for s in report.segments
        ]

        # Convert word feedback to Pydantic models
        words = [
            WordFeedback(
                word_index=w['word_index'],
                text=w['text'],
                start_time=w['start_time'],
                end_time=w['end_time'],
                makhraj_score=w['makhraj_score'],
                timing_score=w['timing_score'],
                overall_score=w['overall_score'],
                issues=w['issues']
            )
            for w in word_feedback_list
        ]

        return AnalyzeResponse(
            overall_score=report.overall_score,
            makhraj_score=report.makhraj_score,
            timing_score=report.timing_score,
            fluency_score=report.fluency_score,
            segments=segments,
            words=words,
            summary=report.summary
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/reference/{surah}/{ayah}")
async def check_reference(surah: int, ayah: int, qari: str = "ar.alafasy"):
    """Check if reference audio is available for an ayah"""
    audio = await get_reference_audio(surah, ayah, qari)
    if audio:
        return {"available": True, "surah": surah, "ayah": ayah, "qari": qari}
    return {"available": False, "surah": surah, "ayah": ayah, "qari": qari}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
