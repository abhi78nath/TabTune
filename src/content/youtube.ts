
import type { YouTubeSongDetails } from '../types';

let lastDetails: YouTubeSongDetails | null = null;
let lastUrl = location.href;

function extractYouTubeSongDetails(): YouTubeSongDetails {
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

    const titleElement = document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
        document.querySelector("h1.style-scope.ytd-watch-metadata") ||
        document.querySelector(".ytd-video-primary-info-renderer.title");

    const channelElement = document.querySelector("#owner #channel-name a") ||
        document.querySelector("ytd-video-owner-renderer #channel-name yt-formatted-string");

    const timeCurrentElement = document.querySelector(".ytp-time-current");
    const timeDurationElement = document.querySelector(".ytp-time-duration");
    const progressBarElement = document.querySelector(".ytp-progress-bar");

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

    if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
        const metadata = navigator.mediaSession.metadata;
        if (!songDetails.title) songDetails.title = metadata.title;
        if (!songDetails.artist) songDetails.artist = metadata.artist;
        if (!songDetails.album) songDetails.album = metadata.album;

        if (!songDetails.image && metadata.artwork && metadata.artwork.length > 0) {
            const artwork = [...metadata.artwork].sort((a, b) => {
                const widthA = parseInt(a.sizes?.split('x')[0] || "0");
                const widthB = parseInt(b.sizes?.split('x')[0] || "0");
                return widthB - widthA;
            })[0];
            songDetails.image = artwork.src;
        }
    }

    // Fallback image extraction
    if (!songDetails.image) {
        // Try to get thumbnail from DOM link element
        const thumbLink = document.querySelector('link[itemprop="thumbnailUrl"]');
        if (thumbLink) {
            songDetails.image = thumbLink.getAttribute("href");
        }
    }

    if (!songDetails.image) {
        // Try og:image meta tag
        const metaImage = document.querySelector('meta[property="og:image"]');
        if (metaImage) {
            songDetails.image = metaImage.getAttribute("content");
        }
    }

    if (!songDetails.image) {
        // Construct from video ID in URL as a last resort
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v');
        if (videoId) {
            songDetails.image = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }
    }

    return songDetails;
}

function notify() {
    try {
        const details = extractYouTubeSongDetails();
        // Check if changed
        if (JSON.stringify(details) !== JSON.stringify(lastDetails)) {
            lastDetails = details;
            chrome.runtime.sendMessage({
                action: 'MEDIA_UPDATE',
                platform: 'youtube', // Distinguish from music.youtube in background if needed
                details
            }).catch(() => { });
        }
    } catch (e) {
        console.error("TabTune Error:", e);
    }
}

const observer = new MutationObserver(() => {
    notify();
});

// Observe common container
const app = document.querySelector("ytd-app") || document.body;
observer.observe(app, {
    childList: true,
    subtree: true,
    attributes: true
});

setInterval(notify, 1000);

setInterval(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        notify();
    }
}, 2000);

chrome.runtime.onMessage.addListener((msg: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (msg.action === 'MEDIA_CONTROL') {
        const command = msg.command;
        try {
            if (command === 'playPause') {
                const video = document.querySelector('video');
                if (video) {
                    if (video.paused) video.play(); else video.pause();
                }
            } else if (command === 'next') {
                (document.querySelector('.ytp-next-button') as HTMLElement)?.click();
            } else if (command === 'prev') {
                (document.querySelector('.ytp-prev-button') as HTMLElement)?.click(); // Standard youtube often doesn't have prev button in player, but let's try
                // Or history back? No.
            }
            sendResponse({ status: 'ok' });
        } catch (e) {
            console.error("Media control failed", e);
            sendResponse({ status: 'error' });
        }
    }
});

notify();
