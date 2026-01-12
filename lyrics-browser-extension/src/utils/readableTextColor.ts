export type RGBColor = {
    r: number;
    g: number;
    b: number;
};

const MIN_CONTRAST = 4.5;

/**
 * Relative luminance according to WCAG
 */
function luminance({ r, g, b }: RGBColor): number {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928
            ? v / 12.92
            : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Contrast ratio between two colors
 */
function contrast(c1: RGBColor, c2: RGBColor): number {
    const L1 = luminance(c1);
    const L2 = luminance(c2);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

function clamp(v: number): number {
    return Math.max(0, Math.min(255, v));
}

function adjust(c: RGBColor, amt: number): RGBColor {
    return {
        r: clamp(c.r + amt),
        g: clamp(c.g + amt),
        b: clamp(c.b + amt)
    };
}

/**
 * Returns a readable text color for a given background.
 * Tries palette colors first, then auto-adjusts, then falls back.
 */
export function getReadableTextColor(
    bg: RGBColor,
    candidates: RGBColor[] = []
): string {
    const bgLum = luminance(bg);

    // 1️⃣ Try palette colors directly
    for (const c of candidates) {
        if (contrast(bg, c) >= MIN_CONTRAST) {
            return `rgb(${c.r}, ${c.g}, ${c.b})`;
        }
    }

    // 2️⃣ Try auto-adjusting palette colors
    for (const base of candidates) {
        let c = { ...base };
        for (let i = 0; i < 25; i++) {
            c = adjust(c, bgLum > 0.5 ? -10 : 10);
            if (contrast(bg, c) >= MIN_CONTRAST) {
                return `rgb(${c.r}, ${c.g}, ${c.b})`;
            }
        }
    }

    // 3️⃣ Hard fallback
    return bgLum > 0.5 ? "#000" : "#fff";
}
