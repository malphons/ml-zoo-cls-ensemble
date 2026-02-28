/* ============================================================
   Gradient Boosting Classifier — Data & Configuration
   2-class 2D data with progressive boosting rounds (1-5).
   Each round adds a correction to the previous ensemble,
   showing how the decision boundary improves sequentially.
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

    /* Class 0 — cluster around (3, 3.5) with some overlap */
    for (i = 0; i < 20; i++) {
        var x0 = 3 + randn() * 1.5;
        var y0 = 3.5 + randn() * 1.5;
        points.push({
            x: Math.round(Math.max(0.1, Math.min(9.9, x0)) * 100) / 100,
            y: Math.round(Math.max(0.1, Math.min(9.9, y0)) * 100) / 100,
            cls: 0
        });
    }

    /* Class 1 — cluster around (7, 6.5) */
    for (i = 0; i < 20; i++) {
        var x1 = 7 + randn() * 1.5;
        var y1 = 6.5 + randn() * 1.5;
        points.push({
            x: Math.round(Math.max(0.1, Math.min(9.9, x1)) * 100) / 100,
            y: Math.round(Math.max(0.1, Math.min(9.9, y1)) * 100) / 100,
            cls: 1
        });
    }

    /* ---------- Boosting round predictions ----------
       Each round refines the boundary. Round 1 is a simple stump,
       subsequent rounds add corrections to handle misclassified regions. */

    var rounds = [
        {
            label: 'Round 1 — Initial stump',
            classify: function (x, y) {
                /* Simple vertical split */
                return x > 5.5 ? 1 : 0;
            }
        },
        {
            label: 'Round 2 — Horizontal correction',
            classify: function (x, y) {
                /* Adds a horizontal component */
                if (x > 5.5) return y > 3.0 ? 1 : 0;
                return 0;
            }
        },
        {
            label: 'Round 3 — Diagonal refinement',
            classify: function (x, y) {
                /* Diagonal boundary */
                var score = 0.6 * (x - 5.0) + 0.4 * (y - 5.0);
                return score > 0 ? 1 : 0;
            }
        },
        {
            label: 'Round 4 — Corner adjustment',
            classify: function (x, y) {
                /* More nuanced boundary */
                var score = 0.55 * (x - 5.0) + 0.45 * (y - 5.0);
                if (x < 3.0 && y > 6.0) return 0;
                if (x > 7.0 && y < 4.0) return 0;
                return score > -0.2 ? 1 : 0;
            }
        },
        {
            label: 'Round 5 — Final ensemble',
            classify: function (x, y) {
                /* Final refined boundary approaching optimal */
                var score = 0.5 * (x - 4.8) + 0.5 * (y - 5.0);
                if (x < 2.5 && y > 6.5) return 0;
                if (x > 7.5 && y < 3.5) return 0;
                if (x < 4.0 && y < 3.0) return 0;
                return score > -0.3 ? 1 : 0;
            }
        }
    ];

    /* ---------- Get classifyFn for a specific number of rounds ---------- */
    function makeClassifyFn(numRounds) {
        var r = Math.min(Math.max(numRounds || 1, 1), rounds.length);
        return rounds[r - 1].classify;
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
        rounds: rounds,
        classifyFn: rounds[rounds.length - 1].classify,
        makeClassifyFn: makeClassifyFn
    };
})();
