window.currentXMin = null;
window.currentXMax = null;
window.chartHasEvents = false;

window.drawChart = function() {

    let axis = "x-axis-1";

    let mouseEventDebounce = 100; // ms

    function setLayout() {
        let headingHeight = Math.ceil($("#heading").height());
        let chartHeight = (nodeChartLines.length*15);
        let linesHeight = window.innerHeight - headingHeight - chartHeight - 2;
        let w = (window.innerWidth - 20) + "px";
        let timelineTop = (window.innerHeight - chartHeight) + "px";
        //$("#lines").css("height", linesHeight + "px");
        $("#canvas").css("height", chartHeight + "px");
        $("#chart").css("height", chartHeight + "px");
        $("#lines").css("width", w);
        $("#lines").css("margin-top", headingHeight);
        $("#lines").css("margin-bottom", chartHeight);
        $("#canvas").css("width", w);
        $("#chart").css("width", w);
        $("#chart").removeClass("hidden");
        $("#timeline").css("height", chartHeight);
    }

    function showDuration() {
        let scale = chart.scales[axis];
        let min = scale.options.min;
        let max = scale.options.max;
        let d = max - min;
        let prettyD = d;
        let u = "seconds";
        if (d > 60) {
            prettyD = d / (60);
            u = "minutes";
        }
        if (d > 60*60) {
            prettyD = d / (60*60);
            u = "hours";
        }
        if (d > 24*60*60) {
            prettyD = d / (24*60*60);
            u = "days";
        }
        if (d < 1) {
            prettyD = d * 1000;
            u = "milliseconds";
        }
        if (d < 0.001) {
            prettyD = d * 1000000;
            u = "microseconds";
        }
        let t = "Chart zoomed to " + prettyD.toFixed(1) + " " + u;
        $(".duration").text(t);
    }

    let positionTimeout = null;
    function showPosition(e) {
        if (positionTimeout != null) {
            clearTimeout(positionTimeout);
        }
        positionTimeout = setTimeout(function() {
            calcPositionLine(e);
        }, mouseEventDebounce);
    }

    function calcPositionLine(e) {
        let ratio = e.offsetX / $("#chart").width();
        let scale = chart.scales[axis];
        let min = scale.options.min;
        let max = scale.options.max;
        let diff = max - min;
        let time = min + diff * ratio;
        drawPositionLine(time);
    }

    function drawPositionLine(time) {
        let scale = chart.scales[axis];
        let min = scale.options.min;
        let max = scale.options.max;
        let ratio = (time-min) / (max-min);
        let pixels = Math.floor(ratio * $("#chart").width());
        $("#timeline").css("left", pixels + "px");
    }

    let panTimeout = null;
    let isPanning = false;
    let panStartX = 0;
    function handleMousedown(e) {
        e.preventDefault();
        // show this time in log lines
        if (e.which == 1) {
            let cursorLeft = e.offsetX;
            let chartWidth = $("#chart").width();
            let ratio = cursorLeft / chartWidth;
            let scale = chart.scales[axis];
            let min = scale.options.min;
            let max = scale.options.max;
            let diff = max - min;
            let time = min + diff * ratio;
            scrollLogToTime(time);
        }
        // panning
        if (e.which == 2) {
            panStartX = e.offsetX;
            isPanning = true;
        }
    }

    function stopPanning(e) {
        if (e.which == 2) {
            isPanning = false;
        }
    }

    function doPanLeft() {
        let pixelDiff = -1 * $("#chart").width() * 0.1;
        updatePanPosition(pixelDiff);
        updateTimelinePosition(pixelDiff);
    }

    function doPanRight() {
        let pixelDiff = $("#chart").width() * 0.1;
        updatePanPosition(pixelDiff);
        updateTimelinePosition(pixelDiff);
    }

    function updateTimelinePosition(pixelDiff) {
        let l = $("#timeline").position().left;
        let newl = l + pixelDiff;
        $("#timeline").css("left", newl + "px");
    }

    function doScrollwheelPan(e) {
        if (!isPanning) {
            return;
        }
        if (panTimeout != null) {
            clearTimeout(panTimeout);
        }
        panTimeout = setTimeout(function() {
            let currentX = e.offsetX;
            let pixelDiff = currentX - panStartX;
            updatePanPosition(pixelDiff);
        }, mouseEventDebounce);
    }

    function updatePanPosition(pixelDiff) {
        let scale = chart.scales[axis];
        let min = scale.options.min;
        let max = scale.options.max;
        let timeDiff = max - min;
        let pixels = $("#chart").width();
        let timePerPixel = timeDiff / pixels;
        let timeAdjustment = pixelDiff * timePerPixel;
        let newMin = min - timeAdjustment;
        let newMax = max - timeAdjustment;
        scale.options.min = newMin;
        scale.options.max = newMax;
        scale.options.ticks.min = newMin;
        scale.options.ticks.max = newMax;
        currentXMin = newMin;
        currentXMax = newMax;
        chart.update();
    }

    function enableZoom() {
        $("#chart").on("mousewheel", doScrollwheelZoom);
        $("#timeline").on("mousewheel", doScrollwheelZoom);
    }

    function disableZoom() {
        $("#chart").off("mousewheel", doScrollwheelZoom);
        $("#timeline").off("mousewheel", doScrollwheelZoom);
    }

    function doScrollwheelZoom(e) {
        e.preventDefault();
        let zoomIn = e.originalEvent.wheelDeltaY > 0;
        doZoom(zoomIn);
    }

    function doZoom(zoomIn) {
        let cursorLeft = $("#timeline").position().left;
        let chartWidth = $("#chart").width();
        let ratio = cursorLeft / chartWidth;
        if (!ratio || isNaN(ratio)) {
            ratio = 0.5;
        }
        let scale = chart.scales[axis];
        let min = scale.options.min;
        let max = scale.options.max;
        let diff = max - min;
        let scrollAmount = diff * 0.2;
        let newMin = min;
        let newMax = max;
        if (zoomIn) {
            newMin = min + scrollAmount * ratio;
            newMax = max - scrollAmount * (1-ratio);
        }
        else {
            newMin = min - scrollAmount * ratio;
            newMax = max + scrollAmount * (1-ratio);
        }
        scale.options.min = newMin;
        scale.options.max = newMax;
        scale.options.ticks.min = newMin;
        scale.options.ticks.max = newMax;
        currentXMin = newMin;
        currentXMax = newMax;
        chart.update();
        showDuration();
    }

    let chartConfig = {};

    chartConfig.type = "scatter";

    chartConfig.data = {};

    // first dataset is vertical grey line, see showPosition
    chartConfig.data.datasets = [{}];
    for (let i=0; i<nodeChartLines.length; i++) {

        chartConfig.data.datasets.push(nodeChartLines[i]);

    }

    chartConfig.options = {};

    // see https://www.chartjs.org/docs/latest/general/performance.html#disable-animations
    chartConfig.options.animation = {};
    chartConfig.options.animation.duration = 0;
    chartConfig.options.hover = {};
    chartConfig.options.hover.animationDuration = 0;
    chartConfig.options.responsiveAnimationDuration = 0;
    // see https://www.chartjs.org/docs/latest/general/performance.html#disable-bezier-curves
    chartConfig.options.elements = {};
    chartConfig.options.elements.line = {};
    chartConfig.options.elements.line.tension = 0;

    chartConfig.options.maintainAspectRatio = false;

    chartConfig.options.tooltips = {};
    chartConfig.options.tooltips.enabled = false;
    chartConfig.options.tooltips.mode = "nearest";

    chartConfig.options.legend = {};
    chartConfig.options.legend.display = false;

    chartConfig.options.scales = {};

    let xmin = currentXMin || nodeChartLines[0].firstTime - 1;
    let xmax = nodeChartLines[0].data[nodeChartLines[0].data.length-1].x + 1;
    for (let i=1; i<nodeChartLines.length; i++) {
        if (nodeChartLines[i].data.length == 0) {
            continue;
        }
        let t = nodeChartLines[i].data[nodeChartLines[i].data.length-1].x + 1;
        if (t > xmax) {
            xmax = t;
        }
    }
    xmax = currentXMax || xmax;
    chartConfig.options.scales.xAxes = [{
        type: "linear",
        display: false,
        min: xmin,
        max: xmax,
        ticks: {
            // the following values are from
            // https://www.chartjs.org/docs/latest/general/performance.html
            minRotation: 0,
            maxRotation: 0,
            sampleSize: 1,
            min: xmin,
            max: xmax,
        },
    }];

    chartConfig.options.scales.yAxes = [{
        display: false,
        ticks: {
            min: -1 * (nodeChartLines.length - 1 + 0.5),
            max: 0.5,
            // the following values are from
            // https://www.chartjs.org/docs/latest/general/performance.html
            minRotation: 0,
            maxRotation: 0,
            sampleSize: 1,
        },
        gridLines: {
            display: false,
        },
    }];

    let onHoverTimeout = null;
    chartConfig.options.onHover = function(evt, cht) {
        if (onHoverTimeout) {
            clearTimeout(onHoverTimeout);
        }
        onHoverTimeout = setTimeout(function() {
            handleChartHover(evt, cht);
        }, mouseEventDebounce);
    }

    function handleChartHover(evt, cht) {
        if (cht.length == 0) {
            return;
        }
        let i = cht[0]._datasetIndex;
        if (i == 0) {
            return;
        }
        let j = cht[0]._index;
        let point = chartConfig.data.datasets[i].data[j];
        showVertLineOnChart(point.allLogLinesIndex);
    }

    function keyboardShortcut(e) {
        console.log(e.charCode);
        if (e.charCode == 61) { // equals
            doZoom(true);
        }
        else if (e.charCode == 45) { // hyphen
            doZoom(false);
        }
        else if (e.charCode == 91) { // open square bracket
            doPanLeft();
        }
        else if (e.charCode == 93) { // close square bracket
            doPanRight();
        }
    }

    if (!chartHasEvents) {
        $("#chart").on("mouseenter", enableZoom);
        $("#chart").on("mouseleave", disableZoom);
        $("#chart").on("mousemove", showPosition);
        $("#chart").on("mousedown", handleMousedown);
        $("#chart").on("mousemove", doScrollwheelPan);
        $("#chart").on("mouseup", stopPanning);
        $("#timeline").on("mouseenter", enableZoom);
        $("#timeline").on("mouseleave", disableZoom);
        $("#timeline").on("mousemove", showPosition);
        $("#timeline").on("mousedown", handleMousedown);
        $("#timeline").on("mousemove", doScrollwheelPan);
        $("#timeline").on("mouseup", stopPanning);
        // keyboard events
        $("body").on("keypress", keyboardShortcut);
        chartHasEvents = true;
    }

    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext('2d');
    window.chart = new Chart(ctx, chartConfig);
    window.chart.drawPositionLine = drawPositionLine;
    showDuration();
    setLayout();

}
