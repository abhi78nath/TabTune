
export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface ColorBin extends RGB {
    count: number;
}

/**
 * Extracts the dominant colors from an image element using quantization.
 * @param {HTMLImageElement} imgEl - The image element.
 * @param {number} maxCount - Maximum number of colors to return (default 3).
 * @param {string} sortOrder - 'desc' (most dominant) or 'asc' (least dominant).
 * @returns {Array<{r,g,b}>} - Array of color objects.
 */
export function getDominantColors(imgEl: HTMLImageElement, maxCount: number = 3, sortOrder: 'desc' | 'asc' = 'desc'): RGB[] | null {
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        // Resize to smaller dimensions for performance/clustering
        canvas.width = 50;
        canvas.height = 50;

        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            console.error("Canvas security error:", e);
            return [];
        }
        const data = imageData.data;

        // Store colors in bins (quantization)
        // Reduce 0-255 to 0-31 (step 8) to group similar colors
        const colorBins = new Map<string, ColorBin>();

        for (let i = 0; i < data.length; i += 4) {
            // Skip transparent
            if (data[i + 3] < 128) continue;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Quantize 8-bit to 5-bit (32 levels)
            const binR = r >> 3;
            const binG = g >> 3;
            const binB = b >> 3;

            const key = `${binR},${binG},${binB}`;

            if (!colorBins.has(key)) {
                colorBins.set(key, { count: 0, r: 0, g: 0, b: 0 });
            }

            const bin = colorBins.get(key)!;
            bin.count++;
            bin.r += r;
            bin.g += g;
            bin.b += b;
        }

        // Convert map to array and compute averages
        let sortedBins = Array.from(colorBins.values())
            .map(bin => ({
                r: Math.floor(bin.r / bin.count),
                g: Math.floor(bin.g / bin.count),
                b: Math.floor(bin.b / bin.count),
                count: bin.count
            }));

        // Sort based on requested order
        if (sortOrder === 'asc') {
            // Filter out absolute noise (e.g. single pixels) if we are looking for least dominant
            // to avoid artifacts, but keep it simple for now as per request.
            // Actually, let's just sort.
            sortedBins.sort((a, b) => a.count - b.count);
        } else {
            sortedBins.sort((a, b) => b.count - a.count);
        }

        // Select distinct colors
        const result: RGB[] = [];
        const minDistance = 30; // Minimum Euclidean distance to be considered distinct

        for (const bin of sortedBins) {
            if (result.length >= maxCount) break;

            let isDistinct = true;
            for (const existing of result) {
                if (colorDistance(bin, existing) < minDistance) {
                    isDistinct = false;
                    break;
                }
            }

            if (isDistinct) {
                result.push({ r: bin.r, g: bin.g, b: bin.b });
            }
        }

        return result.length > 0 ? result : null;
    } catch (e) {
        console.error("Error extracting colors:", e);
        return null;
    }
}

// Keep alias for backward compatibility or simple usage
export function getDominantColor(imgEl: HTMLImageElement): RGB | null {
    const colors = getDominantColors(imgEl, 1);
    return colors ? colors[0] : null;
}

/**
 * Calculates Euclidean distance between two colors.
 */
function colorDistance(c1: RGB, c2: RGB): number {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

/**
 * Calculates a contrasting text color (black or white) for a given background color.
 */
export function getContrastingTextColor(r: number, g: number, b: number): string {
    // YIQ equation
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

/**
 * Returns a semi-transparent version of the contrasting color for secondary text.
 */
export function getSecondaryTextColor(r: number, g: number, b: number): string {
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
}
