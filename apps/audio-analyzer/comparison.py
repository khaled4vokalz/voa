"""
Pronunciation Comparison Logic

Compares user recitation features against reference to detect:
- Makhraj errors (wrong articulation point)
- Timing errors (madd duration, rushing)
- Fluency issues (hesitation, stuttering)
"""

from dataclasses import dataclass, field

import numpy as np
from scipy.spatial.distance import cosine

from features import AudioFeatures
from alignment import AlignmentResult, segment_alignment


@dataclass
class SegmentFeedback:
    """Feedback for a segment of the recitation"""
    start_time: float
    end_time: float
    makhraj_score: float  # 0-100
    timing_score: float   # 0-100
    overall_score: float  # 0-100
    issues: list[str] = field(default_factory=list)


@dataclass
class PronunciationReport:
    """Complete pronunciation analysis report"""
    overall_score: float
    makhraj_score: float
    timing_score: float
    fluency_score: float
    segments: list[SegmentFeedback]
    summary: str


def compare_recitations(
    user_features: AudioFeatures,
    ref_features: AudioFeatures,
    alignment: AlignmentResult,
    n_segments: int = 5
) -> PronunciationReport:
    """
    Compare user recitation against reference and generate feedback.

    Args:
        user_features: Features from user's audio
        ref_features: Features from reference Qari audio
        alignment: DTW alignment result
        n_segments: Number of segments to analyze

    Returns:
        PronunciationReport with scores and feedback
    """
    # Get segment boundaries
    segments = segment_alignment(alignment, n_segments)

    segment_feedbacks = []
    makhraj_scores = []
    timing_scores = []

    for (user_start, user_end), (ref_start, ref_end) in segments:
        # Calculate segment times
        start_time = user_start * user_features.hop_length / user_features.sample_rate
        end_time = user_end * user_features.hop_length / user_features.sample_rate

        # Compare MFCC (spectral/makhraj)
        makhraj_score = compare_mfcc_segment(
            user_features.mfcc[:, user_start:user_end+1],
            ref_features.mfcc[:, ref_start:ref_end+1]
        )

        # Compare timing
        timing_score = compare_timing_segment(
            user_start, user_end, user_features,
            ref_start, ref_end, ref_features
        )

        # Detect specific issues
        issues = detect_issues(
            user_features, ref_features,
            user_start, user_end,
            ref_start, ref_end,
            makhraj_score, timing_score
        )

        # Overall segment score
        overall = 0.6 * makhraj_score + 0.4 * timing_score

        segment_feedbacks.append(SegmentFeedback(
            start_time=start_time,
            end_time=end_time,
            makhraj_score=makhraj_score,
            timing_score=timing_score,
            overall_score=overall,
            issues=issues
        ))

        makhraj_scores.append(makhraj_score)
        timing_scores.append(timing_score)

    # Calculate overall scores
    avg_makhraj = np.mean(makhraj_scores) if makhraj_scores else 0
    avg_timing = np.mean(timing_scores) if timing_scores else 0

    # Fluency score based on DTW distance (lower distance = better)
    # Normalize to 0-100 scale
    max_expected_distance = 50  # Empirical threshold
    fluency_score = max(0, 100 - (alignment.normalized_distance / max_expected_distance * 100))
    fluency_score = min(100, fluency_score)

    # Overall weighted score
    overall_score = 0.5 * avg_makhraj + 0.3 * avg_timing + 0.2 * fluency_score

    # Generate summary
    summary = generate_summary(
        overall_score, avg_makhraj, avg_timing, fluency_score,
        segment_feedbacks
    )

    return PronunciationReport(
        overall_score=overall_score,
        makhraj_score=avg_makhraj,
        timing_score=avg_timing,
        fluency_score=fluency_score,
        segments=segment_feedbacks,
        summary=summary
    )


def compare_mfcc_segment(
    user_mfcc: np.ndarray,
    ref_mfcc: np.ndarray
) -> float:
    """
    Compare MFCC features between user and reference segment.

    MFCC captures the spectral envelope which reflects articulation.
    Different makhraj (articulation points) produce different spectral shapes.

    Returns score 0-100 (higher = more similar = better)
    """
    if user_mfcc.size == 0 or ref_mfcc.size == 0:
        return 50.0  # Neutral score for empty segments

    # Average MFCC across time for this segment
    user_mean = np.mean(user_mfcc, axis=1)
    ref_mean = np.mean(ref_mfcc, axis=1)

    # Cosine similarity (1 = identical, 0 = orthogonal, -1 = opposite)
    similarity = 1 - cosine(user_mean, ref_mean)

    # Also compare MFCC variance (consistency)
    user_var = np.var(user_mfcc, axis=1)
    ref_var = np.var(ref_mfcc, axis=1)
    var_similarity = 1 - cosine(user_var + 1e-6, ref_var + 1e-6)

    # Combine similarities
    combined = 0.7 * similarity + 0.3 * var_similarity

    # Convert to 0-100 scale
    # Similarity typically ranges from 0.5 to 1.0 for reasonable recitations
    score = max(0, (combined - 0.3) / 0.7) * 100
    return min(100, score)


def compare_timing_segment(
    user_start: int, user_end: int, user_features: AudioFeatures,
    ref_start: int, ref_end: int, ref_features: AudioFeatures
) -> float:
    """
    Compare timing/duration between user and reference segment.

    Checks if the user is reciting too fast or too slow.
    Important for madd (elongation) rules.

    Returns score 0-100 (higher = better timing match)
    """
    # Calculate durations in seconds
    user_duration = (user_end - user_start) * user_features.hop_length / user_features.sample_rate
    ref_duration = (ref_end - ref_start) * ref_features.hop_length / ref_features.sample_rate

    if ref_duration == 0:
        return 50.0

    # Ratio of durations (1.0 = perfect match)
    ratio = user_duration / ref_duration

    # Score based on how close ratio is to 1.0
    # Allow some tolerance (0.8 to 1.2 is acceptable)
    if 0.8 <= ratio <= 1.2:
        # Good range - score 80-100
        deviation = abs(ratio - 1.0)
        score = 100 - (deviation / 0.2) * 20
    elif 0.5 <= ratio <= 1.5:
        # Acceptable range - score 50-80
        if ratio < 1:
            deviation = (0.8 - ratio) / 0.3
        else:
            deviation = (ratio - 1.2) / 0.3
        score = 80 - deviation * 30
    else:
        # Too fast or too slow - score 0-50
        score = max(0, 50 - abs(ratio - 1.0) * 25)

    return min(100, max(0, score))


def detect_issues(
    user_features: AudioFeatures,
    ref_features: AudioFeatures,
    user_start: int, user_end: int,
    ref_start: int, ref_end: int,
    makhraj_score: float,
    timing_score: float
) -> list[str]:
    """
    Detect specific pronunciation issues in a segment.

    Returns list of issue descriptions.
    """
    issues = []

    # Timing issues
    user_duration = (user_end - user_start) * user_features.hop_length / user_features.sample_rate
    ref_duration = (ref_end - ref_start) * ref_features.hop_length / ref_features.sample_rate

    if ref_duration > 0:
        ratio = user_duration / ref_duration
        if ratio < 0.7:
            issues.append("Reciting too fast - consider slowing down for proper madd")
        elif ratio > 1.5:
            issues.append("Reciting too slow - elongation may be excessive")

    # Makhraj issues - analyze MFCC differences
    user_mfcc = user_features.mfcc[:, user_start:user_end+1]
    ref_mfcc = ref_features.mfcc[:, ref_start:ref_end+1]

    if user_mfcc.size > 0 and ref_mfcc.size > 0:
        # Lower MFCCs (1-4) relate to vocal tract shape (throat, tongue position)
        user_low = np.mean(user_mfcc[1:5, :])
        ref_low = np.mean(ref_mfcc[1:5, :])
        low_diff = abs(user_low - ref_low)

        # Higher MFCCs (5-8) relate to finer articulation details
        user_high = np.mean(user_mfcc[5:9, :]) if user_mfcc.shape[0] > 8 else 0
        ref_high = np.mean(ref_mfcc[5:9, :]) if ref_mfcc.shape[0] > 8 else 0
        high_diff = abs(user_high - ref_high)

        # Spectral centroid difference (brightness/sharpness)
        user_centroid = np.mean(user_features.spectral_centroid[user_start:user_end+1])
        ref_centroid = np.mean(ref_features.spectral_centroid[ref_start:ref_end+1])
        centroid_ratio = user_centroid / ref_centroid if ref_centroid > 0 else 1.0

        # Detect various makhraj issues with more sensitive thresholds
        if makhraj_score < 80:
            if low_diff > 5:
                if user_low < ref_low:
                    issues.append("Throat position may need adjustment - try deeper articulation")
                else:
                    issues.append("Tongue position differs from reference - check makhraj")

            if high_diff > 3:
                issues.append("Fine articulation differs - focus on letter clarity")

            if centroid_ratio < 0.7:
                issues.append("Sound is duller than reference - more clarity needed")
            elif centroid_ratio > 1.4:
                issues.append("Sound is sharper than reference - soften the articulation")

        # Severe makhraj issues
        if makhraj_score < 60:
            if low_diff > 8:
                issues.append("Significant makhraj difference detected - review articulation point")
            if high_diff > 5:
                issues.append("Letter characteristics need improvement")

    # Pitch issues - detect wrong intonation
    if user_end > user_start and ref_end > ref_start:
        user_pitch = user_features.pitch[user_start:user_end+1]
        ref_pitch = ref_features.pitch[ref_start:ref_end+1]

        # Filter out unvoiced regions (pitch = 0)
        user_voiced = user_pitch[user_pitch > 0]
        ref_voiced = ref_pitch[ref_pitch > 0]

        if len(user_voiced) > 0 and len(ref_voiced) > 0:
            user_mean_pitch = np.mean(user_voiced)
            ref_mean_pitch = np.mean(ref_voiced)

            user_pitch_std = np.std(user_voiced)
            ref_pitch_std = np.std(ref_voiced)

            # Check if pitch is significantly higher or lower
            pitch_ratio = user_mean_pitch / ref_mean_pitch if ref_mean_pitch > 0 else 1.0

            if pitch_ratio > 1.3:
                issues.append("Pitch is too high - recite in a lower, more natural tone")
            elif pitch_ratio < 0.7:
                issues.append("Pitch is too low - raise your tone slightly")

            # Check pitch variation (should be relatively stable for Quran recitation)
            if user_pitch_std > ref_pitch_std * 1.5:
                issues.append("Pitch variation detected - maintain steadier tone")

            # Check for sudden pitch jumps (like the high 'ha' the user mentioned)
            if len(user_voiced) > 3:
                pitch_diffs = np.abs(np.diff(user_voiced))
                max_jump = np.max(pitch_diffs)
                ref_max_jump = np.max(np.abs(np.diff(ref_voiced))) if len(ref_voiced) > 3 else 50

                if max_jump > ref_max_jump * 1.5 and max_jump > 30:
                    issues.append("Sudden pitch change detected - keep tone consistent")

    # Energy issues (for emphasis letters, qalqalah)
    if user_end > user_start and ref_end > ref_start:
        user_energy = np.mean(user_features.rms_energy[user_start:user_end+1])
        ref_energy = np.mean(ref_features.rms_energy[ref_start:ref_end+1])

        if ref_energy > 0:
            energy_ratio = user_energy / ref_energy
            if energy_ratio < 0.5:
                issues.append("Consider more emphasis/projection")
            elif energy_ratio > 2.0:
                issues.append("Reduce volume for this segment")

    return issues


def compare_word_by_word(
    user_features: AudioFeatures,
    ref_features: AudioFeatures,
    alignment: AlignmentResult,
    word_timings: list[dict]
) -> list[dict]:
    """
    Compare pronunciation word by word using timing data from Quran.com API.

    Args:
        user_features: Features from user's audio
        ref_features: Features from reference Qari audio
        alignment: DTW alignment result
        word_timings: List of word timing data from API:
                      [{"word_index": 0, "text": "بِسْمِ", "start_ms": 0, "end_ms": 500}, ...]

    Returns:
        List of word-level feedback dictionaries
    """
    results = []

    # Calculate frame duration in seconds
    frame_duration = ref_features.hop_length / ref_features.sample_rate

    for word in word_timings:
        word_index = word['word_index']
        text = word['text']
        start_ms = word['start_ms']
        end_ms = word['end_ms']

        # Skip words without valid timing
        if start_ms == 0 and end_ms == 0:
            results.append({
                'word_index': word_index,
                'text': text,
                'start_time': 0,
                'end_time': 0,
                'makhraj_score': 50,  # Neutral score for missing data
                'timing_score': 50,
                'overall_score': 50,
                'issues': []
            })
            continue

        # Convert milliseconds to frame indices for reference audio
        ref_start_frame = int((start_ms / 1000) / frame_duration)
        ref_end_frame = int((end_ms / 1000) / frame_duration)

        # Clamp to valid range
        ref_start_frame = max(0, min(ref_start_frame, ref_features.n_frames - 1))
        ref_end_frame = max(ref_start_frame + 1, min(ref_end_frame, ref_features.n_frames))

        # Find corresponding user frames using DTW alignment path
        # alignment.path is [(user_idx, ref_idx), ...]
        user_frames_for_word = []
        for user_idx, ref_idx in alignment.path:
            if ref_start_frame <= ref_idx < ref_end_frame:
                user_frames_for_word.append(user_idx)

        if not user_frames_for_word:
            # No alignment found for this word
            results.append({
                'word_index': word_index,
                'text': text,
                'start_time': start_ms / 1000,
                'end_time': end_ms / 1000,
                'makhraj_score': 30,  # Low score for missing alignment
                'timing_score': 30,
                'overall_score': 30,
                'issues': ['Word may have been skipped or unclear']
            })
            continue

        user_start_frame = min(user_frames_for_word)
        user_end_frame = max(user_frames_for_word) + 1

        # Calculate time in user's audio
        user_frame_duration = user_features.hop_length / user_features.sample_rate
        user_start_time = user_start_frame * user_frame_duration
        user_end_time = user_end_frame * user_frame_duration

        # Compare MFCC for this word (makhraj)
        makhraj_score = compare_mfcc_segment(
            user_features.mfcc[:, user_start_frame:user_end_frame],
            ref_features.mfcc[:, ref_start_frame:ref_end_frame]
        )

        # Compare timing
        timing_score = compare_timing_segment(
            user_start_frame, user_end_frame, user_features,
            ref_start_frame, ref_end_frame, ref_features
        )

        # Detect issues for this word
        issues = detect_word_issues(
            user_features, ref_features,
            user_start_frame, user_end_frame,
            ref_start_frame, ref_end_frame,
            makhraj_score, timing_score,
            text
        )

        # Overall score for this word
        overall = 0.6 * makhraj_score + 0.4 * timing_score

        results.append({
            'word_index': word_index,
            'text': text,
            'start_time': user_start_time,
            'end_time': user_end_time,
            'makhraj_score': makhraj_score,
            'timing_score': timing_score,
            'overall_score': overall,
            'issues': issues
        })

    return results


def detect_word_issues(
    user_features: AudioFeatures,
    ref_features: AudioFeatures,
    user_start: int, user_end: int,
    ref_start: int, ref_end: int,
    makhraj_score: float,
    timing_score: float,
    word_text: str
) -> list[str]:
    """
    Detect specific pronunciation issues for a single word.

    Similar to detect_issues but tailored for word-level feedback.
    """
    issues = []

    # Skip if frame range is too small
    if user_end <= user_start or ref_end <= ref_start:
        return issues

    # Timing issues
    user_duration = (user_end - user_start) * user_features.hop_length / user_features.sample_rate
    ref_duration = (ref_end - ref_start) * ref_features.hop_length / ref_features.sample_rate

    if ref_duration > 0:
        ratio = user_duration / ref_duration
        if ratio < 0.6:
            issues.append("Too fast - extend this word")
        elif ratio > 1.6:
            issues.append("Too slow - shorten this word")

    # Makhraj issues based on MFCC differences
    if makhraj_score < 75:
        user_mfcc = user_features.mfcc[:, user_start:user_end]
        ref_mfcc = ref_features.mfcc[:, ref_start:ref_end]

        if user_mfcc.size > 0 and ref_mfcc.size > 0:
            # Low MFCCs = vocal tract shape (throat/tongue)
            user_low = np.mean(user_mfcc[1:5, :])
            ref_low = np.mean(ref_mfcc[1:5, :])
            low_diff = abs(user_low - ref_low)

            # High MFCCs = fine articulation
            user_high = np.mean(user_mfcc[5:9, :]) if user_mfcc.shape[0] > 8 else 0
            ref_high = np.mean(ref_mfcc[5:9, :]) if ref_mfcc.shape[0] > 8 else 0
            high_diff = abs(user_high - ref_high)

            if low_diff > 6:
                if user_low < ref_low:
                    issues.append("Articulation point too shallow")
                else:
                    issues.append("Articulation point too deep")

            if high_diff > 4 and makhraj_score < 65:
                issues.append("Letter clarity needs work")

    # Pitch issues
    if user_end > user_start and ref_end > ref_start:
        user_pitch = user_features.pitch[user_start:user_end]
        ref_pitch = ref_features.pitch[ref_start:ref_end]

        user_voiced = user_pitch[user_pitch > 0]
        ref_voiced = ref_pitch[ref_pitch > 0]

        if len(user_voiced) > 0 and len(ref_voiced) > 0:
            user_mean_pitch = np.mean(user_voiced)
            ref_mean_pitch = np.mean(ref_voiced)
            pitch_ratio = user_mean_pitch / ref_mean_pitch if ref_mean_pitch > 0 else 1.0

            if pitch_ratio > 1.4:
                issues.append("Pitch too high")
            elif pitch_ratio < 0.65:
                issues.append("Pitch too low")

            # Detect sudden pitch jumps within the word
            if len(user_voiced) > 3:
                pitch_diffs = np.abs(np.diff(user_voiced))
                max_jump = np.max(pitch_diffs)
                ref_max_jump = np.max(np.abs(np.diff(ref_voiced))) if len(ref_voiced) > 3 else 40

                if max_jump > ref_max_jump * 1.4 and max_jump > 25:
                    issues.append("Unstable pitch")

    # Energy issues
    if user_end > user_start and ref_end > ref_start:
        user_energy = np.mean(user_features.rms_energy[user_start:user_end])
        ref_energy = np.mean(ref_features.rms_energy[ref_start:ref_end])

        if ref_energy > 0:
            energy_ratio = user_energy / ref_energy
            if energy_ratio < 0.4:
                issues.append("Too quiet")
            elif energy_ratio > 2.5:
                issues.append("Too loud")

    return issues


def generate_summary(
    overall_score: float,
    makhraj_score: float,
    timing_score: float,
    fluency_score: float,
    segments: list[SegmentFeedback]
) -> str:
    """Generate a human-readable summary of the pronunciation analysis."""
    parts = []

    # Overall assessment
    if overall_score >= 90:
        parts.append("Excellent recitation! Very close to the reference.")
    elif overall_score >= 75:
        parts.append("Good recitation with minor areas for improvement.")
    elif overall_score >= 60:
        parts.append("Acceptable recitation. Focus on the highlighted areas.")
    else:
        parts.append("Needs practice. Review the specific feedback below.")

    # Specific feedback
    if makhraj_score < 70:
        parts.append("Pay attention to articulation points (makhraj).")

    if timing_score < 70:
        parts.append("Work on timing - check madd elongation rules.")

    if fluency_score < 70:
        parts.append("Practice for smoother, more fluent recitation.")

    # Count segments with issues
    problem_segments = sum(1 for s in segments if s.issues)
    if problem_segments > 0:
        parts.append(f"{problem_segments} segment(s) need attention.")

    return " ".join(parts)
