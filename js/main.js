import { Renderer } from './renderer.js';
import { Grid, Pattern } from './geometry.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const gridTypeSelect = document.getElementById('gridType');
    const tileCountInput = document.getElementById('tileCount');
    const tileCountVal = document.getElementById('tileCountVal');
    const contactPointInput = document.getElementById('contactPoint');
    const contactPointVal = document.getElementById('contactPointVal');
    const crossingAngleInput = document.getElementById('crossingAngle');
    const crossingAngleVal = document.getElementById('crossingAngleVal');
    const showConstructionCheck = document.getElementById('showConstruction');
    const patternColorInput = document.getElementById('patternColor');
    const constructionColorInput = document.getElementById('constructionColor');
    const downloadBtn = document.getElementById('downloadBtn');

    // Instantiate classes
    const renderer = new Renderer();
    const grid = new Grid(800, 800);
    const pattern = new Pattern(grid);

    // State
    let state = {
        gridType: gridTypeSelect.value,
        tileCount: parseInt(tileCountInput.value),
        contactT: parseFloat(contactPointInput.value),
        angle: parseInt(crossingAngleInput.value),
        showConstruction: showConstructionCheck.checked,
        patternColor: patternColorInput.value,
        constructionColor: constructionColorInput.value,
        width: 800,
        height: 800,
        gridSize: 100 // Tweakable
    };

    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        const size = Math.min(container.clientWidth, container.clientHeight) - 40;

        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';

        ctx.scale(dpr, dpr);

        state.width = size;
        state.height = size;

        // Update Grid size based on canvas size
        grid.width = size;
        grid.height = size;

        // Adjust grid cell size based on grid type and canvas
        state.gridSize = size / state.tileCount;

        updateGeometry();
    }

    window.addEventListener('resize', resizeCanvas);

    // Initial resize calls render
    // But we need to define updateGeometry first

    function updateGeometry() {
        // Regenerate Grid
        if (state.gridType === 'square') {
            grid.createSquareGrid(state.gridSize);
        } else if (state.gridType === 'hex') {
            grid.createHexGrid(state.gridSize);
        }

        // Compute Pattern
        pattern.compute(state.contactT, state.angle);

        render();
    }

    function render() {
        // Clear background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, state.width, state.height);

        // Draw Construction Lines
        if (state.showConstruction) {
            renderer.drawGrid(ctx, grid, state.constructionColor);
        }

        // Draw Pattern
        renderer.drawPattern(ctx, pattern, state.patternColor);
    }

    // Event Listeners
    gridTypeSelect.addEventListener('change', (e) => {
        state.gridType = e.target.value;
        state.gridSize = state.width / state.tileCount;
        updateGeometry();
    });

    tileCountInput.addEventListener('input', (e) => {
        state.tileCount = parseInt(e.target.value);
        tileCountVal.textContent = state.tileCount;
        state.gridSize = state.width / state.tileCount;
        updateGeometry();
    });

    contactPointInput.addEventListener('input', (e) => {
        state.contactT = parseFloat(e.target.value);
        contactPointVal.textContent = state.contactT.toFixed(2);
        updateGeometry();
    });

    crossingAngleInput.addEventListener('input', (e) => {
        state.angle = parseInt(e.target.value);
        crossingAngleVal.textContent = state.angle + '°';
        updateGeometry();
    });

    showConstructionCheck.addEventListener('change', (e) => {
        state.showConstruction = e.target.checked;
        render(); // No need to recompute geometry
    });

    patternColorInput.addEventListener('input', (e) => {
        state.patternColor = e.target.value;
        render();
    });

    constructionColorInput.addEventListener('input', (e) => {
        state.constructionColor = e.target.value;
        render();
    });

    downloadBtn.addEventListener('click', () => {
        const svgContent = renderer.generateSVG(pattern, state.width, state.height, state.patternColor);
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `islamic-pattern-${state.gridType}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Boot up
    resizeCanvas();
});
