"""
Dynamic Time Warping (DTW) Alignment

Aligns user recitation with reference audio to enable
frame-by-frame comparison despite different speaking speeds.
"""

from dataclasses import dataclass

import numpy as np
from dtw import dtw

from features import AudioFeatures


@dataclass
class AlignmentResult:
    """Result of DTW alignment between two audio recordings"""
    # Alignment path: pairs of (user_frame_idx, reference_frame_idx)
    path: list[tuple[int, int]]

    # DTW distance (lower = more similar overall)
    distance: float

    # Normalized distance (by path length)
    normalized_distance: float

    # Mapping from user frames to reference frames
    user_to_ref: dict[int, int]

    # Mapping from reference frames to user frames
    ref_to_user: dict[int, int]

    # Time stretching factor per segment (>1 means user is slower)
    time_stretch: np.ndarray


def align_audio_features(
    user_features: AudioFeatures,
    ref_features: AudioFeatures
) -> AlignmentResult:
    """
    Align user audio to reference audio using DTW on MFCC features.

    This finds the optimal alignment between the two recordings,
    accounting for different speaking speeds.

    Args:
        user_features: Features extracted from user's recording
        ref_features: Features extracted from reference Qari audio

    Returns:
        AlignmentResult with frame mappings and distance metrics
    """
    # Use MFCC for alignment (transpose to have frames as rows)
    user_mfcc = user_features.mfcc.T  # Shape: (n_frames, n_mfcc)
    ref_mfcc = ref_features.mfcc.T

    # Run DTW
    alignment = dtw(
        user_mfcc,
        ref_mfcc,
        keep_internals=True,
        step_pattern='symmetric2'  # Allows for flexible time warping
    )

    # Extract alignment path
    path = list(zip(alignment.index1, alignment.index2))

    # Build frame mappings
    user_to_ref = {}
    ref_to_user = {}

    for user_idx, ref_idx in path:
        # For user->ref, keep the last mapping (in case of many-to-one)
        user_to_ref[user_idx] = ref_idx
        # For ref->user, keep the first mapping
        if ref_idx not in ref_to_user:
            ref_to_user[ref_idx] = user_idx

    # Calculate time stretching per segment
    time_stretch = compute_time_stretch(path, user_features, ref_features)

    return AlignmentResult(
        path=path,
        distance=alignment.distance,
        normalized_distance=alignment.normalizedDistance,
        user_to_ref=user_to_ref,
        ref_to_user=ref_to_user,
        time_stretch=time_stretch
    )


def compute_time_stretch(
    path: list[tuple[int, int]],
    user_features: AudioFeatures,
    ref_features: AudioFeatures,
    segment_frames: int = 20
) -> np.ndarray:
    """
    Compute local time stretching factor along the alignment path.

    Values > 1 mean user is slower than reference.
    Values < 1 mean user is faster than reference.

    Args:
        path: DTW alignment path
        user_features: User audio features
        ref_features: Reference audio features
        segment_frames: Number of frames per segment for analysis

    Returns:
        Array of time stretch factors
    """
    if len(path) < 2:
        return np.array([1.0])

    # Group path into segments
    n_segments = max(1, len(path) // segment_frames)
    segment_size = len(path) // n_segments

    time_stretches = []

    for i in range(n_segments):
        start_idx = i * segment_size
        end_idx = min((i + 1) * segment_size, len(path) - 1)

        if start_idx >= len(path) or end_idx >= len(path):
            break

        # Get frame indices at segment boundaries
        user_start, ref_start = path[start_idx]
        user_end, ref_end = path[end_idx]

        # Calculate actual time spans
        user_time = (user_end - user_start) * user_features.hop_length / user_features.sample_rate
        ref_time = (ref_end - ref_start) * ref_features.hop_length / ref_features.sample_rate

        # Avoid division by zero
        if ref_time > 0:
            stretch = user_time / ref_time
        else:
            stretch = 1.0

        time_stretches.append(stretch)

    return np.array(time_stretches) if time_stretches else np.array([1.0])


def get_aligned_frames(
    alignment: AlignmentResult,
    user_frame: int
) -> list[int]:
    """
    Get the reference frames that correspond to a user frame.

    Due to DTW, a single user frame might map to multiple reference frames
    (if user is speaking faster) or vice versa.
    """
    ref_frames = []
    for u, r in alignment.path:
        if u == user_frame:
            ref_frames.append(r)
    return ref_frames


def segment_alignment(
    alignment: AlignmentResult,
    n_segments: int = 10
) -> list[tuple[tuple[int, int], tuple[int, int]]]:
    """
    Divide the alignment into equal segments for analysis.

    Returns list of ((user_start, user_end), (ref_start, ref_end)) tuples.
    """
    path = alignment.path
    segment_size = len(path) // n_segments

    segments = []
    for i in range(n_segments):
        start_idx = i * segment_size
        end_idx = min((i + 1) * segment_size - 1, len(path) - 1)

        user_start, ref_start = path[start_idx]
        user_end, ref_end = path[end_idx]

        segments.append((
            (user_start, user_end),
            (ref_start, ref_end)
        ))

    return segments
