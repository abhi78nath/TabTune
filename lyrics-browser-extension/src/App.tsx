import { useMediaTabs } from "./hooks/useMediaTabs";
import { MediaList } from "./components/MediaList";

export default function App() {
  const tabs = useMediaTabs();

  if (tabs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <div className="empty-text">
          <h3>No Media Playing</h3>
          <p>Play music on Spotify, or YouTube to get started.</p>
        </div>
      </div>
    );
  }

  return <MediaList tabs={tabs} />;
}
