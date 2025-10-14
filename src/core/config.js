// Configuration and constants
export const SUPABASE_URL = 'https://ekpsbioieoxhdjdqwohy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcHNiaW9pZW94aGRqZHF3b2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2OTc4NTUsImV4cCI6MjA3NTI3Mzg1NX0.a9yg9v5R0HSj2EWBeUuAhrqBcB0P297IIPZcN6Zmffg';

export const MARKER_FREQUENCIES = {
    bar8: { label: 'Every 8 bars', interval: 8 },
    bar4: { label: 'Every 4 bars', interval: 4 },
    bar2: { label: 'Every 2 bars', interval: 2 },
    bar: { label: 'Every bar', interval: 1 },
    halfbar: { label: 'Half bar', interval: 0.5 },
    beat: { label: 'Every beat', interval: 0.25 }
};

export const KEY_TO_SEMITONE = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

export const SEMITONE_TO_KEY = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const STEM_TYPES = ['drums', 'bass', 'other', 'vocals'];
