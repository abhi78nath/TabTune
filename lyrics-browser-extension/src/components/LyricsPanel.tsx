
import { useEffect, useState, useCallback } from "react";
import { fetchLyrics } from "../services/lyrics-service";

interface LyricsPanelProps {
    artist: string;
    title: string;
    expanded: boolean;
    style?: React.CSSProperties; // passed for color theming
}

export function LyricsPanel({ artist, title, expanded, style }: LyricsPanelProps) {
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadedKey, setLoadedKey] = useState<string | null>(null);

    const currentKey = `${artist}|${title}`;

    const loadLyrics = useCallback(async () => {
        if (!artist || !title) return;

        setLoading(true);
        setError(null);
        setLyrics(null);

        try {
            const result = await fetchLyrics(artist, title);
            if (result.error) {
                setError(result.error);
            } else if (result.lyrics) {
                setLyrics(result.lyrics);
                setLoadedKey(currentKey);
            } else {
                setError("No lyrics found");
            }
        } catch (err: any) {
            setError("Failed to load lyrics: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [artist, title, currentKey]);

    useEffect(() => {
        if (expanded && loadedKey !== currentKey && !loading) {
            loadLyrics();
        }
    }, [expanded, currentKey, loadedKey, loading, loadLyrics]);

    // Reset if song changes while expanded
    useEffect(() => {
        if (expanded && loadedKey !== currentKey) {
            setLoadedKey(null);
        }
    }, [currentKey, expanded, loadedKey]);

    return (
        <div className={`lyrics-panel ${expanded ? 'expanded' : ''}`}>
            {loading && <div className="lyrics-loading">Loading lyrics...</div>}

            {!loading && lyrics && (
                <div className="lyrics-content" style={{ display: 'block' }}>{lyrics}</div>
            )}

            {!loading && error && (
                <div className="lyrics-error" style={{ display: 'flex' }}>
                    <div>{error}</div>
                    <button className="retry-btn" style={style} onClick={(e) => {
                        e.stopPropagation();
                        loadLyrics();
                    }}>
                        <div className="retry-icon" style={style}></div>
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
}
