
export interface YouTubeSongDetails {
    title: string | null;
    artist: string | null;
    album: string | null;
    image: string | null;
    duration: string | null;
    currentTime: string | null;
    progress: string | null;
    isAd: boolean;
}

/**
 * Extracts song/video details from YouTube
 * This function is injected into YouTube tabs
 */
export function extractYouTubeSongDetails(): YouTubeSongDetails {
    const songDetails: YouTubeSongDetails = {
        title: null,
        artist: null,
        album: null,
        image: null,
        duration: null,
        currentTime: null,
        progress: null,
        isAd: false,
    };

    // YouTube DOM Selectors (Standard YouTube)
    const titleElement = document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
        document.querySelector("h1.style-scope.ytd-watch-metadata") ||
        document.querySelector(".ytd-video-primary-info-renderer.title");

    const channelElement = document.querySelector("#owner #channel-name a") ||
        document.querySelector("ytd-video-owner-renderer #channel-name yt-formatted-string");

    const timeCurrentElement = document.querySelector(".ytp-time-current");
    const timeDurationElement = document.querySelector(".ytp-time-duration");
    const progressBarElement = document.querySelector(".ytp-progress-bar");

    // Check for Ad - Standard YouTube
    const isAdShowing = !!document.querySelector(".ad-showing, .ad-interrupting");
    const adOverlay = !!document.querySelector(".ytp-ad-player-overlay, .ytp-ad-text, .ytp-ad-visit-advertiser-button, .ytp-ad-skip-button");

    if (isAdShowing || adOverlay) {
        songDetails.isAd = true;
    }

    if (titleElement) {
        songDetails.title = titleElement.textContent?.trim() || (titleElement as HTMLElement).innerText?.trim() || null;
    }

    if (channelElement) {
        songDetails.artist = channelElement.textContent?.trim() || (channelElement as HTMLElement).innerText?.trim() || null;
    }

    if (timeCurrentElement && timeDurationElement) {
        songDetails.currentTime = timeCurrentElement.textContent?.trim() || (timeCurrentElement as HTMLElement).innerText?.trim() || null;
        songDetails.duration = timeDurationElement.textContent?.trim() || (timeDurationElement as HTMLElement).innerText?.trim() || null;
    }

    // Try to get progress from slider aria-valuenow or calculate
    if (progressBarElement) {
        const slider = progressBarElement as HTMLElement;
        const valueNow = slider.getAttribute("aria-valuenow");
        const valueMax = slider.getAttribute("aria-valuemax");

        if (valueNow && valueMax) {
            const current = parseFloat(valueNow);
            const max = parseFloat(valueMax);
            if (max > 0) {
                songDetails.progress = ((current / max) * 100).toFixed(2);
            }
        }
    }

    // Fallback/Primary Media Session API
    if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
        const metadata = navigator.mediaSession.metadata;
        if (!songDetails.title) songDetails.title = metadata.title;
        if (!songDetails.artist) songDetails.artist = metadata.artist;
        if (!songDetails.album) songDetails.album = metadata.album;

        if (!songDetails.image && metadata.artwork && metadata.artwork.length > 0) {
            // Get the largest artwork
            const artwork = [...metadata.artwork].sort((a, b) => {
                const widthA = parseInt(a.sizes?.split('x')[0] || "0");
                const widthB = parseInt(b.sizes?.split('x')[0] || "0");
                return widthB - widthA;
            })[0];
            songDetails.image = artwork.src;
        }
    }

    // If still no image, try meta tag
    if (!songDetails.image) {
        const metaImage = document.querySelector('meta[property="og:image"]');
        if (metaImage) {
            songDetails.image = metaImage.getAttribute("content");
        }
    }

    return songDetails;
}
