
import { useEffect, useState } from 'react';
import type { YouTubeMusicSongDetails } from '../utils/extractors/youtube-music-extractor';

export function useYouTubeMusicDetails(tabId: number) {
    const [details, setDetails] = useState<YouTubeMusicSongDetails | null>(null);

    useEffect(() => {
        const fetchDetails = () => {
            chrome.storage.local.get(`youtubeMusicDetails_${tabId}`, (data: { [key: string]: YouTubeMusicSongDetails }) => {
                if (data[`youtubeMusicDetails_${tabId}`]) {
                    setDetails(data[`youtubeMusicDetails_${tabId}`]);
                }
            });
        };

        fetchDetails();

        const listener = (changes: any, areaName: string) => {
            if (areaName === 'local' && changes[`youtubeMusicDetails_${tabId}`]) {
                setDetails(changes[`youtubeMusicDetails_${tabId}`].newValue);
            }
        };

        chrome.storage.onChanged.addListener(listener);

        return () => {
            chrome.storage.onChanged.removeListener(listener);
        };
    }, [tabId]);

    return details;
}
