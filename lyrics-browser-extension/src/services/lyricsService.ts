export type LyricsResult =
    | { lyrics: string }
    | { error: string };

async function fetchFromLrclib(
    artist: string,
    title: string
): Promise<LyricsResult | null> {
    const encodedArtist = encodeURIComponent(artist.trim());
    const encodedTitle = encodeURIComponent(title.trim());

    const apiUrl = `https://lrclib.net/api/get?artist_name=${encodedArtist}&track_name=${encodedTitle}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`LRCLIB API error: ${response.status}`);
    }

    const data = await response.json();

    if (data?.plainLyrics) {
        return { lyrics: data.plainLyrics };
    }

    if (data?.instrumental) {
        return { lyrics: "[Instrumental]" };
    }

    return null;
}

async function fetchFromPrimary(
    artist: string,
    title: string
): Promise<LyricsResult | null> {
    const encodedArtist = encodeURIComponent(artist.trim());
    const encodedTitle = encodeURIComponent(title.trim());

    const apiUrl = `https://test-0k.onrender.com/lyrics/?artist=${encodedArtist}&song=${encodedTitle}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`Primary API error: ${response.status}`);
    }

    const data = await response.json();

    if (data?.status === "success" && data?.data?.lyrics) {
        return { lyrics: data.data.lyrics };
    }

    if (
        data?.status === "success" &&
        data?.data &&
        !data.data.lyrics &&
        data.data.source === "simpmusic"
    ) {
        return { lyrics: data.data.timestamped };
    }

    return null;
}

async function fetchFromSecondary(
    artist: string,
    title: string
): Promise<LyricsResult> {
    const encodedArtist = encodeURIComponent(artist.trim());
    const encodedTitle = encodeURIComponent(title.trim());

    const apiUrl = `https://api.lyrics.ovh/v1/${encodedArtist}/${encodedTitle}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            if (response.status === 404) {
                return { error: "Lyrics not found for this song" };
            }
            throw new Error(`HTTP error: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        console.error("Secondary lyrics fetch failed:", error);
        return { error: error?.message || "Failed to fetch lyrics" };
    }
}

/**
 * Fetch lyrics with fallback strategy:
 * 1. LRCLIB (best quality)
 * 2. OnRender (custom)
 * 3. lyrics.ovh (fallback)
 */
export async function fetchLyrics(
    artist: string,
    title: string
): Promise<LyricsResult> {
    if (!artist || !title) {
        return { error: "Artist and title are required" };
    }

    // 1️⃣ LRCLIB
    try {
        const result = await fetchFromLrclib(artist, title) as any;
        if (result?.lyrics) return result;
    } catch (err) {
        console.warn("LRCLIB failed:", err);
    }

    // 2️⃣ Primary (OnRender)
    try {
        const result = await fetchFromPrimary(artist, title) as any;
        if (result?.lyrics) return result;
    } catch (err) {
        console.warn("Primary lyrics source failed:", err);
    }

    // 3️⃣ Fallback
    return await fetchFromSecondary(artist, title);
}
