
import { useEffect, useState, type SetStateAction } from 'react';
import type { SpotifySongDetails } from '../utils/extractors/spotify-extractor';

export function useSpotifyDetails(tabId: number) {
    const [details, setDetails] = useState<SpotifySongDetails | null>(null);

    useEffect(() => {
        const fetchDetails = () => {
            chrome.storage.local.get(`spotifyDetails_${tabId}`, (data: { [x: string]: SetStateAction<SpotifySongDetails | null>; }) => {
                if (data[`spotifyDetails_${tabId}`]) {
                    setDetails(data[`spotifyDetails_${tabId}`]);
                }
            });
        };

        fetchDetails();

        const listener = (changes: any, areaName: string) => {
            if (areaName === 'local' && changes[`spotifyDetails_${tabId}`]) {
                setDetails(changes[`spotifyDetails_${tabId}`].newValue);
            }
        };

        chrome.storage.onChanged.addListener(listener);

        return () => {
            chrome.storage.onChanged.removeListener(listener);
        };
    }, [tabId]);

    return details;
}
