
import { useEffect, useState } from "react";

interface ProgressBarProps {
    duration: string; // e.g., "3:45"
    currentTime: string | null; // e.g. "1:20"
    progress: string | null; // e.g. "45.5" (percentage)
    isPlaying: boolean;
    style?: React.CSSProperties;
}

// Helper function to parse time string (e.g., "3:45") to seconds
function parseTimeToSeconds(timeStr: string | null): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
}

// Helper function to format seconds to time string (e.g., "3:45")
function formatTime(seconds: number): string {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ProgressBar({ duration, currentTime, progress, isPlaying, style }: ProgressBarProps) {
    const totalSeconds = parseTimeToSeconds(duration);

    // Calculate initial current seconds
    let initialSeconds = 0;
    if (currentTime) {
        initialSeconds = parseTimeToSeconds(currentTime);
    } else if (progress) {
        initialSeconds = Math.floor((parseFloat(progress) / 100) * totalSeconds);
    }

    const [currentSeconds, setCurrentSeconds] = useState(initialSeconds);

    // Sync state when props change
    useEffect(() => {
        let newSeconds = 0;
        if (currentTime) {
            newSeconds = parseTimeToSeconds(currentTime);
        } else if (progress) {
            newSeconds = Math.floor((parseFloat(progress) / 100) * totalSeconds);
        }
        setCurrentSeconds(newSeconds);
    }, [currentTime, progress, totalSeconds]);

    // Live update simulation
    useEffect(() => {
        if (!isPlaying || totalSeconds === 0) return;

        const interval = setInterval(() => {
            setCurrentSeconds(prev => {
                if (prev >= totalSeconds) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying, totalSeconds]);

    const progressPercent = totalSeconds > 0 ? (currentSeconds / totalSeconds) * 100 : 0;
    const currentTimeDisplay = formatTime(currentSeconds);

    return (
        <div className="progress-container">
            <span className="progress-time-current" style={style}>{currentTimeDisplay}</span>
            <div className="progress-bar-wrapper">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${progressPercent}%`, backgroundColor: style?.color, ...style }}
                ></div>
            </div>
            <span className="progress-time-total" style={style}>{duration}</span>
        </div>
    );
}
