
import type { SpotifySongDetails } from '../types';

let lastDetails: SpotifySongDetails | null = null;
let lastUrl = location.href;

function extractSpotifySongDetails(): SpotifySongDetails {
    const songDetails: SpotifySongDetails = {
        title: null,
        artist: null,
        album: null,
        image: null,
        duration: null,
        currentTime: null,
        progress: null,
    };

    const titleElement =
        document.querySelector('[data-testid="context-item-info-title"]') ||
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

    const currentTimeElement =
        document.querySelector('[data-testid="playback-position"]') ||
        document.querySelector(".playback-bar__progress-time:first-child");

    const durationElement =
        document.querySelector('[data-testid="playback-duration"]') ||
        document.querySelector('[data-testid="duration-text"]') ||
        document.querySelector(".playback-bar__progress-time:last-child");

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

    if (currentTimeElement) {
        songDetails.currentTime =
            currentTimeElement.textContent?.trim() || (currentTimeElement as HTMLElement).innerText?.trim() || null;
    }

    if (durationElement) {
        songDetails.duration =
            durationElement.textContent?.trim() || (durationElement as HTMLElement).innerText?.trim() || null;
    }

    if (progressElement && progressContainer) {
        const progressWidth = progressElement.offsetWidth;
        const containerWidth = progressContainer.offsetWidth;
        if (containerWidth > 0) {
            songDetails.progress = ((progressWidth / containerWidth) * 100).toFixed(2);
        }
    }

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

function notify() {
    try {
        const details = extractSpotifySongDetails();
        // Check if changed
        if (JSON.stringify(details) !== JSON.stringify(lastDetails)) {
            lastDetails = details;
            chrome.runtime.sendMessage({
                action: 'MEDIA_UPDATE',
                platform: 'spotify',
                details
            }).catch(() => {
                // Ignore connection errors (e.g. extension updated/reloaded)
            });
        }
    } catch (e) {
        console.error("TabTune Error:", e);
    }
}

// Observe DOM
const observer = new MutationObserver(() => {
    // Throttle slightly
    notify();
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
});

// Also poll for time updates
setInterval(notify, 1000);

// Detect URL changes
setInterval(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        notify();
    }
}, 2000);


// Listen for control messages
chrome.runtime.onMessage.addListener((msg: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (msg.action === 'MEDIA_CONTROL') {
        const command = msg.command;
        try {
            if (command === 'playPause') {
                (document.querySelector('[data-testid="control-button-playpause"]') as HTMLElement)?.click();
            } else if (command === 'next') {
                (document.querySelector('[data-testid="control-button-skip-forward"]') as HTMLElement)?.click();
            } else if (command === 'prev') {
                (document.querySelector('[data-testid="control-button-skip-back"]') as HTMLElement)?.click();
            }
            sendResponse({ status: 'ok' });
        } catch (e) {
            console.error("Media control failed", e);
            sendResponse({ status: 'error' });
        }
    }
});

// Initial
notify();
