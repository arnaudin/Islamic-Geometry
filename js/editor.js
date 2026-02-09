
import { Grid, Pattern, Point } from './geometry.js';
import { Renderer } from './renderer.js';

export class TileEditor {
    constructor(canvas, onUpdate) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onUpdate = onUpdate; // Callback when motif changes

        this.width = canvas.width;
        this.height = canvas.height;

        // Single tile grid/pattern
        this.grid = new Grid(this.width, this.height);
        this.pattern = new Pattern(this.grid);
        this.renderer = new Renderer();

        // State
        this.params = {
            gridType: 'hex',
            contactT: 0.25,
            angle: 75
        };

        this.motifConfig = {
            hiddenSegments: new Set(),
            colors: new Map()
        };

        this.attachListeners();
    }

    setParams(params, motifConfig) {
        this.params = { ...params };
        // Deep copy motif config
        this.motifConfig = {
            hiddenSegments: new Set(motifConfig.hiddenSegments),
            colors: new Map(motifConfig.colors)
        };
        this.updateGeometry();
    }

    updateGeometry() {
        // Create a single large polygon centered in the canvas
        this.grid.polygons = [];
        const cx = this.width / 2;
        const cy = this.height / 2;

        // Scale size to fit canvas
        const size = Math.min(this.width, this.height) * 0.35;

        if (this.params.gridType === 'square') {
            const vertices = [
                { x: cx - size, y: cy - size },
                { x: cx + size, y: cy - size },
                { x: cx + size, y: cy + size },
                { x: cx - size, y: cy + size }
            ];
            this.grid.polygons.push({ vertices, center: { x: cx, y: cy } }); // Duck typing Polygon
        } else {
            // Hexagon
            const vertices = [];
            for (let k = 0; k < 6; k++) {
                const angle_deg = 30 + 60 * k;
                const angle_rad = Math.PI / 180 * angle_deg;
                vertices.push({
                    x: cx + size * Math.cos(angle_rad),
                    y: cy + size * Math.sin(angle_rad)
                });
            }
            this.grid.polygons.push({ vertices, center: { x: cx, y: cy } });
        }

        // We compute WITHOUT hiding segments first to detect hits on "hidden" segments (ghosts)
        // Actually, better to compute normally and draw "ghosts" in render step if we track them.
        // For simplicity, let's just compute standard pattern for hit testing.

        // Wait, if we pass motifConfig to compute, it removes lines. We want to see ghost lines to re-enable them.
        // So we compute full lines for editor interaction, but render them differently.
        this.fullPattern = new Pattern(this.grid);
        this.fullPattern.compute(this.params.contactT, this.params.angle); // No config = full lines

        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Polygon Outline (Grid)
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        this.grid.polygons.forEach(poly => {
            this.ctx.beginPath();
            this.ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
            poly.vertices.forEach(v => this.ctx.lineTo(v.x, v.y));
            this.ctx.closePath();
            this.ctx.stroke();
        });

        // Draw Segments
        this.fullPattern.lines.forEach(line => {
            const isHidden = this.motifConfig.hiddenSegments.has(line.id);
            const customColor = this.motifConfig.colors.get(line.id);

            this.ctx.beginPath();
            this.ctx.moveTo(line.p1.x, line.p1.y);
            this.ctx.lineTo(line.p2.x, line.p2.y);

            if (isHidden) {
                this.ctx.strokeStyle = '#333'; // Ghost
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([5, 5]);
            } else {
                this.ctx.strokeStyle = customColor || '#bb86fc';
                this.ctx.lineWidth = 4; // Thicker for editor
                this.ctx.setLineDash([]);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Optional: Draw ID or handle for debugging
            /*
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px sans-serif';
            this.ctx.fillText(line.id, (line.p1.x + line.p2.x)/2, (line.p1.y + line.p2.y)/2);
            */
        });
    }

    attachListeners() {
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.width / rect.width);
            const y = (e.clientY - rect.top) * (this.height / rect.height);

            const hit = this.findHit(x, y);
            if (hit) {
                if (e.button === 0) {
                    // Left click: Toggle Visibility
                    if (this.motifConfig.hiddenSegments.has(hit.id)) {
                        this.motifConfig.hiddenSegments.delete(hit.id);
                    } else {
                        this.motifConfig.hiddenSegments.add(hit.id);
                    }
                } else if (e.button === 2) {
                    // Right click: Cycle Color (Simple implementation)
                    // Let's cycle: Default -> Red -> Green -> Blue -> Default
                    const colors = [null, '#ff5252', '#69f0ae', '#448aff', '#e040fb'];
                    const curr = this.motifConfig.colors.get(hit.id);
                    let nextIdx = 0;
                    if (curr) {
                        const idx = colors.indexOf(curr);
                        nextIdx = (idx + 1) % colors.length;
                    } else {
                        nextIdx = 1;
                    }

                    const nextColor = colors[nextIdx];
                    if (nextColor) {
                        this.motifConfig.colors.set(hit.id, nextColor);
                    } else {
                        this.motifConfig.colors.delete(hit.id);
                    }
                }

                this.render();
                this.onUpdate(this.motifConfig);
            }
        });

        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    findHit(x, y) {
        // Simple distance check to line segment
        const threshold = 10;

        for (const line of this.fullPattern.lines) {
            const dist = this.distToSegment({ x, y }, line.p1, line.p2);
            if (dist < threshold) {
                return line;
            }
        }
        return null;
    }

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }
}
