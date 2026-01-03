import { useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface RecordingState {
  isRecording: boolean;
  isPreparing: boolean;
  duration: number;
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPreparing: false,
    duration: 0,
    error: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  async function startRecording(): Promise<boolean> {
    try {
      setState((s) => ({ ...s, isPreparing: true, error: null }));

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setState((s) => ({
          ...s,
          isPreparing: false,
          error: 'Microphone permission denied',
        }));
        return false;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;

      // Track duration
      durationIntervalRef.current = setInterval(() => {
        setState((s) => ({ ...s, duration: s.duration + 1 }));
      }, 1000);

      setState((s) => ({
        ...s,
        isRecording: true,
        isPreparing: false,
        duration: 0,
      }));

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState((s) => ({
        ...s,
        isPreparing: false,
        error: 'Failed to start recording',
      }));
      return false;
    }
  }

  async function stopRecording(): Promise<string | null> {
    try {
      if (!recordingRef.current) {
        return null;
      }

      // Stop duration tracking
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Get the recording URI
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      setState((s) => ({
        ...s,
        isRecording: false,
        duration: 0,
      }));

      if (!uri) {
        setState((s) => ({ ...s, error: 'No recording URI' }));
        return null;
      }

      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Clean up the file
      await FileSystem.deleteAsync(uri, { idempotent: true });

      return base64;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState((s) => ({
        ...s,
        isRecording: false,
        error: 'Failed to stop recording',
      }));
      return null;
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return {
    ...state,
    formattedDuration: formatDuration(state.duration),
    startRecording,
    stopRecording,
  };
}
