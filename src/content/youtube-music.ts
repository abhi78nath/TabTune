
import type { YouTubeMusicSongDetails } from '../types';

let lastDetails: YouTubeMusicSongDetails | null = null;
let lastUrl = location.href;

function extractYouTubeMusicSongDetails(): YouTubeMusicSongDetails {
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

    const titleElement = document.querySelector(".content-info-wrapper .title");
    const bylineElement = document.querySelector(".content-info-wrapper .byline");
    const imageElement = document.querySelector(".image.style-scope.ytmusic-player-bar");
    const timeInfoElement = document.querySelector(".time-info.style-scope.ytmusic-player-bar");
    const progressBarElement = document.querySelectorAll("#progress-bar")[0];
    const adBadgeElement = document.querySelector(".badge-style-type-ad-stark.style-scope.ytmusic-player-bar");

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
        const text = timeInfoElement.textContent?.trim() || (timeInfoElement as HTMLElement).innerText?.trim() || "";
        const parts = text.split("/").map(s => s.trim());
        if (parts.length >= 2) {
            songDetails.currentTime = parts[0];
            songDetails.duration = parts[1];
        }
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

    return songDetails;
}

function notify() {
    try {
        const details = extractYouTubeMusicSongDetails();
        if (JSON.stringify(details) !== JSON.stringify(lastDetails)) {
            lastDetails = details;
            chrome.runtime.sendMessage({
                action: 'MEDIA_UPDATE',
                platform: 'youtube-music',
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

const app = document.querySelector("ytmusic-app") || document.body;
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
                (document.querySelector('#play-pause-button') as HTMLElement)?.click();
            } else if (command === 'next') {
                (document.querySelector('.next-button') as HTMLElement)?.click();
            } else if (command === 'prev') {
                (document.querySelector('.previous-button') as HTMLElement)?.click();
            }
            sendResponse({ status: 'ok' });
        } catch (e) {
            console.error("Media control failed", e);
            sendResponse({ status: 'error' });
        }
    }
});

notify();
