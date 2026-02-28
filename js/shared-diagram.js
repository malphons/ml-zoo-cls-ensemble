/* ============================================================
   ML Zoo — Shared 2D Classification Diagram for Ensemble Models
   Shows a 2D feature space with decision boundaries, colored
   regions, multiple model overlays, ensemble flow diagrams,
   and voting visualizations.
   ============================================================ */
(function () {
    'use strict';

    var svg, g, width, height, xScale, yScale, zoom;
    var config = {};
    var margin = { top: 20, right: 30, bottom: 45, left: 55 };

    var CLASS_COLORS = ['#58a6ff', '#f85149', '#3fb950', '#d29922'];

    function init(containerSelector, cfg) {
        config = cfg || {};
        var container = document.querySelector(containerSelector);
        if (!container) return;

        width  = config.width  || container.clientWidth || 800;
        height = config.height || 400;

        svg = d3.select(containerSelector)
            .append('svg')
            .attr('viewBox', '0 0 ' + width + ' ' + height)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('max-height', height + 'px');

        svg.append('defs')
            .append('clipPath')
            .attr('id', 'plot-clip')
            .append('rect')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom);

        g = svg.append('g').attr('clip-path', 'url(#plot-clip)');

        var xDomain = config.xDomain || [0, 10];
        var yDomain = config.yDomain || [0, 10];

        xScale = d3.scaleLinear().domain(xDomain).range([margin.left, width - margin.right]);
        yScale = d3.scaleLinear().domain(yDomain).range([height - margin.bottom, margin.top]);

        /* Grid */
        var xGrid = svg.append('g')
            .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(d3.axisBottom(xScale).ticks(8).tickSize(-(height - margin.top - margin.bottom)).tickFormat(''));
        xGrid.attr('opacity', 0.08).select('.domain').remove();

        var yGrid = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',0)')
            .call(d3.axisLeft(yScale).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(''));
        yGrid.attr('opacity', 0.08).select('.domain').remove();

        var axisColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#6e7681';

        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(d3.axisBottom(xScale).ticks(8))
            .selectAll('text,line,path').attr('stroke', axisColor).attr('fill', axisColor);

        svg.append('g')
            .attr('class', 'y-axis')
            .attr('transform', 'translate(' + margin.left + ',0)')
            .call(d3.axisLeft(yScale).ticks(6))
            .selectAll('text,line,path').attr('stroke', axisColor).attr('fill', axisColor);

        if (config.xLabel) {
            svg.append('text').attr('x', width / 2).attr('y', height - 5)
                .attr('text-anchor', 'middle').attr('fill', axisColor).attr('font-size', '12px')
                .text(config.xLabel);
        }
        if (config.yLabel) {
            svg.append('text').attr('x', -height / 2).attr('y', 15)
                .attr('transform', 'rotate(-90)').attr('text-anchor', 'middle')
                .attr('fill', axisColor).attr('font-size', '12px').text(config.yLabel);
        }

        zoom = d3.zoom().scaleExtent([0.5, 5])
            .on('zoom', function (event) { g.attr('transform', event.transform); });
        svg.call(zoom);
    }

    /* ---------- Draw classification points ---------- */

    function drawPoints(points, opts) {
        opts = opts || {};
        var radius = opts.radius || 5;

        g.selectAll('.data-point').remove();

        var pts = g.selectAll('.data-point')
            .data(points)
            .enter()
            .append('circle')
            .attr('class', 'data-point')
            .attr('cx', function (d) { return xScale(d.x); })
            .attr('cy', function (d) { return yScale(d.y); })
            .attr('r', 0)
            .attr('fill', function (d) { return CLASS_COLORS[d.cls || 0]; })
            .attr('opacity', 0.8)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);

        pts.transition().duration(400).delay(function (d, i) { return i * 20; })
            .attr('r', radius);

        pts.on('mouseover', function (event, d) {
                d3.select(this).attr('r', radius + 3).attr('opacity', 1);
                showTooltip(event, d);
            })
            .on('mouseout', function () {
                d3.select(this).attr('r', radius).attr('opacity', 0.8);
                hideTooltip();
            });
    }

    /* ---------- Draw decision regions (heatmap) ---------- */

    function drawRegions(classifyFn, opts) {
        opts = opts || {};
        g.selectAll('.region-cell').remove();

        var xd = config.xDomain || [0, 10];
        var yd = config.yDomain || [0, 10];
        var res = opts.resolution || 40;
        var dx = (xd[1] - xd[0]) / res;
        var dy = (yd[1] - yd[0]) / res;
        var cellW = (width - margin.left - margin.right) / res;
        var cellH = (height - margin.top - margin.bottom) / res;

        var cells = [];
        for (var i = 0; i < res; i++) {
            for (var j = 0; j < res; j++) {
                var cx = xd[0] + (i + 0.5) * dx;
                var cy = yd[0] + (j + 0.5) * dy;
                cells.push({ x: cx, y: cy, cls: classifyFn(cx, cy), i: i, j: j });
            }
        }

        g.selectAll('.region-cell')
            .data(cells)
            .enter()
            .append('rect')
            .attr('class', 'region-cell')
            .attr('x', function (d) { return margin.left + d.i * cellW; })
            .attr('y', function (d) { return margin.top + (res - 1 - d.j) * cellH; })
            .attr('width', cellW + 0.5)
            .attr('height', cellH + 0.5)
            .attr('fill', function (d) { return CLASS_COLORS[d.cls || 0]; })
            .attr('opacity', 0)
            .transition()
            .duration(300)
            .attr('opacity', opts.opacity || 0.12);
    }

    /* ---------- Draw multiple overlaid regions from base models ---------- */

    function drawMultipleRegions(classifyFns, opts) {
        opts = opts || {};
        g.selectAll('.multi-region-cell').remove();

        var xd = config.xDomain || [0, 10];
        var yd = config.yDomain || [0, 10];
        var res = opts.resolution || 30;
        var dx = (xd[1] - xd[0]) / res;
        var dy = (yd[1] - yd[0]) / res;
        var cellW = (width - margin.left - margin.right) / res;
        var cellH = (height - margin.top - margin.bottom) / res;
        var modelColors = opts.modelColors || ['#e3b341', '#f0883e', '#a371f7', '#3fb950', '#f85149'];
        var perModelOpacity = opts.opacity || (0.08 / Math.max(classifyFns.length, 1));

        classifyFns.forEach(function (fn, mIdx) {
            var cells = [];
            for (var i = 0; i < res; i++) {
                for (var j = 0; j < res; j++) {
                    var cx = xd[0] + (i + 0.5) * dx;
                    var cy = yd[0] + (j + 0.5) * dy;
                    cells.push({ x: cx, y: cy, cls: fn(cx, cy), i: i, j: j });
                }
            }

            g.selectAll('.multi-region-cell-' + mIdx)
                .data(cells)
                .enter()
                .append('rect')
                .attr('class', 'multi-region-cell multi-region-cell-' + mIdx)
                .attr('x', function (d) { return margin.left + d.i * cellW; })
                .attr('y', function (d) { return margin.top + (res - 1 - d.j) * cellH; })
                .attr('width', cellW + 0.5)
                .attr('height', cellH + 0.5)
                .attr('fill', function (d) { return CLASS_COLORS[d.cls || 0]; })
                .attr('opacity', 0)
                .attr('stroke', function (d) { return modelColors[mIdx % modelColors.length]; })
                .attr('stroke-width', 0)
                .transition()
                .duration(300)
                .attr('opacity', perModelOpacity);
        });
    }

    /* ---------- Draw ensemble flow diagram ---------- */

    function drawEnsembleFlow(containerSelector, opts) {
        opts = opts || {};
        var fw = opts.width || 700;
        var fh = opts.height || 180;
        var numModels = opts.numModels || 3;
        var modelLabels = opts.modelLabels || [];
        var combinationLabel = opts.combinationLabel || 'Ensemble';
        var accentColor = opts.accentColor || '#7ee787';

        var flowSvg = d3.select(containerSelector)
            .append('svg')
            .attr('viewBox', '0 0 ' + fw + ' ' + fh)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('max-height', fh + 'px');

        var axisCol = getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#6e7681';
        var textCol = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#8b949e';

        /* Input box */
        flowSvg.append('rect')
            .attr('x', 10).attr('y', fh / 2 - 20)
            .attr('width', 80).attr('height', 40)
            .attr('rx', 6).attr('fill', 'none')
            .attr('stroke', axisCol).attr('stroke-width', 1.5);
        flowSvg.append('text')
            .attr('x', 50).attr('y', fh / 2 + 5)
            .attr('text-anchor', 'middle').attr('fill', textCol).attr('font-size', '11px')
            .text('Input Data');

        /* Base model boxes */
        var modelStartX = 160;
        var modelWidth = 100;
        var modelSpacing = (fh - 30) / numModels;
        var modelCenters = [];

        for (var m = 0; m < numModels; m++) {
            var my = 15 + m * modelSpacing + modelSpacing / 2;
            modelCenters.push(my);

            /* Arrow from input to model */
            flowSvg.append('line')
                .attr('x1', 90).attr('y1', fh / 2)
                .attr('x2', modelStartX).attr('y2', my)
                .attr('stroke', axisCol).attr('stroke-width', 1)
                .attr('marker-end', 'url(#flow-arrow)');

            /* Model box */
            flowSvg.append('rect')
                .attr('x', modelStartX).attr('y', my - 16)
                .attr('width', modelWidth).attr('height', 32)
                .attr('rx', 6).attr('fill', 'none')
                .attr('stroke', accentColor).attr('stroke-width', 1.5);

            flowSvg.append('text')
                .attr('x', modelStartX + modelWidth / 2).attr('y', my + 4)
                .attr('text-anchor', 'middle').attr('fill', textCol).attr('font-size', '10px')
                .text(modelLabels[m] || ('Model ' + (m + 1)));
        }

        /* Combination box */
        var combX = modelStartX + modelWidth + 80;
        flowSvg.append('rect')
            .attr('x', combX).attr('y', fh / 2 - 22)
            .attr('width', 120).attr('height', 44)
            .attr('rx', 8).attr('fill', 'rgba(126,231,135,0.1)')
            .attr('stroke', accentColor).attr('stroke-width', 2);

        flowSvg.append('text')
            .attr('x', combX + 60).attr('y', fh / 2 + 5)
            .attr('text-anchor', 'middle').attr('fill', accentColor).attr('font-size', '11px')
            .attr('font-weight', '600')
            .text(combinationLabel);

        /* Arrows from models to combination */
        for (var m2 = 0; m2 < numModels; m2++) {
            flowSvg.append('line')
                .attr('x1', modelStartX + modelWidth).attr('y1', modelCenters[m2])
                .attr('x2', combX).attr('y2', fh / 2)
                .attr('stroke', axisCol).attr('stroke-width', 1)
                .attr('marker-end', 'url(#flow-arrow)');
        }

        /* Output box */
        var outX = combX + 150;
        flowSvg.append('line')
            .attr('x1', combX + 120).attr('y1', fh / 2)
            .attr('x2', outX).attr('y2', fh / 2)
            .attr('stroke', axisCol).attr('stroke-width', 1)
            .attr('marker-end', 'url(#flow-arrow)');

        flowSvg.append('rect')
            .attr('x', outX).attr('y', fh / 2 - 20)
            .attr('width', 80).attr('height', 40)
            .attr('rx', 6).attr('fill', 'none')
            .attr('stroke', axisCol).attr('stroke-width', 1.5);

        flowSvg.append('text')
            .attr('x', outX + 40).attr('y', fh / 2 + 5)
            .attr('text-anchor', 'middle').attr('fill', textCol).attr('font-size', '11px')
            .text('Prediction');

        /* Arrow marker */
        flowSvg.append('defs').append('marker')
            .attr('id', 'flow-arrow')
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 9).attr('refY', 5)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto-start-reverse')
            .append('path')
            .attr('d', 'M 0 0 L 10 5 L 0 10 z')
            .attr('fill', axisCol);
    }

    /* ---------- Draw voting diagram ---------- */

    function drawVotingDiagram(containerSelector, opts) {
        opts = opts || {};
        var vw = opts.width || 600;
        var vh = opts.height || 160;
        var votes = opts.votes || [];        /* [{label, cls, prob}] */
        var finalCls = opts.finalCls || 0;
        var votingType = opts.votingType || 'hard';
        var accentColor = opts.accentColor || '#7ee787';

        var voteSvg = d3.select(containerSelector)
            .append('svg')
            .attr('viewBox', '0 0 ' + vw + ' ' + vh)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('max-height', vh + 'px');

        var textCol = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#8b949e';
        var axisCol = getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#6e7681';

        var numVotes = votes.length;
        var boxW = 100;
        var spacing = (vw - 140) / Math.max(numVotes, 1);
        var startX = 20;

        /* Individual model vote boxes */
        for (var v = 0; v < numVotes; v++) {
            var bx = startX + v * spacing;
            var color = CLASS_COLORS[votes[v].cls || 0];

            voteSvg.append('rect')
                .attr('x', bx).attr('y', 10)
                .attr('width', boxW).attr('height', 55)
                .attr('rx', 6).attr('fill', 'none')
                .attr('stroke', color).attr('stroke-width', 1.5);

            voteSvg.append('text')
                .attr('x', bx + boxW / 2).attr('y', 30)
                .attr('text-anchor', 'middle').attr('fill', textCol).attr('font-size', '10px')
                .text(votes[v].label || ('Model ' + (v + 1)));

            var voteLabel = votingType === 'soft'
                ? 'P=' + (votes[v].prob !== undefined ? votes[v].prob.toFixed(2) : '?')
                : 'Class ' + votes[v].cls;

            voteSvg.append('text')
                .attr('x', bx + boxW / 2).attr('y', 50)
                .attr('text-anchor', 'middle').attr('fill', color).attr('font-size', '11px')
                .attr('font-weight', '600')
                .text(voteLabel);

            /* Arrow down */
            voteSvg.append('line')
                .attr('x1', bx + boxW / 2).attr('y1', 65)
                .attr('x2', vw / 2).attr('y2', 95)
                .attr('stroke', axisCol).attr('stroke-width', 1);
        }

        /* Final decision */
        voteSvg.append('rect')
            .attr('x', vw / 2 - 70).attr('y', 95)
            .attr('width', 140).attr('height', 44)
            .attr('rx', 8).attr('fill', 'rgba(126,231,135,0.1)')
            .attr('stroke', accentColor).attr('stroke-width', 2);

        var finalLabel = votingType === 'soft' ? 'Avg Prob \u2192 Class ' + finalCls : 'Majority \u2192 Class ' + finalCls;
        voteSvg.append('text')
            .attr('x', vw / 2).attr('y', 122)
            .attr('text-anchor', 'middle').attr('fill', accentColor).attr('font-size', '11px')
            .attr('font-weight', '600')
            .text(finalLabel);
    }

    /* ---------- Tooltip ---------- */

    var tooltipEl = null;

    function showTooltip(event, d) {
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.style.cssText = 'position:fixed;padding:6px 10px;background:rgba(0,0,0,.85);' +
                'color:#fff;font-size:12px;border-radius:4px;pointer-events:none;z-index:999;';
            document.body.appendChild(tooltipEl);
        }
        var label = d.label || ('Class ' + (d.cls || 0));
        tooltipEl.textContent = '(' + d.x.toFixed(2) + ', ' + d.y.toFixed(2) + ') \u2014 ' + label;
        tooltipEl.style.left = event.clientX + 12 + 'px';
        tooltipEl.style.top = event.clientY - 28 + 'px';
        tooltipEl.style.display = 'block';
    }

    function hideTooltip() {
        if (tooltipEl) tooltipEl.style.display = 'none';
    }

    /* ---------- Clear & reset ---------- */

    function clear() {
        if (g) g.selectAll('.data-point,.region-cell,.multi-region-cell,.split-line').remove();
        if (g) g.selectAll('[class*="multi-region-cell-"]').remove();
    }

    function resetZoom() {
        if (svg && zoom) svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    }

    /* ---------- Public API ---------- */

    window.MLZoo = window.MLZoo || {};
    window.MLZoo.diagram = {
        init: init,
        drawPoints: drawPoints,
        drawRegions: drawRegions,
        drawMultipleRegions: drawMultipleRegions,
        drawEnsembleFlow: drawEnsembleFlow,
        drawVotingDiagram: drawVotingDiagram,
        clear: clear,
        resetZoom: resetZoom,
        CLASS_COLORS: CLASS_COLORS,
        getScales: function () { return { x: xScale, y: yScale }; },
        getGroup: function () { return g; },
        getSvg: function () { return svg; }
    };
})();
