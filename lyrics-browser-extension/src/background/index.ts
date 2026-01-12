import { getSpotifySongDetails } from "../shared/extractors/spotify";


type MediaTab = {
    id: number;
    title: string;
    url?: string;
    windowId: number;
    audible: boolean;
    paused: boolean;
    muted: boolean;
};

let lastPlayingTabsHash: string | null = null;
let forceUpdate = false;

// Track recently playing tabs
const recentlyPlayingTabs = new Map<number, number>();
const manuallyRemovedTabs = new Set<number>();

const RECENT_TAB_TIMEOUT = 30_000;

function updateMediaTabs() {
    chrome.tabs.query({}, (tabs: any[]) => {
        const now = Date.now();

        // Update recently playing tabs
        tabs.forEach((tab) => {
            if (tab.audible === true && tab.id !== undefined) {
                recentlyPlayingTabs.set(tab.id, now);
            }
        });

        // Cleanup expired paused tabs
        for (const [tabId, timestamp] of recentlyPlayingTabs.entries()) {
            if (now - timestamp > RECENT_TAB_TIMEOUT) {
                recentlyPlayingTabs.delete(tabId);
            }
        }

        const playingTabs: MediaTab[] = tabs
            .filter(
                (tab) =>
                    tab.id !== undefined &&
                    (tab.audible === true || recentlyPlayingTabs.has(tab.id)) &&
                    !manuallyRemovedTabs.has(tab.id)
            )
            .map((tab) => ({
                id: tab.id!,
                title: tab.title || "Untitled",
                url: tab.url,
                windowId: tab.windowId!,
                audible: Boolean(tab.audible),
                paused: !tab.audible && recentlyPlayingTabs.has(tab.id!),
                muted: tab.mutedInfo?.muted ?? false
            }));

        const currentHash = JSON.stringify(
            playingTabs
                .map((t) => ({
                    id: t.id,
                    muted: t.muted,
                    audible: t.audible,
                    paused: t.paused,
                    title: t.title,
                    url: t.url
                }))
                .sort((a, b) => a.id - b.id)
        );

        if (!forceUpdate && currentHash === lastPlayingTabsHash && lastPlayingTabsHash !== null) {
            return;
        }

        lastPlayingTabsHash = currentHash;
        forceUpdate = false;

        // Spotify enrichment
        playingTabs.forEach((tab) => {
            if (tab.url?.includes("open.spotify.com")) {
                getSpotifySongDetails(tab.id);
            }
        });

        chrome.storage.local.set({ playingTabs });

        chrome.runtime.sendMessage({
            action: "media-tabs-updated",
            tabs: playingTabs
        }).catch((err: { message: string | string[]; }) => {
            if (!err?.message?.includes("Receiving end does not exist")) {
                console.error("sendMessage error:", err);
            }
        });
    });
}

/* ------------------ Event listeners ------------------ */

chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: any) => {
    if (changeInfo.audible === true) {
        manuallyRemovedTabs.delete(tabId);
    }

    if (
        "audible" in changeInfo ||
        "mutedInfo" in changeInfo ||
        changeInfo.status === "complete"
    ) {
        updateMediaTabs();
    }
});

chrome.tabs.onActivated.addListener(updateMediaTabs);

chrome.tabs.onRemoved.addListener((tabId: number) => {
    recentlyPlayingTabs.delete(tabId);
    manuallyRemovedTabs.delete(tabId);
    updateMediaTabs();
});

chrome.runtime.onStartup.addListener(updateMediaTabs);
chrome.runtime.onInstalled.addListener(updateMediaTabs);

chrome.storage.onChanged.addListener((changes: {}, areaName: string) => {
    if (areaName !== "local") return;

    const spotifyDetailChanged = Object.keys(changes).some((key) =>
        key.startsWith("spotifyDetails_")
    );

    if (spotifyDetailChanged) {
        forceUpdate = true;
        updateMediaTabs();
    }
});

chrome.runtime.onMessage.addListener((msg: { action: string; tabId: number; }) => {
    if (msg?.action === "request-update") {
        forceUpdate = true;
        updateMediaTabs();
    }

    if (msg?.action === "remove-media-tab" && typeof msg.tabId === "number") {
        recentlyPlayingTabs.delete(msg.tabId);
        manuallyRemovedTabs.add(msg.tabId);
        forceUpdate = true;
        updateMediaTabs();
    }
});

// Optional polling
setInterval(updateMediaTabs, 5000);
