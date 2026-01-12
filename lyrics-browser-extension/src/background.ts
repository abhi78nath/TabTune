import { extractSpotifySongDetails } from './utils/extractors/spotify-extractor';
import type { SpotifySongDetails } from './utils/extractors/spotify-extractor';

let lastPlayingTabsHash: string | null = null;
let forceUpdate = false;
// Track recently playing tabs (tabId -> timestamp) to show paused tabs
const recentlyPlayingTabs = new Map<number, number>();
// Track manually removed tabs to prevent them from showing up immediately if they are still audible
const manuallyRemovedTabs = new Set<number>();
// const RECENT_TAB_TIMEOUT = 30000; // Keep paused tabs visible for 30 seconds (Used in original?)

interface MediaTab {
    id: number;
    title: string;
    url?: string;
    windowId: number;
    audible: boolean;
    paused: boolean;
    muted: boolean;
}

function getSpotifySongDetails(tabId: number) {
    chrome.scripting.executeScript(
        {
            target: { tabId: tabId },
            func: extractSpotifySongDetails,
        },
        (results: { result: SpotifySongDetails; }[]) => {
            if (chrome.runtime.lastError) {
                console.error(
                    "Error extracting Spotify details:",
                    chrome.runtime.lastError.message
                );
                return;
            }

            if (results && results[0] && results[0].result) {
                const details = results[0].result as SpotifySongDetails;
                // console.log("🎵 Spotify Song Details:", details);

                // Store song details in chrome.storage with tabId as key
                chrome.storage.local.set({ [`spotifyDetails_${tabId}`]: details });
            }
        }
    );
}

function updateMediaTabs() {
    chrome.tabs.query({}, (tabs: any[]) => {
        const now = Date.now();

        // Update recently playing tabs map - add currently audible tabs
        tabs.forEach(tab => {
            if (tab.audible === true && tab.id) {
                recentlyPlayingTabs.set(tab.id, now);
            }
        });

        // Include tabs that are currently audible OR were recently audible
        // AND are not manually removed
        const playingTabs: MediaTab[] = tabs
            .filter(tab => tab.id && (tab.audible === true || recentlyPlayingTabs.has(tab.id)) && !manuallyRemovedTabs.has(tab.id))
            .map(tab => ({
                id: tab.id!,
                title: tab.title || "Untitled",
                url: tab.url,
                windowId: tab.windowId,
                audible: tab.audible || false,
                paused: !tab.audible && recentlyPlayingTabs.has(tab.id!) || false, // Mark as paused if not audible but recently was
                muted: tab.mutedInfo?.muted || false
            }));

        // Create a simple hash to detect actual changes
        // Include id, muted, audible, paused, title, and url to catch song changes
        const currentHash = JSON.stringify(playingTabs.map(t => ({
            id: t.id,
            muted: t.muted,
            audible: t.audible,
            paused: t.paused,
            title: t.title,
            url: t.url
        })).sort((a, b) => a.id - b.id));

        // Only update if something actually changed (unless forced)
        if (!forceUpdate && currentHash === lastPlayingTabsHash && lastPlayingTabsHash !== null) {
            return; // No changes, skip update (but allow first update)
        }

        lastPlayingTabsHash = currentHash;
        forceUpdate = false; // Reset force flag

        // Check for Spotify tabs and get song details
        playingTabs.forEach(tab => {
            if (tab.url && tab.url.includes('open.spotify.com')) {
                getSpotifySongDetails(tab.id);
            }
        });

        // Optional: store in chrome.storage for popup to read quickly
        chrome.storage.local.set({ playingTabs });

        // You can also send message to popup or side panel if open
        chrome.runtime.sendMessage({
            action: "media-tabs-updated",
            tabs: playingTabs
        }).catch((err: { message: string | string[]; }) => {
            // Silently ignore — popup is probably just closed
            if (err.message && err.message.includes("Receiving end does not exist")) {
                // optional: console.debug("Popup not open, skipping update");
            } else {
                console.error("Unexpected sendMessage error:", err);
            }
        });
    });
}

// Update when something changes
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: any, _tab: any) => {
    // If a tab becomes audible again, remove it from the manual blocklist
    if (changeInfo.audible === true) {
        manuallyRemovedTabs.delete(tabId);
    }

    // Most important fields for us
    if ("audible" in changeInfo || "mutedInfo" in changeInfo || changeInfo.status === "complete") {
        updateMediaTabs();
    }
});

// Also useful when tab becomes active
chrome.tabs.onActivated.addListener(() => {
    updateMediaTabs();
});

// Clean up closed tabs from recently playing map
chrome.tabs.onRemoved.addListener((tabId: number) => {
    recentlyPlayingTabs.delete(tabId);
    manuallyRemovedTabs.delete(tabId);
    updateMediaTabs();
});

// Initial load + when extension is installed/enabled
chrome.runtime.onStartup.addListener(updateMediaTabs);
chrome.runtime.onInstalled.addListener(updateMediaTabs);

// Listen for Spotify details updates and trigger refresh
chrome.storage.onChanged.addListener((changes: {}, areaName: string) => {
    if (areaName === 'local') {
        // Check if any Spotify details were updated
        const spotifyDetailChanged = Object.keys(changes).some(key => key.startsWith('spotifyDetails_'));
        if (spotifyDetailChanged) {
            // Force an update when Spotify details change (ignore hash check)
            forceUpdate = true;
            updateMediaTabs();
        }
    }
});

// Handle manual update requests from popup
chrome.runtime.onMessage.addListener((msg: { action: string; tabId: number; }, _sender: any, _sendResponse: any) => {
    if (msg.action === "request-update") {
        forceUpdate = true;
        updateMediaTabs();
    } else if (msg.action === "remove-media-tab") {
        if (msg.tabId) {
            recentlyPlayingTabs.delete(msg.tabId);
            manuallyRemovedTabs.add(msg.tabId);
            forceUpdate = true;
            updateMediaTabs();
        }
    }
});

// Optional: update every ~5 seconds (the audible flag has a small delay anyway)
// Reduced frequency since we now check for actual changes
setInterval(updateMediaTabs, 5000);
