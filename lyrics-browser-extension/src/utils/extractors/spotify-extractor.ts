
export interface SpotifySongDetails {
    title: string | null;
    artist: string | null;
    album: string | null;
    image: string | null;
    duration: string | null;
    currentTime: string | null;
    progress: string | null;
}

/**
 * Extracts song details from Spotify web player
 * This function is injected into Spotify tabs to read the DOM
 */
export function extractSpotifySongDetails(): SpotifySongDetails {
    // Spotify Web Player DOM selectors (these may change, but these are common ones)
    const songDetails: SpotifySongDetails = {
        title: null,
        artist: null,
        album: null,
        image: null,
        duration: null,
        currentTime: null,
        progress: null,
    };

    // Try multiple selectors as Spotify's DOM structure can vary
    // Method 1: Try data-testid selectors (common in modern Spotify)
    const titleElement =
        document.querySelector('[data-testid="context-item-info-title"]') ||
        // document.querySelector('[data-testid="entityTitle"]') ||
        document.querySelector('a[data-testid="context-item-link"]') ||
        document.querySelector(".now-playing-bar__left .track-info__name a") ||
        document.querySelector(".track-info__name a");

    const artistElement =
        document.querySelector('[data-testid="context-item-info-artist"]') ||
        document.querySelector('a[data-testid="context-item-info-artist"]') ||
        document.querySelector(".now-playing-bar__left .track-info__artists a") ||
        document.querySelector(".track-info__artists a");

    const imageElement =
        (document.querySelector('[data-testid="entityImage"]') as HTMLImageElement) ||
        (document.querySelector('[data-testid="cover-art-image"]') as HTMLImageElement) ||
        (document.querySelector(".now-playing-bar__left img") as HTMLImageElement) ||
        (document.querySelector(".cover-art img") as HTMLImageElement);

    // Try to get current time text directly
    const currentTimeElement =
        document.querySelector('[data-testid="playback-position"]') ||
        document.querySelector(".playback-bar__progress-time:first-child");

    const durationElement =
        document.querySelector('[data-testid="playback-duration"]') ||
        document.querySelector('[data-testid="duration-text"]') ||
        document.querySelector(".playback-bar__progress-time:last-child");

    // Get progress bar for percentage calculation
    const progressElement =
        (document.querySelector('[data-testid="progress-bar"]') as HTMLElement) ||
        (document.querySelector(".playback-bar__progress") as HTMLElement);

    const progressContainer = progressElement?.parentElement as HTMLElement;

    if (titleElement) {
        songDetails.title =
            titleElement.textContent?.trim() || (titleElement as HTMLElement).innerText?.trim() || null;
    }

    if (artistElement) {
        songDetails.artist =
            artistElement.textContent?.trim() || (artistElement as HTMLElement).innerText?.trim() || null;
    }

    if (imageElement) {
        songDetails.image = imageElement.src || imageElement.getAttribute("src");
    }

    // Get current time directly from Spotify's display
    if (currentTimeElement) {
        songDetails.currentTime =
            currentTimeElement.textContent?.trim() || (currentTimeElement as HTMLElement).innerText?.trim() || null;
    }

    if (durationElement) {
        songDetails.duration =
            durationElement.textContent?.trim() || (durationElement as HTMLElement).innerText?.trim() || null;
    }

    // Calculate progress percentage from progress bar
    if (progressElement && progressContainer) {
        const progressWidth = progressElement.offsetWidth;
        const containerWidth = progressContainer.offsetWidth;
        if (containerWidth > 0) {
            songDetails.progress = ((progressWidth / containerWidth) * 100).toFixed(2);
        }
    }

    // Also try to get from page title (fallback)
    if (!songDetails.title) {
        const pageTitle = document.title;
        if (pageTitle && pageTitle.includes(" - ")) {
            const parts = pageTitle.split(" - ");
            if (parts.length >= 2) {
                songDetails.title = parts[0].trim();
                songDetails.artist = parts[1].replace(" | Spotify", "").trim();
            }
        }
    }

    return songDetails;
}
