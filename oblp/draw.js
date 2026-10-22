/**
 * draw.js — Square-1 face renderer, stripped down for the OBL trainer.
 * SAC2 style, no side colors, horizontal layout only.
 *
 * Exports: getSVG, setPieceColor, resetPiecesColors
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const CORNER_HEX_VALUES = ['1', '3', '5', '7', '9', 'b', 'd', 'f'];

// Base color palette — non-OBL pieces resolve their color name through here
const COLORS = {
    top:    '#4d4d4d',
    bottom: '#FFFFFF',
    border: '#000000',
};

const LAYER_SCALE = 0.93;       // SAC2 withoutSideColor
const SLICE_SCALE = 1.968 * 1.38 / 0.93;   // relScale passed to slice arrow

// ── Piece color state ─────────────────────────────────────────────────────────

function defaultPieceColors() {
    return {
        edgeColors: {
            '0': { inner: 'top'    },
            '2': { inner: 'top'    },
            '4': { inner: 'top'    },
            '6': { inner: 'top'    },
            '8': { inner: 'bottom' },
            'a': { inner: 'bottom' },
            'c': { inner: 'bottom' },
            'e': { inner: 'bottom' },
        },
        cornerColors: {
            '1': { top: 'top'    },
            '3': { top: 'top'    },
            '5': { top: 'top'    },
            '7': { top: 'top'    },
            '9': { top: 'bottom' },
            'b': { top: 'bottom' },
            'd': { top: 'bottom' },
            'f': { top: 'bottom' },
        },
        // default slice color: visible mid-gray
        sliceColors: { top: '#888888', bottom: '#888888' },
    };
}

let edgeColors, cornerColors, sliceColors;

export function resetPiecesColors() {
    ({ edgeColors, cornerColors, sliceColors } = defaultPieceColors());
}
resetPiecesColors();

// ── Color resolution ──────────────────────────────────────────────────────────

// Hex string → pass through; color name → look up in COLORS
function resolveColor(val) {
    return val.charAt(0) === '#' ? val : (COLORS[val] ?? val);
}

// ── Piece color API ───────────────────────────────────────────────────────────

/**
 * Set the color of a single sticker.
 * id format: '<pieceHex> <sticker>'
 *   corners: '1 top', '9 top', etc.
 *   edges:   '0 inner', '8 inner', etc.
 *   slice:   'slice top', 'slice bottom'
 */
export function setPieceColor(id, color) {
    const [piece, sticker] = id.split(' ');
    if (!sticker) throw new Error(`piece id "${id}" is not valid.`);
    if (piece === 'slice') {
        sliceColors = { ...sliceColors, [sticker]: color };
    } else if (parseInt(piece, 16) % 2 === 0) {
        edgeColors = { ...edgeColors, [piece]: { ...edgeColors[piece], [sticker]: color } };
    } else {
        cornerColors = { ...cornerColors, [piece]: { ...cornerColors[piece], [sticker]: color } };
    }
}

// ── SAC2 withoutSideColor — draw functions ────────────────────────────────────

function drawEdge(piece, size) {
    const innerColor = resolveColor(edgeColors[piece].inner);
    const scale = 54 / 27 * (size / 220) * 1.38;
    const ox = (50.0 / 100) * 27;
    const oy = (117.0 / 100) * 42.61;
    const tx = -ox * scale, ty = -oy * scale;
    const sw = (size * 0.004).toFixed(2);
    return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
        <path fill="${COLORS.border}" d="M3.05,15.11l6.57,24.52c1.07,3.98,6.71,3.98,7.77,0l6.57-24.52c.56-2.1-1.02-4.17-3.2-4.17H6.24c-2.18,0-3.76,2.07-3.2,4.17Z"/>
        <path id="${piece} inner" fill="${innerColor}" d="M19.67,13.14H7.34c-1.28,0-2.22,1.22-1.88,2.45l6.17,23.01c.52,1.93,3.25,1.93,3.77,0l6.17-23.01c.33-1.24-.6-2.45-1.88-2.45Z" stroke="${COLORS.border}" stroke-width="${sw}"/>
    </g>`;
}

function drawCorner(piece, size) {
    const topColor = resolveColor(cornerColors[piece].top);
    const scale = 96 / 48.5 * (size / 220) * 1.38;
    const ox = (-3.5 / 100) * 48.5;
    const oy = (103.5 / 100) * 48.5;
    const tx = -ox * scale, ty = -oy * scale;

    return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)}) rotate(-45,${ox.toFixed(2)},${oy.toFixed(2)})">
                <path
                    fill="${COLORS.border}"
                    fill-rule="evenodd"
                    d="M7.26,13.39L.25,39.56c-1.41,5.28,3.42,10.11,8.7,8.7l26.16-7.01c1.45-.39,2.45-1.7,2.45-3.2V14.25c0-1.83-1.48-3.31-3.31-3.31H10.46c-1.5,0-2.81,1.01-3.2,2.45ZM33.92,39.28c.85-.23,1.45-1,1.45-1.88V15.09c0-1.08-.87-1.95-1.95-1.95H11.1c-.88,0-1.66.59-1.88,1.45l-7,26.12c-.91,3.39,2.19,6.49,5.58,5.58l26.12-7Z"
                />

                <path
                    class="sticker"
                    id="${piece} top"
                    fill="${topColor}"
                    d="M33.92,39.28c.85-.23,1.45-1,1.45-1.88V15.09c0-1.08-.87-1.95-1.95-1.95H11.1c-.88,0-1.66.59-1.88,1.45l-7,26.12c-.91,3.39,2.19,6.49,5.58,5.58l26.12-7Z"
                />
            </g>`;
}

function drawSlice(layer, cx, cy, size) {
    const scale = (size / 220) * SLICE_SCALE;
    const color = layer === 'top' ? resolveColor(sliceColors.top) : resolveColor(sliceColors.bottom);
    const angle = layer === 'top' ? 0 : -30;
    const tx = (cx + 29.5 / 220 * size).toFixed(2);
    const ty = (cy - 114 / 220 * size).toFixed(2);
    const arrowPath = `<path d="M7.32.86C6.69.13,5.72-.16,4.79.09c-.48.13-.91.4-1.23.77L.61,4.26C-.03,5.01-.18,6.03.23,6.92c.41.9,1.28,1.45,2.26,1.45h5.9c.22,0,.44-.03.65-.08.83-.22,1.47-.85,1.73-1.67.25-.82.07-1.7-.5-2.35L7.32.86Z"/>
        <path fill="${color}" d="M6.18,1.84c-.26-.3-.65-.4-1-.31-.18.05-.35.15-.49.31l-2.95,3.41c-.55.64-.1,1.63.74,1.63h5.9c.09,0,.18-.01.26-.03.67-.18.97-1.03.48-1.59l-2.95-3.41Z"/>`;
    const transform = `rotate(%ROT%, ${cx}, ${cy}) translate(${tx}, ${ty}) scale(${scale.toFixed(4)}) translate(5.43, 4.19) rotate(-165)`;
    return `<g transform="${transform.replace('%ROT%', angle)}">${arrowPath}</g>` +
           `<g transform="${transform.replace('%ROT%', angle + 180)}">${arrowPath}</g>`;
}

// ── Hex parsing & layer rendering ─────────────────────────────────────────────

function parseHex(rawHex) {
    const hex = rawHex.replace(/[|/]/, '');
    function parseLayer(chars) {
        const tokens = [];
        let slotPos = 1, i = 0;
        while (i < chars.length) {
            const ch = chars[i].toLowerCase();
            if (CORNER_HEX_VALUES.includes(ch)) {
                tokens.push({ piece: ch, type: 'corner', position: slotPos });
                slotPos += 2; i += 2;
            } else {
                tokens.push({ piece: ch, type: 'edge', position: slotPos });
                slotPos += 1; i += 1;
            }
        }
        return tokens;
    }
    return { top: parseLayer(hex.slice(0, 12)), bottom: parseLayer(hex.slice(12, 24)) };
}

function slotCentreAngle(pos, span) {
    return (pos - 1) * 30 + (span * 30) / 2;
}

function drawLayer(tokens, isBottom, cx, cy, size) {
    const layerOffset = isBottom ? -195 : 15;
    let svg = '';
    for (const token of tokens) {
        const span  = token.type === 'corner' ? 2 : 1;
        const angle = -slotCentreAngle(token.position, span) + layerOffset;
        const inner = token.type === 'edge'
            ? drawEdge(token.piece, size)
            : drawCorner(token.piece, size);
        svg += `<g transform="translate(${cx},${cy}) rotate(${angle.toFixed(2)})">${inner}</g>`;
    }
    // apply layerScale
    return `<g transform="translate(${cx},${cy}) scale(${LAYER_SCALE}) translate(${-cx},${-cy})">${svg}</g>`;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Render two Square-1 faces (top + bottom) side by side as an HTML string.
 *
 * @param {string} rawHex     24-char piece hex, e.g. '011233455677998bbaddcffe'
 * @param {number} size       Logical size passed in (scaled internally by 220/400)
 * @param {number} ringDistance  Gap between the two face SVGs (pixels at scale)
 * @param {boolean} showSlice   Whether to draw the slice indicator arrows
 * @param {boolean} topOnly     Whether to only generate one layer
 * @returns {string}          HTML string: a flex div containing two <svg> elements
 */
export function getSVG(rawHex, size = 400, ringDistance = 5, showSlice = true, topOnly = false) {
    const hex = rawHex.replace(/[|/]/, '');
    if (hex.length !== 24) throw new Error('Hex must be 24 data characters.');

    const parsed = parseHex(rawHex);

    size = size * (220 / 400);
    const cx = size / 2, cy = size / 2;

    const topApexY = cy - (123.5 / 220) * size;
    const padTop   = Math.max(0, Math.ceil(-topApexY + (122 / 220) * size * 0.05));
    const vbX = 0, vbY = -padTop;
    const vbW = size, vbH = size + padTop;

    const svgAttrs = `width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" class="squan"`;

    let html = `<div style="display:flex;align-items:center;overflow:visible;padding:4px 0;">`;

    html += `<svg style="overflow:visible;" ${svgAttrs}>`;
    if (showSlice) html += drawSlice('top', cx, cy, size);
    html += drawLayer(parsed.top, false, cx, cy, size);
    html += `</svg>`;

    if (!topOnly) {
        html += `<svg style="overflow:visible;margin-left:1rem;" ${svgAttrs}>`;
        if (showSlice) html += drawSlice('bottom', cx, cy, size);
        html += drawLayer(parsed.bottom, true, cx, cy, size);
        html += `</svg>`;
    }
    html += `</div>`;

    return html;
}
