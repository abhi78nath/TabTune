
import { useState, useRef } from "react";
import type { MediaTab } from "../hooks/useMediaTabs";
import { useSpotifyDetails } from "../hooks/useSpotifyDetails";
import { useYouTubeMusicDetails } from "../hooks/useYouTubeMusicDetails";
import { useYouTubeDetails } from "../hooks/useYouTubeDetails";
import { getDominantColors, type RGB } from "../utils/dominant-color";
import { getReadableTextColor } from "../utils/readable-text-color";
import { ProgressBar } from "./ProgressBar";
import { LyricsPanel } from "./LyricsPanel";

interface MediaItemProps {
    tab: MediaTab;
}

export function MediaItem({ tab }: MediaItemProps) {
    const isSpotify = tab.url?.includes("open.spotify.com");
    const isYouTubeMusic = tab.url?.includes("music.youtube.com");
    // Only match youtube.com if it's NOT music.youtube.com
    const isYouTube = tab.url?.includes("youtube.com") && !isYouTubeMusic;

    const spotifyDetails = useSpotifyDetails(tab.id);
    const youtubeMusicDetails = useYouTubeMusicDetails(tab.id);
    const youtubeDetails = useYouTubeDetails(tab.id);

    const mediaDetails = isSpotify ? spotifyDetails : (isYouTubeMusic ? youtubeMusicDetails : (isYouTube ? youtubeDetails : null));
    const [dominantColor, setDominantColor] = useState<RGB | null>(null);
    const [textColor, setTextColor] = useState<string>("var(--text-color)");
    const [lyricsExpanded, setLyricsExpanded] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Image load handler for dominant color
    const handleImageLoad = () => {
        if (imgRef.current) {
            try {
                // Get the most dominant color for the background
                const dominantColors = getDominantColors(imgRef.current, 1, 'desc');
                // Get the least dominant colors for the text
                const leastColors = getDominantColors(imgRef.current, 3, 'asc');

                if (dominantColors && dominantColors.length > 0) {
                    const primary = dominantColors[0];
                    setDominantColor(primary);

                    const finalTextColor = getReadableTextColor(primary, leastColors || []);
                    setTextColor(finalTextColor);
                }
            } catch (e) {
                console.error("Color extraction failed:", e);
            }
        }
    };

    const focusTab = () => {
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
    };

    const toggleMute = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await chrome.tabs.update(tab.id, { muted: !tab.muted });
    };

    const closeTab = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRemoving(true);

        setTimeout(async () => {
            // Tell background to stop tracking this tab
            chrome.runtime.sendMessage({ action: "remove-media-tab", tabId: tab.id });

            // Pause the media
            try {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'MEDIA_CONTROL',
                    command: 'playPause'
                }).catch(() => { });
            } catch (err) {
                console.error("Failed to pause media on close:", err);
            }
        }, 200);
    };

    const handlePlayPause = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            chrome.tabs.sendMessage(tab.id, {
                action: 'MEDIA_CONTROL',
                command: 'playPause'
            });
        } catch (err) {
            console.error("Failed to toggle play/pause:", err);
        }
    };

    const handlePrev = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            chrome.tabs.sendMessage(tab.id, {
                action: 'MEDIA_CONTROL',
                command: 'prev'
            });
        } catch (err) {
            console.error("Failed to skip back:", err);
        }
    };

    const handleNext = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            chrome.tabs.sendMessage(tab.id, {
                action: 'MEDIA_CONTROL',
                command: 'next'
            });
        } catch (err) {
            console.error("Failed to skip forward:", err);
        }
    };

    // Calculate item styles based on dominant color
    const itemStyle: React.CSSProperties = dominantColor ? {
        backgroundColor: `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`,
        backgroundImage: 'none',
        borderColor: `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.5)`,
        color: textColor
    } : {};

    // Pass color to children for correct theming
    const textStyle = { color: textColor };

    // Dynamic props
    const isAd = (mediaDetails as any)?.isAd;
    const title = isAd ? "Sponsored Ad" : (mediaDetails?.title || tab.title || "Untitled");
    const artist = isAd ? "YouTube Music" : (mediaDetails?.artist || "Unknown Artist");
    const image = mediaDetails?.image;
    const isPaused = tab.paused || !tab.audible; // Fallback logic same as popup.js

    if (isRemoving) {
        itemStyle.opacity = 0;
        itemStyle.transform = 'scale(0.9)';
    }

    return (
        <li
            className="playing"
            style={itemStyle}
            title={tab.url}
        >
            <div className="media-row" onClick={focusTab}>
                {/* Info Section */}
                <div className="info">
                    {image && !isAd && (
                        <img
                            ref={imgRef}
                            src={image}
                            alt="Album cover"
                            className="album-image"
                            crossOrigin="anonymous"
                            onLoad={handleImageLoad}
                        />
                    )}
                    <div className="info-text">
                        <small className="source-text" style={textStyle}>
                            {tab.url && new URL(tab.url).hostname}
                        </small>
                        <div className="title-text" style={textStyle}>{title}</div>
                        <div className="artist-text" style={textStyle}>{artist}</div>
                    </div>
                </div>

                <div className="close-btn" style={{ color: textColor }} onClick={closeTab}>
                    <div className="close-icon" style={{ backgroundColor: textColor }}></div>
                </div>

                {/* Progress Bar (Spotify, YouTube Music, YouTube) */}
                {(isSpotify || isYouTubeMusic || isYouTube) && mediaDetails && mediaDetails.duration && (
                    <ProgressBar
                        duration={mediaDetails.duration}
                        currentTime={mediaDetails.currentTime}
                        progress={mediaDetails.progress}
                        isPlaying={!tab.paused}
                        style={dominantColor ? { color: textColor } : undefined}
                    />
                )}

                {/* Controls */}
                <div className="control-row">
                    <div className="media-controls">
                        {(isSpotify || isYouTubeMusic || isYouTube) && (
                            <button className="play-pause-btn" style={{ color: textColor }} onClick={handlePrev} title="Previous Track">
                                <div className="play-pause-icon prev" style={{ backgroundColor: textColor }}></div>
                            </button>
                        )}
                        <button className="play-pause-btn" style={{ color: textColor }} onClick={handlePlayPause} title={isPaused ? "Resume playback" : "Pause playback"}>
                            <div className={`play-pause-icon ${isPaused ? 'play' : 'pause'}`} style={{ backgroundColor: textColor }}></div>
                        </button>
                        {(isSpotify || isYouTubeMusic || isYouTube) && (
                            <button className="play-pause-btn" style={{ color: textColor }} onClick={handleNext} title="Next Track">
                                <div className="play-pause-icon next" style={{ backgroundColor: textColor }}></div>
                            </button>
                        )}
                    </div>

                    {(isSpotify || isYouTubeMusic || isYouTube) && mediaDetails?.title && mediaDetails?.artist && !isAd && (
                        <>
                            <div className="control-separator" style={{ backgroundColor: textColor }}></div>
                            <button
                                className="lyrics-btn"
                                style={{
                                    color: textColor,
                                    borderColor: dominantColor ? `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.2)` : undefined,
                                    backdropFilter: dominantColor ? 'blur(4px)' : undefined
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLyricsExpanded(!lyricsExpanded);
                                }}
                                title="Toggle lyrics"
                            >
                                <div className="lyrics-icon" style={{ backgroundColor: textColor }}></div>
                            </button>
                        </>
                    )}

                    <button className="mute-btn" style={{ marginLeft: 'auto', color: textColor }} onClick={toggleMute} title={tab.muted ? "Unmute" : "Mute"}>
                        <div className={`mute-icon ${tab.muted ? 'unmute' : 'mute'}`} style={{ backgroundColor: textColor }}></div>
                    </button>
                </div>
            </div>

            {/* Lyrics Panel */}
            {(isSpotify || isYouTubeMusic || isYouTube) && !isAd && (
                <LyricsPanel
                    artist={mediaDetails?.artist || ""}
                    title={mediaDetails?.title || ""}
                    expanded={lyricsExpanded}
                    style={{ color: textColor }}
                />
            )}
        </li>
    );
}
