// Initialize the visualization by drawing the world grid
var width = 500
    , svg = d3.select("#viz").append("svg")
        .attr("class", "mainviz")
        .attr("width", width)
        .attr("height", width)
    , dict = {"-1": "empty", "0": "defector", "1": "cooperator" }
    , world = svg.append("g").attr("class", "world")
    , anim = {
        fwd:   true,
        pause: false,
        index: 1
    }
    , iters
    , ager_progress = progressbar()
    ;

d3.select("#ager").call(ager_progress);

// Label the loading progress bar
d3.select("#loader").select(".progresstitle").text("Loading Simulation...");
// Hide the loader
d3.select("#loader").style("display", "none");

/*
 * Connect the player buttons up to the animation.
 */
d3.select("#pause").on("click", function() {
    if(anim.pause) return;
    d3.select("#legend-title")
        .text(d3.select("#legend-title").text() + " (Paused)");
    anim.pause = true;
});

d3.select("#play").on("click", function() {
    anim.fwd = true;
    anim.dest = iters.length - 1;
    if(anim.pause) {
        anim.pause = false;
        d3.timer(step);
    }
});

d3.select("#yalp").on("click", function() {
    anim.fwd = false;
    anim.dest = 0;
    if(anim.pause) {
        anim.pause = false;
        d3.timer(step);
    }
});

// Populate the menu of available simulations
var uri = {
    base: "https://s3.amazonaws.com/property_game/",
    results: "results/json/"
};

// Populate the drop-down list with the S3 bucket contents
queue()
    .defer(d3.xml, uri.base) // directory listing in XML
    .await(function(error, stuff) {
        var dirs = stuff.getElementsByTagName("Key"),
            listing = [];

        for(var i = 0; i < dirs.length; ++i) {
            if(dirs[i].textContent) {
                var txt = dirs[i].textContent.split("/");
                if(txt[0] === "results" && txt[1] === "json") {
                    listing.push(txt[2]);
                }
            }
        }

        d3.select("#chooser")
          .insert("select")
            .on("change", function() { s3load(this.value); })
            .selectAll("option")
            .data(listing)
          .enter().append("option")
            .attr("value", function(d) { return d; })
            .text(function(d) { return d.slice(0, -5); });

        s3load(d3.select("select").node().value);

        // the s3load() callback
        function s3load(simfile) {
            // Show the progress bar
            d3.select("#loader").style("display", null);

            // Load the file and update the progress bar
            d3.json(uri.base + uri.results + simfile)
                .on("progress", function() {
                    var percentage = Math.round(d3.event.loaded * 100 / d3.event.total);
                    d3.select("#loader").select(".progress-bar")
                        .attr("aria-valuenow", percentage)
                        .style("width", percentage + "%")
                        .select(".sr-only")
                        .text(percentage + "% Complete");
                })
                .get(function(error, incdata) {
                    if(typeof incdata !== "undefined") {
                        simulate(error, incdata);
                    }
                });
        }


    });

/*
 * CALLBACK: step forward to the next iteration.
 * (this function is a callback for d3.timer())
 */
function step() {
    if(anim.pause) return true;
    anim.pause = anim.pause || anim.index === anim.dest;

    // Perform the update
    update(iters[anim.index]);
    ager_progress.move(anim.index);

    if(anim.pause) return true;

    // Advance to the next iteration
    anim.index += anim.fwd ? 1 : -1;
    anim.index %= iters.length;

    d3.timer(step);
    return true;
} // step()

function update(dataset) {
    world.selectAll("rect").data(dataset, function(d) { return d[0]; })
        .attr("class", function(d) { return dict[d[1]]; });

    d3.select("#legend-title")
        .text("Iterations: " + anim.index + "/" + (iters.length - 1));
} // update()



function simulate(error, incdata) {
    if(typeof incdata === "undefined") return;

    // Hide the loading progress bar
    d3.select("#loader")
        .style("display", "none")
        .select(".progress-bar")
        .attr("aria-valuenow", 0)
        .style("width", "0%")
        .select(".sr-only")
        .text('');
 
    // Reset the iteration progress
    var epochs = d3.keys(incdata.output.strategies_iter).map(function(d) {
            return +d;
        });

    ager_progress
        .domain(epochs)
        .callback(warp)
        ;
    ager_progress.move(0);


    d3.select("#legend-title")
        .text("Iterations: 0" + anim.paused ? " (Paused)" : "");

    // Reset the world grid
    world.selectAll("rect").attr("class", "empty");

    var grid_size = incdata.input.grid_size,
        length = width / grid_size;

    iters = incdata.output.mv;
    iters.unshift(d3.values(incdata.input.strategy_init)
        .map(function(d, i) { return [i, d]; })
    );

    anim.fwd   = true;
    anim.index = 0;
    anim.dest  = iters.length - 1;

    var loc = d3.scale.linear()
            .domain([0,grid_size])
            .range([0,width])
        , cell = world.selectAll("rect")
            .data(iters[anim.index], function(d) { return d[0]; });

    // Remove old cells first
    cell.exit().remove();

    // Enter
    cell.enter().append("rect")
        .attr("class", "empty")
        .attr("width", length)
        .attr("height", length)
        .attr("y",    function(d) { return loc((d[0] / grid_size) >> 0); })
        .attr("x",    function(d) { return loc( d[0] % grid_size      ); });

    // Update
    cell.attr("class", function(d) { return dict[d[1]]; })

    d3.timer(step);

    function warp(near) {
        var dest = epochs.reduce(function(prev, curr) {
            return Math.abs(curr - near) < Math.abs(prev - near) ? curr: prev;
        });

        anim.index = dest;
        update(d3.values(incdata.output.strategies_iter[dest]).map(function(d, i) {
            return [i, d];
        }));
    }
}
