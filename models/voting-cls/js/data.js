/* ============================================================
   Voting Classifier — 3 models with hard/soft voting
   ============================================================ */
(function () {
    'use strict';
    var seed = 50;
    function rand() { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; }
    function randn() { var u = rand(), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

    var points = [];
    for (var i = 0; i < 20; i++) { points.push({ x: Math.round(Math.max(0.2, Math.min(9.8, 3.5 + randn() * 1.4)) * 100) / 100, y: Math.round(Math.max(0.2, Math.min(9.8, 3.5 + randn() * 1.4)) * 100) / 100, cls: 0 }); }
    for (var i = 0; i < 20; i++) { points.push({ x: Math.round(Math.max(0.2, Math.min(9.8, 6.5 + randn() * 1.4)) * 100) / 100, y: Math.round(Math.max(0.2, Math.min(9.8, 6.5 + randn() * 1.4)) * 100) / 100, cls: 1 }); }

    var models = [
        { name: 'Model A (diagonal)', classify: function (x, y) { return (0.65 * x + 0.55 * y - 6.0) > 0 ? 1 : 0; }, prob: function (x, y) { var s = 0.65 * x + 0.55 * y - 6.0; return 1 / (1 + Math.exp(-s)); } },
        { name: 'Model B (vertical)', classify: function (x, y) { return x > 5.0 ? 1 : 0; }, prob: function (x, y) { var s = 2 * (x - 5.0); return 1 / (1 + Math.exp(-s)); } },
        { name: 'Model C (horizontal)', classify: function (x, y) { return y > 5.0 ? 1 : 0; }, prob: function (x, y) { var s = 2 * (y - 5.0); return 1 / (1 + Math.exp(-s)); } }
    ];

    function hardVote(x, y) {
        var votes = models[0].classify(x, y) + models[1].classify(x, y) + models[2].classify(x, y);
        return votes >= 2 ? 1 : 0;
    }

    function softVote(x, y) {
        var avg = (models[0].prob(x, y) + models[1].prob(x, y) + models[2].prob(x, y)) / 3;
        return avg > 0.5 ? 1 : 0;
    }

    function getBaseClassifyFns() { return models.map(function (m) { return m.classify; }); }

    window.MLZoo = window.MLZoo || {};
    window.MLZoo.modelData = {
        config: { width: 800, height: 400, xDomain: [0, 10], yDomain: [0, 10], accentColor: '#7ee787', xLabel: 'Feature x\u2081', yLabel: 'Feature x\u2082' },
        points: points,
        models: models,
        hardVote: hardVote,
        softVote: softVote,
        classifyFn: hardVote,
        getBaseClassifyFns: getBaseClassifyFns
    };
})();
