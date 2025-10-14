// Supabase client and database operations
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fetch all audio files
export async function fetchAudioFiles(options = {}) {
    try {
        let query = supabase
            .from('audio_files')
            .select('*')
            .order('created_at', { ascending: false });

        if (options.search) {
            query = query.ilike('name', `%${options.search}%`);
        }

        if (options.withStems) {
            // Files that have stems
            const { data: filesWithStems } = await supabase
                .from('audio_files_stems')
                .select('audio_file_id')
                .not('audio_file_id', 'is', null);

            const fileIds = [...new Set(filesWithStems.map(s => s.audio_file_id))];
            query = query.in('id', fileIds);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching audio files:', error);
        return [];
    }
}

// Fetch single file by ID
export async function fetchAudioFile(id) {
    try {
        const { data, error } = await supabase
            .from('audio_files')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching audio file:', error);
        return null;
    }
}

// Fetch stems for a file
export async function fetchStems(audioFileId) {
    try {
        const { data, error } = await supabase
            .from('audio_files_stems')
            .select('*')
            .eq('audio_file_id', audioFileId)
            .order('stem_type');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching stems:', error);
        return [];
    }
}

// Check if file has stems
export async function hasStems(audioFileId) {
    try {
        const { data, error } = await supabase
            .from('audio_files_stems')
            .select('id')
            .eq('audio_file_id', audioFileId)
            .limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking stems:', error);
        return false;
    }
}

// Fetch all stems for navigation (used in stem player prev/next)
export async function fetchAllStems() {
    try {
        const { data, error } = await supabase
            .from('audio_files_stems')
            .select('*')
            .order('stem_type');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching all stems:', error);
        return [];
    }
}
