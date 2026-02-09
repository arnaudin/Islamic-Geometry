export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export class Edge {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
    }

    getPointAt(t) {
        return new Point(
            this.p1.x + (this.p2.x - this.p1.x) * t,
            this.p1.y + (this.p2.y - this.p1.y) * t
        );
    }

    getAngle() {
        return Math.atan2(this.p2.y - this.p1.y, this.p2.x - this.p1.x);
    }

    getLength() {
        return Math.sqrt(Math.pow(this.p2.x - this.p1.x, 2) + Math.pow(this.p2.y - this.p1.y, 2));
    }
}

export class Polygon {
    constructor(vertices) {
        this.vertices = vertices;
        this.edges = [];
        this.center = this.calculateCenter();
        this.createEdges();
    }

    calculateCenter() {
        let x = 0, y = 0;
        this.vertices.forEach(v => {
            x += v.x;
            y += v.y;
        });
        return new Point(x / this.vertices.length, y / this.vertices.length);
    }

    createEdges() {
        this.edges = [];
        for (let i = 0; i < this.vertices.length; i++) {
            const p1 = this.vertices[i];
            const p2 = this.vertices[(i + 1) % this.vertices.length];
            this.edges.push(new Edge(p1, p2));
        }
    }
}

export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.polygons = [];
    }

    createSquareGrid(size) {
        this.polygons = [];
        const cols = Math.ceil(this.width / size) + 1;
        const rows = Math.ceil(this.height / size) + 1;

        // Center the grid
        const xOffset = (this.width - (cols * size)) / 2;
        const yOffset = (this.height - (rows * size)) / 2;

        for (let i = -1; i < cols; i++) {
            for (let j = -1; j < rows; j++) {
                const x = i * size + xOffset;
                const y = j * size + yOffset;
                const vertices = [
                    new Point(x, y),
                    new Point(x + size, y),
                    new Point(x + size, y + size),
                    new Point(x, y + size)
                ];
                this.polygons.push(new Polygon(vertices));
            }
        }
        return this.polygons;
    }

    createHexGrid(size) {
        this.polygons = [];
        const r = size;
        const h = size * Math.sqrt(3); // Width

        const cols = Math.ceil(this.width / h) + 2;
        const rows = Math.ceil(this.height / (size * 1.5)) + 2;

        // Center offsets roughly
        const totalW = cols * h;
        const totalH = rows * size * 1.5;
        const startX = (this.width - totalW) / 2;
        const startY = (this.height - totalH) / 2;

        for (let row = -1; row < rows; row++) {
            for (let col = -1; col < cols; col++) {
                const xOffset = (row % 2 !== 0) ? h / 2 : 0;
                const cx = startX + col * h + xOffset;
                const cy = startY + row * size * 1.5;

                const vertices = [];
                for (let k = 0; k < 6; k++) {
                    const angle_deg = 30 + 60 * k;
                    const angle_rad = Math.PI / 180 * angle_deg;
                    vertices.push(new Point(
                        cx + r * Math.cos(angle_rad),
                        cy + r * Math.sin(angle_rad)
                    ));
                }
                this.polygons.push(new Polygon(vertices));
            }
        }
        return this.polygons;
    }
}

// Helper: Segment-Segment intersection
function getSegmentIntersection(p1, p2, p3, p4) {
    const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y, x4 = p4.x, y4 = p4.y;

    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return null; // Parallel

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        return new Point(
            x1 + ua * (x2 - x1),
            y1 + ua * (y2 - y1)
        );
    }
    return null;
}

// Helper: Line-Line intersection (Infinite lines)
function getIntersection(p1, angle1, p2, angle2) {
    const vx1 = Math.cos(angle1);
    const vy1 = Math.sin(angle1);
    const vx2 = Math.cos(angle2);
    const vy2 = Math.sin(angle2);

    const det = vx1 * vy2 - vy1 * vx2;
    if (Math.abs(det) < 0.00001) return null; // Parallel

    const t = ((p2.x - p1.x) * vy2 - (p2.y - p1.y) * vx2) / det;
    const u = ((p2.x - p1.x) * vy1 - (p2.y - p1.y) * vx1) / det;

    // We only care if it intersects "forward" from the start points
    if (t < 0 || u < 0) return null;

    return new Point(
        p1.x + t * vx1,
        p1.y + t * vy1
    );
}

export class Motif {
    constructor(sides, size) {
        this.sides = sides;
        this.size = size;
        this.segments = []; // The final trimmed/split segments
    }

    compute(contactT, angleDeg) {
        // 1. Generate Raw Hankin Segments for a single centered polygon
        const rawSegments = [];
        const vertices = [];

        // Generate vertices matching the Grid generation logic (centered at 0,0)
        if (this.sides === 4) {
            // Square
            const s = this.size;
            const h = s / 2;
            vertices.push(new Point(-h, -h));
            vertices.push(new Point(h, -h));
            vertices.push(new Point(h, h));
            vertices.push(new Point(-h, h));
        } else {
            // Hexagon
            const r = this.size;
            for (let k = 0; k < 6; k++) {
                const ang = (30 + 60 * k) * (Math.PI / 180);
                vertices.push(new Point(r * Math.cos(ang), r * Math.sin(ang)));
            }
        }

        const angleRad = angleDeg * (Math.PI / 180);
        const len = vertices.length;

        // Generate the V-shapes at each corner
        for (let i = 0; i < len; i++) {
            const currV = vertices[i];
            const prevV = vertices[(i - 1 + len) % len];
            const nextV = vertices[(i + 1) % len];

            const v1 = { x: prevV.x - currV.x, y: prevV.y - currV.y };
            const v2 = { x: nextV.x - currV.x, y: nextV.y - currV.y };

            const c1 = new Point(currV.x + v1.x * contactT, currV.y + v1.y * contactT);
            const c2 = new Point(currV.x + v2.x * contactT, currV.y + v2.y * contactT);

            const ang1 = Math.atan2(v1.y, v1.x);
            const ang2 = Math.atan2(v2.y, v2.x);

            let diff = ang2 - ang1;
            while (diff <= -Math.PI) diff += 2 * Math.PI;
            while (diff > Math.PI) diff -= 2 * Math.PI;

            let r1a, r2a;
            if (diff > 0) {
                r1a = ang1 + angleRad;
                r2a = ang2 - angleRad;
            } else {
                r1a = ang1 - angleRad;
                r2a = ang2 + angleRad;
            }

            const intersect = getIntersection(c1, r1a, c2, r2a);

            if (intersect) {
                // Raw segments. ID base: corner index * 2 (+0 or +1)
                rawSegments.push({ p1: c1, p2: intersect, baseId: i * 2 });
                rawSegments.push({ p1: c2, p2: intersect, baseId: i * 2 + 1 });
            }
        }

        // 2. Trimming Pass: Find Split Points
        const splits = rawSegments.map(() => [0, 1]); // Always include start(0) and end(1)

        for (let i = 0; i < rawSegments.length; i++) {
            for (let j = i + 1; j < rawSegments.length; j++) {
                const s1 = rawSegments[i];
                const s2 = rawSegments[j];

                const p = getSegmentIntersection(s1.p1, s1.p2, s2.p1, s2.p2);
                if (p) {
                    // Calculate T on s1
                    const d1x = s1.p2.x - s1.p1.x;
                    const d1y = s1.p2.y - s1.p1.y;
                    const l1Sq = d1x * d1x + d1y * d1y;
                    let t1 = ((p.x - s1.p1.x) * d1x + (p.y - s1.p1.y) * d1y) / l1Sq;

                    // Calculate T on s2
                    const d2x = s2.p2.x - s2.p1.x;
                    const d2y = s2.p2.y - s2.p1.y;
                    const l2Sq = d2x * d2x + d2y * d2y;
                    let t2 = ((p.x - s2.p1.x) * d2x + (p.y - s2.p1.y) * d2y) / l2Sq;

                    if (t1 > 0.001 && t1 < 0.999) splits[i].push(t1);
                    if (t2 > 0.001 && t2 < 0.999) splits[j].push(t2);
                }
            }
        }

        // 3. Generate Sub-Segments
        this.segments = [];

        rawSegments.forEach((seg, i) => {
            const tVals = [...new Set(splits[i])].sort((a, b) => a - b);

            for (let k = 0; k < tVals.length - 1; k++) {
                const tStart = tVals[k];
                const tEnd = tVals[k + 1];

                const pStart = new Point(
                    seg.p1.x + (seg.p2.x - seg.p1.x) * tStart,
                    seg.p1.y + (seg.p2.y - seg.p1.y) * tStart
                );

                const pEnd = new Point(
                    seg.p1.x + (seg.p2.x - seg.p1.x) * tEnd,
                    seg.p1.y + (seg.p2.y - seg.p1.y) * tEnd
                );

                // Composite ID: BaseID_Index
                const id = `${seg.baseId}_${k}`;

                this.segments.push({
                    p1: pStart,
                    p2: pEnd,
                    id: id
                });
            }
        });
    }
}

export class Pattern {
    constructor(grid) {
        this.grid = grid;
        this.lines = []; // Array of {p1, p2, id, color}
    }

    /**
     * Compute Instanced Pattern
     * @param {number} contactT 
     * @param {number} angleDeg 
     * @param {Object} motifConfig 
     */
    compute(contactT, angleDeg, motifConfig) {
        this.lines = [];
        const hidden = motifConfig && motifConfig.hiddenSegments ? motifConfig.hiddenSegments : new Set();
        const colors = motifConfig && motifConfig.colors ? motifConfig.colors : new Map();

        // Detect Grid Type/Size to create correct Motif
        if (this.grid.polygons.length === 0) return;

        const sides = this.grid.polygons[0].vertices.length;

        // Determine Size (Radius for Hex, Side/1 for Square?)
        const edgeLen = new Edge(this.grid.polygons[0].vertices[0], this.grid.polygons[0].vertices[1]).getLength();
        let size;
        if (sides === 4) {
            size = edgeLen;
        } else {
            size = edgeLen; // For Hex, side length equals radius 
        }

        const motif = new Motif(sides, size);
        motif.compute(contactT, angleDeg);

        // Instance the Motif for every polygon
        this.grid.polygons.forEach(poly => {
            const center = poly.center;

            motif.segments.forEach(seg => {
                if (hidden.has(seg.id)) return;

                // Translate
                const p1 = new Point(seg.p1.x + center.x, seg.p1.y + center.y);
                const p2 = new Point(seg.p2.x + center.x, seg.p2.y + center.y);

                this.lines.push({
                    p1: p1,
                    p2: p2,
                    id: seg.id,
                    color: colors.get(seg.id) || null
                });
            });
        });

        return this.lines;
    }
}
