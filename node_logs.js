// see https://sashat.me/2017/01/11/list-of-20-simple-distinct-colors/
let colors = [
    "rgba(67, 99, 216, 0.3)",
    "rgba(230, 25, 75, 0.3)",
    "rgba(60, 180, 75, 0.3)",
    "rgba(255, 225, 25, 0.3)",
    "rgba(245, 130, 49, 0.3)",
    "rgba(145, 30, 180, 0.3)",
    "rgba(66, 212, 244, 0.3)",
    "rgba(240, 50, 230, 0.3)",
    "rgba(191, 239, 69, 0.3)",
    "rgba(250, 190, 190, 0.3)",
    "rgba(70, 153, 144, 0.3)",
    "rgba(230, 190, 255, 0.3)",
    "rgba(154, 99, 36, 0.3)",
    "rgba(255, 250, 200, 0.3)",
    "rgba(128, 0, 0, 0.3)",
    "rgba(170, 255, 195, 0.3)",
    "rgba(128, 128, 0, 0.3)",
    "rgba(255, 216, 177, 0.3)",
    "rgba(0, 0, 117, 0.3)",
    "rgba(169, 169, 169, 0.3)",
    "rgba(0, 0, 0, 0.3)",
];

let nodeChartLines = [];
let allLogLines = [];

$("#files").on("change", loadFiles);

function loadFiles() {
    $("#files").addClass("hidden");
    let filesval = $("#files").val();

    console.log(filesval[0]);

    let files = $("#files")[0].files;
    $(".duration").text("Loading " + files.length + " files...");
    for (let i=0; i<files.length; i++) {
        (function(file) {
            let reader = new FileReader();
            reader.onload = function(e) {
                console.log("Loading ", file.name);
                parseLogFile(e.target.result);
            };
            reader.readAsText(file);
        })(files[i]);
    }
}

function parseLogFile(content) {
    // chart line for this node
    nodeIndex = nodeChartLines.length;
    lines = content.split("\n");
    let nodeChartLine = {};
    nodeChartLine.showLine = false;
    nodeChartLine.order = 2;
    nodeChartLine.data = [];

    let nodePort = "";

    // parse lines
    for (let lineIndex=0; lineIndex<lines.length; lineIndex++) {
        let line = lines[lineIndex];
        let split = line.split(" ");
        let date = line.split(" ")[2];

        let time = Math.floor(new Date(date).getTime() / 1000);
        if (isNaN(time)) {
            continue
        }
        let displayedLineIndex = nodeChartLine.data.length;
        let subseconds = date.split(".")[1].split(/[+-]/)[0];
        time = time + parseFloat("0." + subseconds);

        // TODO: Define filterable events more robustly:
        let networkEventFilter = $("#filter-text").val();

        let showLine = true;
        // if (!line.includes("networkEventFilter") ){
        // }
        if (!line.includes(networkEventFilter) ){
            showLine = false;
        }
        // chart point
        nodeChartLine.data.push({
            x: time,
            // y is set after nodes are sorted
            text: line,
            lineIndex: displayedLineIndex,
            showLine
        });
    }

    
    nodeChartLines.push(nodeChartLine);

    let isLastFile = nodeChartLines.length == $("#files")[0].files.length;
    if (isLastFile) {
        console.log("creating charts")
        sortnodeOrder();
        createAllLogLines();
        sortAllLogLines();
        drawLines();
        drawChart();
        bindFilterButton();
    }
    
}

function bindFilterButton () {
    $("#apply-filter").click(() => {
        console.log("click");
        nodeChartLines = [];
        allLogLines = [];
        window.chart=null;

        $("#lines").empty();
        $("#chart").empty();
        $("#chart").append('<canvas id="canvas"></canvas>')
        loadFiles()
    })
}
function createAllLogLines() {
    for (let i=0; i<nodeChartLines.length; i++) {
        for (let j=0; j<nodeChartLines[i].data.length; j++) {
            let p = nodeChartLines[i].data[j];

            if( p.showLine ){
                // create log line
                allLogLines.push({
                    time: p.x,
                    text: p.text,
                    nodeIndex: i,
                    lineIndex: p.lineIndex,
                });

            }
            delete p.text;
            delete p.lineIndex
        }
    }
}

function sortnodeOrder() {
    nodeChartLines.sort(function(a,b) {
        return a.data[0].x - b.data[0].x;
    });
    // update node lines with their new index
    for (let nodeIndex=0; nodeIndex<nodeChartLines.length; nodeIndex++) {
        nodeChartLines[nodeIndex].pointBackgroundColor = colors[nodeIndex];
        nodeChartLines[nodeIndex].pointBorderColor = colors[nodeIndex];
        for (let j=0; j<nodeChartLines[nodeIndex].data.length; j++) {
            nodeChartLines[nodeIndex].data[j].y = -1 * nodeIndex;
        }
    }
}

function sortAllLogLines() {
    allLogLines.sort(function(a,b) {
        return a.time - b.time;
    });
}

let linesEl = $("#lines");
function drawLines() {

    for (let i=0; i<allLogLines.length; i++) {
        let line = allLogLines[i];
        // Add metadata to the chart points so hovering will allow the aggregated log
        // to be scrolled to that line.
        let nodeIndex = line.nodeIndex;
        let lineIndex = line.lineIndex;
        nodeChartLines[nodeIndex].data[lineIndex].allLogLinesIndex = i;
        // Display line
        let el = $($("#line-template").html());
        el.find(".text").text(line.text);
        el.css("background-color", colors[nodeIndex]);
        el.data("lineIndex", i);
        // calculate timings
        if (i > 0) {
            let beforetime = line.time - allLogLines[i-1].time;
            el.find(".beforetime").html(beforetime.toFixed(6) + " seconds");
            if (beforetime > 1) {
                el.find(".beforetime").addClass("longtime");
            }
        }
        // events
        el.on("mouseenter", function() {
            unselectAllLines();
            showLine(el.data("lineIndex"))
        });
        el.on("mouseleave", function() {
            unselectAllLines();
        });
        linesEl.append(el);
    }
}

function showLine(lineIndex) {
    let line = allLogLines[lineIndex];
    let el = $(".line").eq(lineIndex);
    // show text as bold
    el.find(".text").addClass("bold");
    // show time to prior log
    el.find(".beforetime").removeClass("hidden");
    // show time to next log
    let nextIndex = lineIndex + 1;
    if (nextIndex < allLogLines.length) {
        $(".beforetime").eq(nextIndex).removeClass("hidden");
    }
    if (chart && chart.drawPositionLine) {
        let point = nodeChartLines[line.nodeIndex].data[line.lineIndex];
        chart.drawPositionLine(point.x);
    }
}

function unselectAllLines() {
    $(".text.bold").removeClass("bold");
    $(".beforetime").addClass("hidden");
}

function scrollLogToTime(t) {
    // find index for this time
    // TODO change this to binary search
    let lineIndex = 1;
    for (lineIndex; lineIndex < allLogLines.length; lineIndex++) {
        let thisTime = allLogLines[lineIndex].time;
        let prevTime = allLogLines[lineIndex-1].time;
        if (thisTime > t && prevTime <= t) {
            lineIndex = lineIndex - 1;
            break;
        }
    }
    linesEl.find(":nth-child(" + lineIndex + ")").get(0).scrollIntoView();
}
