// Spotify song details extraction functionality
// This module is imported by the background service worker

type SpotifySongDetails = {
    title: string | null;
    artist: string | null;
    album: string | null;
    image: string | null;
    duration: string | null;
    currentTime: string | null;
    progress: string | null;
};

/**
 * Runs INSIDE the Spotify tab (DOM context)
 */
function extractSpotifySongDetails(): SpotifySongDetails {
    const songDetails: SpotifySongDetails = {
        title: null,
        artist: null,
        album: null,
        image: null,
        duration: null,
        currentTime: null,
        progress: null
    };

    const titleElement =
        document.querySelector('[data-testid="context-item-info-title"]') ||
        document.querySelector('a[data-testid="context-item-link"]') ||
        document.querySelector(".now-playing-bar__left .track-info__name a") ||
        document.querySelector(".track-info__name a") as any;

    const artistElement =
        document.querySelector('[data-testid="context-item-info-artist"]') ||
        document.querySelector('a[data-testid="context-item-info-artist"]') ||
        document.querySelector(".now-playing-bar__left .track-info__artists a") ||
        document.querySelector(".track-info__artists a") as any;

    const imageElement =
        document.querySelector('[data-testid="entityImage"]') ||
        document.querySelector('[data-testid="cover-art-image"]') ||
        document.querySelector(".now-playing-bar__left img") ||
        document.querySelector(".cover-art img") as any;

    const currentTimeElement =
        document.querySelector('[data-testid="playback-position"]') ||
        document.querySelector(".playback-bar__progress-time:first-child") as any;

    const durationElement =
        document.querySelector('[data-testid="playback-duration"]') ||
        document.querySelector('[data-testid="duration-text"]') ||
        document.querySelector(".playback-bar__progress-time:last-child") as any;

    const progressElement =
        document.querySelector('[data-testid="progress-bar"]') ||
        document.querySelector(".playback-bar__progress") as any;

    const progressContainer = progressElement?.parentElement;

    if (titleElement) {
        songDetails.title =
            titleElement.textContent?.trim() || titleElement.innerText?.trim();
    }

    if (artistElement) {
        songDetails.artist =
            artistElement.textContent?.trim() || artistElement.innerText?.trim();
    }

    if (imageElement) {
        songDetails.image =
            (imageElement as HTMLImageElement).src ||
            imageElement.getAttribute("src");
    }

    if (currentTimeElement) {
        songDetails.currentTime =
            currentTimeElement.textContent?.trim() ||
            currentTimeElement.innerText?.trim();
    }

    if (durationElement) {
        songDetails.duration =
            durationElement.textContent?.trim() ||
            durationElement.innerText?.trim();
    }

    if (progressElement && progressContainer) {
        const progressWidth = progressElement.clientWidth;
        const containerWidth = progressContainer.clientWidth;

        if (containerWidth > 0) {
            songDetails.progress = ((progressWidth / containerWidth) * 100).toFixed(2);
        }
    }

    // Fallback: page title
    if (!songDetails.title) {
        const pageTitle = document.title;
        if (pageTitle.includes(" - ")) {
            const parts = pageTitle.split(" - ");
            if (parts.length >= 2) {
                songDetails.title = parts[0].trim();
                songDetails.artist = parts[1].replace(" | Spotify", "").trim();
            }
        }
    }

    return songDetails;
}

/**
 * Runs in BACKGROUND service worker
 */
export function getSpotifySongDetails(tabId: number) {
    chrome.scripting.executeScript(
        {
            target: { tabId },
            func: extractSpotifySongDetails
        },
        (results: { result: any; }[]) => {
            if (chrome.runtime.lastError) {
                console.error(
                    "Error extracting Spotify details:",
                    chrome.runtime.lastError.message
                );
                return;
            }

            const details = results?.[0]?.result;
            if (!details) return;

            chrome.storage.local.set({
                [`spotifyDetails_${tabId}`]: details
            });
        }
    );
}
