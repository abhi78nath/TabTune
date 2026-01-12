import type { MediaTab } from "../hooks/useMediaTabs";
import { MediaItem } from "./MediaItem"

export function MediaList({ tabs }: { tabs: MediaTab[] }) {
    return (
        <ul id="list">
            {tabs.map(tab => (
                <MediaItem key={tab.id} tab={tab} />
            ))}
        </ul>
    );
}
