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

        const defaultColor = color || '#00bcd4';

        // Optimize: Group by color if performance issues, but simple loop is fine for now
        pattern.lines.forEach(line => {
            ctx.strokeStyle = line.color || defaultColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(line.p1.x, line.p1.y);
            ctx.lineTo(line.p2.x, line.p2.y);
            ctx.stroke();
        });
    }

    generateSVG(pattern, width, height, color) {
        if (!pattern || !pattern.lines) return '';

        const strokeColor = color || '#00bcd4';

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
        // Background
        svg += `  <rect width="100%" height="100%" fill="#1a1a1a" />\n`;

        pattern.lines.forEach(line => {
            const lineColor = line.color || strokeColor;
            svg += `  <line x1="${line.p1.x.toFixed(2)}" y1="${line.p1.y.toFixed(2)}" x2="${line.p2.x.toFixed(2)}" y2="${line.p2.y.toFixed(2)}" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" />\n`;
        });
        svg += `</svg>`;

        return svg;
    }
}
