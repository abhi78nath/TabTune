export type RGBColor = {
    r: number;
    g: number;
    b: number;
};

/**
 * Calculates Euclidean distance between two colors.
 */
function colorDistance(c1: RGBColor, c2: RGBColor): number {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

/**
 * Extract dominant colors from an image using canvas quantization.
 * Safe to use in React (no DOM mutations outside canvas).
 */
export function getDominantColors(
    imgEl: HTMLImageElement,
    maxCount = 3,
    sortOrder: "asc" | "desc" = "desc"
): RGBColor[] | null {
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        canvas.width = 50;
        canvas.height = 50;

        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

        let imageData: ImageData;
        try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            console.error("Canvas security error:", e);
            return null;
        }

        const data = imageData.data;
        const colorBins = new Map<
            string,
            { count: number; r: number; g: number; b: number }
        >();

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const key = `${r >> 3},${g >> 3},${b >> 3}`;

            if (!colorBins.has(key)) {
                colorBins.set(key, { count: 0, r: 0, g: 0, b: 0 });
            }

            const bin = colorBins.get(key)!;
            bin.count++;
            bin.r += r;
            bin.g += g;
            bin.b += b;
        }

        let bins = Array.from(colorBins.values()).map(bin => ({
            r: Math.floor(bin.r / bin.count),
            g: Math.floor(bin.g / bin.count),
            b: Math.floor(bin.b / bin.count),
            count: bin.count
        }));

        bins.sort((a, b) =>
            sortOrder === "asc" ? a.count - b.count : b.count - a.count
        );

        const result: RGBColor[] = [];
        const minDistance = 30;

        for (const bin of bins) {
            if (result.length >= maxCount) break;

            if (
                result.every(existing => colorDistance(bin, existing) >= minDistance)
            ) {
                result.push({ r: bin.r, g: bin.g, b: bin.b });
            }
        }

        return result.length ? result : null;
    } catch (e) {
        console.error("Error extracting colors:", e);
        return null;
    }
}

/**
 * Shortcut for single dominant color.
 */
export function getDominantColor(
    imgEl: HTMLImageElement
): RGBColor | null {
    const colors = getDominantColors(imgEl, 1);
    return colors?.[0] ?? null;
}

/**
 * Returns readable text color (black / white).
 */
export function getContrastingTextColor(
    r: number,
    g: number,
    b: number
): "#000000" | "#ffffff" {
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#ffffff";
}

/**
 * Returns secondary text color with opacity.
 */
export function getSecondaryTextColor(
    r: number,
    g: number,
    b: number
): "rgba(0, 0, 0, 0.7)" | "rgba(255, 255, 255, 0.7)" {
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128
        ? "rgba(0, 0, 0, 0.7)"
        : "rgba(255, 255, 255, 0.7)";
}
