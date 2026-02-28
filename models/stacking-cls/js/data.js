/* ============================================================
   Stacking Classifier — 3 base models + meta-learner
   ============================================================ */
(function () {
    'use strict';
    var seed = 44;
    function rand() { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; }
    function randn() { var u = rand(), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

    var points = [];
    for (var i = 0; i < 20; i++) { points.push({ x: Math.round(Math.max(0.2, Math.min(9.8, 3 + randn() * 1.5)) * 100) / 100, y: Math.round(Math.max(0.2, Math.min(9.8, 3.5 + randn() * 1.5)) * 100) / 100, cls: 0 }); }
    for (var i = 0; i < 20; i++) { points.push({ x: Math.round(Math.max(0.2, Math.min(9.8, 7 + randn() * 1.5)) * 100) / 100, y: Math.round(Math.max(0.2, Math.min(9.8, 6.5 + randn() * 1.5)) * 100) / 100, cls: 1 }); }

    /* 3 base model classifiers */
    var baseModels = [
        { name: 'Linear', classify: function (x, y) { return (0.7 * x + 0.5 * y - 6.5) > 0 ? 1 : 0; } },
        { name: 'Vertical', classify: function (x, y) { return x > 5.2 ? 1 : 0; } },
        { name: 'Curved', classify: function (x, y) { var dx = x - 5, dy = y - 5; return (0.5 * dx + 0.3 * dy + 0.05 * dx * dy) > 0 ? 1 : 0; } }
    ];

    /* Meta-learner combines all three */
    function metaClassify(x, y) {
        var votes = baseModels[0].classify(x, y) + baseModels[1].classify(x, y) + baseModels[2].classify(x, y);
        /* Weighted combination favoring the curved model */
        var score = 0.3 * baseModels[0].classify(x, y) + 0.25 * baseModels[1].classify(x, y) + 0.45 * baseModels[2].classify(x, y);
        return score > 0.45 ? 1 : 0;
    }

    function getBaseClassifyFns() { return baseModels.map(function (m) { return m.classify; }); }

    window.MLZoo = window.MLZoo || {};
    window.MLZoo.modelData = {
        config: { width: 800, height: 400, xDomain: [0, 10], yDomain: [0, 10], accentColor: '#7ee787', xLabel: 'Feature x\u2081', yLabel: 'Feature x\u2082' },
        points: points,
        baseModels: baseModels,
        classifyFn: metaClassify,
        getBaseClassifyFns: getBaseClassifyFns
    };
})();
