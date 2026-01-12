import { useEffect, useState } from "react";

export type MediaTab = {
    id: number;
    title: string;
    url?: string;
    windowId: number;
    audible: boolean;
    paused: boolean;
    muted: boolean;
};

export function useMediaTabs() {
    const [tabs, setTabs] = useState<MediaTab[]>([]);

    useEffect(() => {
        chrome.storage.local.get("playingTabs", (data: { playingTabs: any; }) => {
            setTabs(data.playingTabs || []);
        });

        const listener = (msg: any) => {
            if (msg.action === "media-tabs-updated") {
                setTabs(msg.tabs);
            }
        };

        chrome.runtime.onMessage.addListener(listener);

        // force refresh when popup opens
        chrome.runtime.sendMessage({ action: "request-update" });

        return () => {
            chrome.runtime.onMessage.removeListener(listener);
        };
    }, []);

    return tabs;
}
