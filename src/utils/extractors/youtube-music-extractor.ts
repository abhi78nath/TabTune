
export interface YouTubeMusicSongDetails {
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
 * Extracts song details from YouTube Music
 * This function is injected into YouTube Music tabs
 */
export function extractYouTubeMusicSongDetails(): YouTubeMusicSongDetails {
    const songDetails: YouTubeMusicSongDetails = {
        title: null,
        artist: null,
        album: null,
        image: null,
        duration: null,
        currentTime: null,
        progress: null,
        isAd: false,
    };

    // YouTube Music DOM Selectors
    const titleElement = document.querySelector(".content-info-wrapper .title");
    const bylineElement = document.querySelector(".content-info-wrapper .byline");
    const imageElement = document.querySelector(".image.style-scope.ytmusic-player-bar");
    const timeInfoElement = document.querySelector(".time-info.style-scope.ytmusic-player-bar");
    const progressBarElement = document.querySelectorAll("#progress-bar")[0]; // Slider
    const adBadgeElement = document.querySelector(".badge-style-type-ad-stark.style-scope.ytmusic-player-bar");

    // Check for Ad
    if (adBadgeElement) {
        const isHidden = adBadgeElement.hasAttribute("hidden");
        const text = adBadgeElement.textContent?.trim() || (adBadgeElement as HTMLElement).innerText?.trim();
        if (!isHidden && text === "Sponsored") {
            songDetails.isAd = true;
        }
    }

    if (titleElement) {
        songDetails.title = titleElement.textContent?.trim() || (titleElement as HTMLElement).innerText?.trim() || null;
    }

    if (bylineElement) {
        // format: "Artist • Album • Year" or just "Artist • Album" or "Artist"
        const text = bylineElement.textContent?.trim() || (bylineElement as HTMLElement).innerText?.trim() || "";
        const parts = text.split("•").map(s => s.trim());

        if (parts.length > 0) {
            songDetails.artist = parts[0];
        }
        if (parts.length > 1) {
            songDetails.album = parts[1];
        }
    }

    if (imageElement) {
        songDetails.image = (imageElement as HTMLImageElement).src || imageElement.getAttribute("src");
    }

    if (timeInfoElement) {
        // format: "1:23 / 4:56"
        const text = timeInfoElement.textContent?.trim() || (timeInfoElement as HTMLElement).innerText?.trim() || "";
        const parts = text.split("/").map(s => s.trim());
        if (parts.length >= 2) {
            songDetails.currentTime = parts[0];
            songDetails.duration = parts[1];
        }
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

    // Fallback Media Session API (often reliable for basic info)
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

    return songDetails;
}
