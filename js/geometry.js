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

// Helper: Line-Line intersection
function getIntersection(p1, angle1, p2, angle2) {
    // p1 + t * v1 = p2 + u * v2
    // v1 = (cos(a1), sin(a1))
    // v2 = (cos(a2), sin(a2))

    // x1 + t*vx1 = x2 + u*vx2
    // y1 + t*vy1 = y2 + u*vy2

    const vx1 = Math.cos(angle1);
    const vy1 = Math.sin(angle1);
    const vx2 = Math.cos(angle2);
    const vy2 = Math.sin(angle2);

    // Solve for t and u
    // t = ((x2-x1)*vy2 - (y2-y1)*vx2) / (vx1*vy2 - vy1*vx2)

    const det = vx1 * vy2 - vy1 * vx2;
    if (Math.abs(det) < 0.00001) return null; // Parallel

    const t = ((p2.x - p1.x) * vy2 - (p2.y - p1.y) * vx2) / det;

    // Check if t is positive? Not necessarily, but for rays yes.
    // If t < 0 it's "behind" the ray start.
    if (t < 0) return null;

    // Check u as well
    // x1 + t*vx1 = x2 + u*vx2 => u = (x1-x2 + t*vx1)/vx2 (if vx2 != 0)
    // Or solve system for u:
    // u = ((x2-x1)*vy1 - (y2-y1)*vx1) / det -- Check this derivation?
    // t * det = ...
    // u * det = (p2-p1) cross v1? No.
    // p1 - p2 = u*v2 - t*v1.
    // Cross with v1: (p1-p2) x v1 = u*(v2 x v1).
    // u = ((p1-p2) x v1) / (v2 x v1) = ((p1-p2) x v1) / (-det).
    // u = ((x1-x2)*vy1 - (y1-y2)*vx1) / (-det).
    // u = -((x1-x2)*vy1 - (y1-y2)*vx1) / det
    // u = ((x2-x1)*vy1 - (y2-y1)*vx1) / det

    const u = ((p2.x - p1.x) * vy1 - (p2.y - p1.y) * vx1) / det;

    if (u < 0) return null;

    return new Point(
        p1.x + t * vx1,
        p1.y + t * vy1
    );
}

export class Pattern {
    constructor(grid) {
        this.grid = grid;
        this.lines = []; // Array of {p1, p2}
    }

    compute(contactT, angleDeg) {
        this.lines = [];
        const angleRad = angleDeg * (Math.PI / 180);

        this.grid.polygons.forEach(poly => {
            const verts = poly.vertices;
            const len = verts.length;

            for (let i = 0; i < len; i++) {
                const currV = verts[i];
                const prevV = verts[(i - 1 + len) % len];
                const nextV = verts[(i + 1) % len];

                // Edge 1: currV -> prevV (Vector pointing AWAYS from corner along edge)
                const v1 = { x: prevV.x - currV.x, y: prevV.y - currV.y };
                const v2 = { x: nextV.x - currV.x, y: nextV.y - currV.y };

                // Contact points
                const c1 = new Point(
                    currV.x + v1.x * contactT,
                    currV.y + v1.y * contactT
                );

                const c2 = new Point(
                    currV.x + v2.x * contactT,
                    currV.y + v2.y * contactT
                );

                // Angles of edges (pointing AWAY from corner)
                const ang1 = Math.atan2(v1.y, v1.x);
                const ang2 = Math.atan2(v2.y, v2.x);

                // Determine direction to turn 'inwards'
                let diff = ang2 - ang1;
                while (diff <= -Math.PI) diff += 2 * Math.PI;
                while (diff > Math.PI) diff -= 2 * Math.PI;

                // If diff > 0, we turn CCW from V1 to V2.
                // So V2 is "Left" of V1.
                // To point "inwards" from V1, we add angle.
                // To point "inwards" from V2, we subtract angle.

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
                    this.lines.push({ p1: c1, p2: intersect });
                    this.lines.push({ p1: c2, p2: intersect });
                }
            }
        });

        return this.lines;
    }
}
