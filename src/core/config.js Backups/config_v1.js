// Supabase configuration
export const SUPABASE_URL = 'https://ekpsbioieoxhdjdqwohy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcHNiaW9pZW94aGRqZHF3b2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2OTc4NTUsImV4cCI6MjA3NTI3Mzg1NX0.a9yg9v5R0HSj2EWBeUuAhrqBcB0P297IIPZcN6Zmffg';

// Initialize Supabase client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// LocalStorage keys for processing preferences
export const PREF_KEYS = {
    stems: 'audiolib_process_stems',
    bpmKey: 'audiolib_process_bpm_key',
    instruments: 'audiolib_process_instruments',
    chords: 'audiolib_process_chords',
    beatmap: 'audiolib_process_beatmap',
    autoTag: 'audiolib_process_auto_tag',
    convertMp3: 'audiolib_process_convert_mp3'
};
