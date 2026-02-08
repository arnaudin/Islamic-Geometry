export class Renderer {
    constructor() {
    }

    drawGrid(ctx, grid, color) {
        if (!grid || !grid.polygons) return;

        ctx.strokeStyle = color || '#555'; // Construction line color
        ctx.lineWidth = 1;

        grid.polygons.forEach(poly => {
            ctx.beginPath();
            if (poly.vertices.length > 0) {
                ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
                for (let i = 1; i < poly.vertices.length; i++) {
                    ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
                }
                ctx.closePath();
            }
            ctx.stroke();
        });
    }

    drawPattern(ctx, pattern, color) {
        if (!pattern || !pattern.lines) return;

        ctx.strokeStyle = color || '#bb86fc'; // Use passed color or default
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        pattern.lines.forEach(line => {
            ctx.moveTo(line.p1.x, line.p1.y);
            ctx.lineTo(line.p2.x, line.p2.y);
        });
        ctx.stroke();
    }

    generateSVG(pattern, width, height, color) {
        if (!pattern || !pattern.lines) return '';

        const strokeColor = color || 'black';

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
        svg += `  <style>
    .pattern-line { fill: none; stroke: ${strokeColor}; stroke-width: 2px; stroke-linecap: round; stroke-linejoin: round; }
  </style>\n`;

        // Group lines
        svg += `  <g id="pattern">\n`;
        pattern.lines.forEach(line => {
            svg += `    <line x1="${line.p1.x.toFixed(2)}" y1="${line.p1.y.toFixed(2)}" x2="${line.p2.x.toFixed(2)}" y2="${line.p2.y.toFixed(2)}" class="pattern-line" />\n`;
        });
        svg += `  </g>\n`;
        svg += `</svg>`;

        return svg;
    }
}
