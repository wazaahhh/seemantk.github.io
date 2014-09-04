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
    d3.select("#legend-title")
        .text(d3.select("#legend-title").text() + " (Paused)");
    anim.pause = true;
});

d3.select("#play").classed("active", true);
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


// Add the legend
var items = d3.select("#legend").selectAll("li")
    .data(d3.values(dict));

items.enter().append("li");

items.append("svg")
    .attr("height", 10)
    .attr("width", 10)
    .attr("transform", "translate(0,0)")
  .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 10)
    .attr("height", 10)
    .attr("class", function(d) { return d; });
items.append("text")
    .text(function(d) { return d; })
    .style("margin-left", "1em");


// Populate the drop-down list with the S3 bucket contents
queue()
    .defer(d3.xml, uri.base) // directory listing in XML
    .defer(d3.csv, "font.csv")
    .await(function(error, xml, font) {
        var loc = "results/json/"
          , listing = [].slice.call(xml.getElementsByTagName("Key"))
                .filter(function(d) { return !d.textContent.indexOf(loc); })// == 0
                .map(function(d) { return d.textContent.slice(loc.length); })
          , columns = d3.keys(font[0])
        ;
        columns.shift();

        font.forEach(function(f) {
            f.matrix = columns.map(function(c) {
                return ("0" + parseInt(f[c],16).toString(2)).slice(-8)
                        .split('')
                        .map(function(bit) { return +bit; });
            })
        });

        font_table = d3.nest()
            .key(function(d) { return d.Letter; })
            .rollup(function(leaves) { return leaves[0].matrix; })
            .map(font, d3.map);
        window.font = font_table;

        /*
         * Construct a select box dropdown to hold the names of the available
         * sims in the S3 bucket.
         */
        d3.select("#chooser")
          .insert("select")
            .on("change", function() { s3load(this.value); })
            .selectAll("option")
            .data(listing)
          .enter().append("option")
            .attr("value", function(d) { return d; })
            .text(function(d) { return d.slice(0, -5); });

        // See if a sim (without the ".json" extension) has been requested
        // in the URL.  If so, load it into the select box.
        var sim = getParameterByName("sim");
        if(sim) {
            d3.select("#chooser").selectAll("option")
                .property("selected", function(d) {
                    return (d === sim + ".json") ? "selected" : null;
                });
        }

        // Load the selected sim
        s3load(d3.select("select").node().value);


        /*
         * CALLBACK: s3load()
         */
        function s3load(simfile) {
            // Stop the current animation
            d3.select("#pause").node().click();
            // Reset the world grid
            world.selectAll("rect").attr("class", "empty");
            // Show the progress bar
            d3.select("#loader").style("display", null);

            //progressgrid(49);
            // Load the file and update the progress bar
            d3.json(uri.base + uri.results + simfile)
                .on("progress", function() {
                    var ratio = Math.round(d3.event.loaded * 100 / d3.event.total);
                    d3.select("#loader").select(".progress-bar")
                        .attr("aria-valuenow", ratio)
                        .style("width", ratio+ "%")
                        .select(".sr-only")
                        .text(ratio + "% Complete");
                })
                .get(function(error, incdata) {
                    if(typeof incdata !== "undefined") {
                        simulate(error, incdata);
                        d3.select("#play").node().click();
                    }
                });
        }


    }); // queue()

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
        .text("Iteration: " + anim.index + "/" + (iters.length - 1));
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
        .attr("id", function(d, i) { return "cell" + i; })
        .attr("width", length)
        .attr("height", length)
        .attr("y", function(d) { return loc((d[0] / grid_size) >> 0); })
        .attr("x", function(d) { return loc( d[0] % grid_size      ); });

    // Update
    cell.attr("class", function(d) { return dict[d[1]]; })

    d3.timer(step);

    function warp(near) {
        var dest = epochs.reduce(function(prev, curr) {
            return Math.abs(curr - near) < Math.abs(prev - near) ? curr: prev;
        });

        anim.index = dest;
        update(d3.values(incdata.output.strategies_iter[dest])
            .map(function(d, i) {
                return [i, d];
            }));
    } // warp()
} // simulate()

// Capture URL query param
function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match &&
            decodeURIComponent(match[1].replace(/\+/g, ' ').replace(/\//g, ''));
} // getParameterByName()


function progressgrid(grid_size) {
    // Put the word "loading" starting at row 14
    var message = "Loading"
            .split('')
            .map(function(l) { return font_table.get(l); });

    var letter_width = message[0].length + 1,
        width = message.length * (letter_width)
        , height = message[0][0].length
        offset = {
            col: Math.floor((grid_size - width)/2),
            row: Math.floor((grid_size / 2) - (height + 2))
        }
    ;

    message.forEach(function(m, i) {
        m.forEach(function(n, j) {
        });
    });
}
