
export interface LyricsResult {
    lyrics?: string;
    error?: string;
}

export interface LyricsResponse {
    status: string;
    data: {
        lyrics?: string;
        source?: string;
        timestamped?: string;
    }
}

export interface LrclibResponse {
    plainLyrics?: string;
    syncedLyrics?: string;
    instrumental?: boolean;
}

/**
 * Fetches lyrics from external APIs
 * @param {string} artist - The artist name
 * @param {string} title - The song title
 * @returns {Promise<LyricsResult>} Promise that resolves to lyrics data or error
 */
export async function fetchLyrics(artist: string, title: string): Promise<LyricsResult> {
    if (!artist || !title) {
        return { error: 'Artist and title are required' };
    }

    // 1. Try LRCLIB (Primary)
    try {
        const lrclibResult = await fetchFromLrclib(artist, title);
        if (lrclibResult && lrclibResult.lyrics) {
            return lrclibResult;
        }
    } catch (error) {
        console.warn('LRCLIB lyrics source failed:', error);
    }

    // 2. Try OnRender (Secondary)
    try {
        const primaryResult = await fetchFromPrimary(artist, title);
        if (primaryResult && primaryResult.lyrics) {
            return primaryResult;
        }
    } catch (error) {
        console.warn('OnRender lyrics source failed:', error);
    }

    // 3. Fallback to lyrics.ovh
    return await fetchFromSecondary(artist, title);
}

async function fetchFromPrimary(artist: string, title: string): Promise<LyricsResult | null> {
    const encodedArtist = encodeURIComponent(artist.trim());
    const encodedTitle = encodeURIComponent(title.trim());

    // Note: API expects "song" parameter instead of "title" in query string, but based on URL provided 
    // https://test-0k.onrender.com/lyrics/?artist=Coldplay&song=Yellow
    const apiUrl = `https://test-0k.onrender.com/lyrics/?artist=${encodedArtist}&song=${encodedTitle}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
        // throw new Error(`Primary API error: ${response.status}`);
        return null;
    }

    const data = await response.json() as LyricsResponse;

    // Map response format: {"status":"success", "data": {"lyrics": "..."}}
    if (data.status === 'success' && data.data && data.data.lyrics) {
        return { lyrics: data.data.lyrics };
    } else if (data.status === 'success' && data.data && !data.data.lyrics && data.data.source === "simpmusic") {
        // This looks like a specific fallback in the original code
        return { lyrics: data.data.timestamped }
    }

    return null;
}

async function fetchFromSecondary(artist: string, title: string): Promise<LyricsResult> {
    // Clean the artist and title for URL encoding
    const encodedArtist = encodeURIComponent(artist.trim());
    const encodedTitle = encodeURIComponent(title.trim());

    const apiUrl = `https://api.lyrics.ovh/v1/${encodedArtist}/${encodedTitle}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            if (response.status === 404) {
                return { error: 'Lyrics not found for this song' };
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as LyricsResult;
    } catch (error: any) {
        console.error('Error fetching lyrics from secondary source:', error);
        return { error: error.message || 'Failed to fetch lyrics' };
    }
}

async function fetchFromLrclib(artist: string, title: string): Promise<LyricsResult | null> {
    const encodedArtist = encodeURIComponent(artist.trim());
    const encodedTitle = encodeURIComponent(title.trim());

    const apiUrl = `https://lrclib.net/api/get?artist_name=${encodedArtist}&track_name=${encodedTitle}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`LRCLIB API error: ${response.status}`);
    }

    const data = await response.json() as LrclibResponse;

    // LRCLIB returns { plainLyrics, syncedLyrics, instrumentation, ... }
    if (data && data.plainLyrics) {
        return { lyrics: data.plainLyrics };
    } else if (data && data.instrumental) {
        return { lyrics: "[Instrumental]" };
    }

    return null;
}
