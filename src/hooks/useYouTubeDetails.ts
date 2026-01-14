
import { useEffect, useState } from 'react';
import type { YouTubeSongDetails } from '../utils/extractors/youtube-extractor';

export function useYouTubeDetails(tabId: number) {
    const [details, setDetails] = useState<YouTubeSongDetails | null>(null);

    useEffect(() => {
        const fetchDetails = () => {
            chrome.storage.local.get(`youtubeDetails_${tabId}`, (data: { [key: string]: YouTubeSongDetails }) => {
                if (data[`youtubeDetails_${tabId}`]) {
                    setDetails(data[`youtubeDetails_${tabId}`]);
                }
            });
        };

        fetchDetails();

        const listener = (changes: any, areaName: string) => {
            if (areaName === 'local' && changes[`youtubeDetails_${tabId}`]) {
                setDetails(changes[`youtubeDetails_${tabId}`].newValue);
            }
        };

        chrome.storage.onChanged.addListener(listener);

        return () => {
            chrome.storage.onChanged.removeListener(listener);
        };
    }, [tabId]);

    return details;
}
