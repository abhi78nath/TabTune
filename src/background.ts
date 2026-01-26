
let lastPlayingTabsHash: string | null = null;
let forceUpdate = false;
// Track recently playing tabs (tabId -> timestamp)
const recentlyPlayingTabs = new Map<number, number>();
const manuallyRemovedTabs = new Set<number>();

interface MediaTab {
    id: number;
    title: string;
    url?: string;
    windowId: number;
    audible: boolean;
    paused: boolean;
    muted: boolean;
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

        const playingTabs: MediaTab[] = tabs
            .filter(tab => tab.id && (tab.audible === true || recentlyPlayingTabs.has(tab.id)) && !manuallyRemovedTabs.has(tab.id))
            .map(tab => ({
                id: tab.id!,
                title: tab.title || "Untitled",
                url: tab.url,
                windowId: tab.windowId,
                audible: tab.audible || false,
                paused: !tab.audible && recentlyPlayingTabs.has(tab.id!) || false,
                muted: tab.mutedInfo?.muted || false
            }));

        const currentHash = JSON.stringify(playingTabs.map(t => ({
            id: t.id,
            muted: t.muted,
            audible: t.audible,
            paused: t.paused,
            title: t.title,
            url: t.url
        })).sort((a, b) => a.id - b.id));

        if (!forceUpdate && currentHash === lastPlayingTabsHash && lastPlayingTabsHash !== null) {
            return;
        }

        lastPlayingTabsHash = currentHash;
        forceUpdate = false;

        chrome.storage.local.set({ playingTabs });

        chrome.runtime.sendMessage({
            action: "media-tabs-updated",
            tabs: playingTabs
        }).catch((_err: any) => {
            // Popup closed
        });
    });
}

// Listen for updates from content scripts
chrome.runtime.onMessage.addListener((msg: any, sender: chrome.runtime.MessageSender, _sendResponse: (response?: any) => void) => {
    if (msg.action === 'MEDIA_UPDATE' && sender.tab?.id) {
        const tabId = sender.tab.id;
        const details = msg.details;
        const platform = msg.platform; // 'spotify', 'youtube', 'youtube-music'

        let key = '';
        if (platform === 'spotify') key = `spotifyDetails_${tabId}`;
        else if (platform === 'youtube') key = `youtubeDetails_${tabId}`;
        else if (platform === 'youtube-music') key = `youtubeMusicDetails_${tabId}`;

        if (key) {
            chrome.storage.local.set({ [key]: details });
            // Force update to refresh UI if needed (e.g. title changed)
            forceUpdate = true;
            updateMediaTabs();
        }
    } else if (msg.action === "request-update") {
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

chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: any, _tab: any) => {
    if (changeInfo.audible === true) {
        manuallyRemovedTabs.delete(tabId);
    }
    if ("audible" in changeInfo || "mutedInfo" in changeInfo || changeInfo.status === "complete") {
        updateMediaTabs();
    }
});

chrome.tabs.onActivated.addListener(() => {
    updateMediaTabs();
});

chrome.tabs.onRemoved.addListener((tabId: number) => {
    recentlyPlayingTabs.delete(tabId);
    manuallyRemovedTabs.delete(tabId);
    updateMediaTabs();

    // Clean up storage
    chrome.storage.local.remove([
        `spotifyDetails_${tabId}`,
        `youtubeDetails_${tabId}`,
        `youtubeMusicDetails_${tabId}`
    ]);
});

chrome.runtime.onStartup.addListener(updateMediaTabs);
chrome.runtime.onInstalled.addListener(updateMediaTabs);

// Backup poll strictly for audible status changes that might be missed? 
// Not strictly necessary if onUpdated works well, but keep a slow poll just in case
setInterval(updateMediaTabs, 10000);
