/* ============================================================
   Bagging Classifier — Data & Configuration
   2-class 2D data with 5 individual base model boundaries
   (each trained on a bootstrap sample) and an ensemble
   boundary produced by majority voting.
   ============================================================ */
(function () {
    'use strict';

    /* ---------- Seeded PRNG ---------- */
    var seed = 42;
    function rand() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    }
    function randn() {
        var u = rand(), v = rand();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    /* ---------- Generate 40 points, 2 classes ---------- */
    var points = [];
    var i;

    /* Class 0 — cluster around (3, 3) */
    for (i = 0; i < 20; i++) {
        var x0 = 3 + randn() * 1.4;
        var y0 = 3 + randn() * 1.4;
        points.push({
            x: Math.round(Math.max(0.1, Math.min(9.9, x0)) * 100) / 100,
            y: Math.round(Math.max(0.1, Math.min(9.9, y0)) * 100) / 100,
            cls: 0
        });
    }

    /* Class 1 — cluster around (7, 7) */
    for (i = 0; i < 20; i++) {
        var x1 = 7 + randn() * 1.4;
        var y1 = 7 + randn() * 1.4;
        points.push({
            x: Math.round(Math.max(0.1, Math.min(9.9, x1)) * 100) / 100,
            y: Math.round(Math.max(0.1, Math.min(9.9, y1)) * 100) / 100,
            cls: 1
        });
    }

    /* ---------- Bootstrap sample indicators for each base model ---------- */
    /* Each model uses ~63% of the data (bootstrap with replacement) */
    var bootstrapSamples = [];
    for (var b = 0; b < 5; b++) {
        var sample = [];
        var seedB = 100 + b * 37;
        for (var s = 0; s < points.length; s++) {
            seedB = (seedB * 16807 + 0) % 2147483647;
            var idx = Math.floor(((seedB - 1) / 2147483646) * points.length);
            sample.push(idx);
        }
        bootstrapSamples.push(sample);
    }

    /* ---------- 5 individual base model boundaries ---------- */
    /* Each simulates a decision tree trained on a different bootstrap sample,
       producing slightly different axis-aligned boundaries */
    var baseModels = [
        {
            label: 'Base 1',
            classify: function (x, y) {
                if (x + y < 9.8) return 0;
                return 1;
            }
        },
        {
            label: 'Base 2',
            classify: function (x, y) {
                if (x < 5.0) return y < 6.5 ? 0 : (x > 3.5 ? 1 : 0);
                return y < 4.5 ? 0 : 1;
            }
        },
        {
            label: 'Base 3',
            classify: function (x, y) {
                if (y < 5.2) return x < 6.5 ? 0 : 1;
                return x < 4.0 ? 0 : 1;
            }
        },
        {
            label: 'Base 4',
            classify: function (x, y) {
                if (x + y < 10.5) return 0;
                return 1;
            }
        },
        {
            label: 'Base 5',
            classify: function (x, y) {
                if (x < 4.8) return 0;
                if (x > 5.8) return y < 4.0 ? 0 : 1;
                return y < 5.0 ? 0 : 1;
            }
        }
    ];

    /* ---------- Ensemble: majority vote ---------- */
    function ensembleClassify(x, y, numModels) {
        var n = numModels || baseModels.length;
        var votes = [0, 0];
        for (var t = 0; t < n; t++) {
            votes[baseModels[t].classify(x, y)]++;
        }
        return votes[1] > votes[0] ? 1 : 0;
    }

    function makeClassifyFn(numModels) {
        return function (x, y) {
            return ensembleClassify(x, y, numModels);
        };
    }

    function getBaseClassifyFns(numModels) {
        var fns = [];
        var n = numModels || baseModels.length;
        for (var i = 0; i < n; i++) {
            fns.push(baseModels[i].classify);
        }
        return fns;
    }

    /* ---------- Export ---------- */
    window.MLZoo = window.MLZoo || {};
    window.MLZoo.modelData = {
        config: {
            width: 800,
            height: 400,
            xDomain: [0, 10],
            yDomain: [0, 10],
            accentColor: '#7ee787',
            xLabel: 'Feature x\u2081',
            yLabel: 'Feature x\u2082'
        },
        points: points,
        baseModels: baseModels,
        bootstrapSamples: bootstrapSamples,
        classifyFn: function (x, y) { return ensembleClassify(x, y, 5); },
        makeClassifyFn: makeClassifyFn,
        getBaseClassifyFns: getBaseClassifyFns,
        ensembleClassify: ensembleClassify
    };
})();
