// Initialize the visualization by drawing the world grid
var width = 500
    , svg = d3.select("#viz").append("svg")
        .attr("class", "mainviz")
        .attr("width", width)
        .attr("height", width)
    , dict = {"-1": "empty", "0": "defector", "1": "cooperator" }
    , world = svg.append("g").attr("class", "world")
    , grid_size = 49 // default, based on Thomas' datasets
    , anim = {
        fwd:   true,
        pause: false,
        index: 1
    }
    , iters
    , ager_progress = slider()
    , coords = d3.scale.linear()
            .domain([0,grid_size])
            .range([0,width])
    ;

world.selectAll("rect")
    .data(d3.range(grid_size * grid_size), function(d, i) { return i; })
  .enter().append("rect")
    .attr("class", "empty")
    .attr("id", function(d, i) { return "cell" + i; })
    .attr("width",  width / grid_size)
    .attr("height", width / grid_size)
    .attr("y", function(d, i) { return coords((i / grid_size) >> 0); })
    .attr("x", function(d, i) { return coords( i % grid_size)      ; })
;

d3.select("#ager").append("svg").call(ager_progress);

/*
 * Connect the player buttons up to the animation.
 */
d3.select("#pause").on("click", function() { anim.pause = true; });

d3.select("#play").on("click", function() {
    anim.fwd = true;
    anim.dest = iters.length - 1;
    anim.pause = false;
    d3.timer(step);
});

d3.select("#yalp").on("click", function() {
    anim.fwd = false;
    anim.dest = 0;
    anim.pause = false;
    d3.timer(step);
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
                return ("0000000" + parseInt(f[c],16).toString(2))
                    .slice(-8)
                    .split('')
                    .map(function(bit) { return +bit; });
            })
            f.matrix.push([0,0,0,0,0,0,0,0]); // Letter spacing to the next one
        });

        font_table = d3.nest()
            .key(function(d) { return d.Letter; })
            .rollup(function(leaves) { return leaves[0].matrix; })
            .map(font, d3.map);

		// Initialize the blinkengrid
        progressgrid();

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

        // Draw the initial grid




        /*
         * CALLBACK: s3load()
         */
        function s3load(simfile) {
            // Stop the current animation
            d3.select("#pause").node().click();

            // Show the progress bar
            progressgrid();

            d3.json(uri.base + uri.results + simfile)
                .on("progress", function() {
                    var ratio = Math.round(d3.event.loaded * 100 / d3.event.total);
                    progress(ratio);
                  })
                .get(function(error, incdata) {
                    if(typeof incdata !== "undefined") {
                        simulate(error, incdata);
                        d3.select("#play").node().click();
                        d3.select("#permalink")
							.attr("value",
									"http://" + window.location.host + "/"
										+ window.location.pathname
										+ "?sim=" + simfile.split('.json')[0]
							)
                    }
                });
        } // s3load()
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
    ager_progress.value(anim.index);

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
        .text(anim.index + "/" + (iters.length - 1));
} // update()



function simulate(error, incdata) {
    if(incdata == undefined) return;

    // Reset the iteration progress
    var epochs = d3.keys(incdata.output.strategies_iter)
                .map(function(d) { return +d; });

    grid_size = incdata.input.grid_size;
    var length = width / grid_size;

    iters = incdata.output.mv;
    iters.unshift(d3.values(incdata.input.strategy_init)
        .map(function(d, i) { return [i, d]; }));

    anim.fwd   = true;
    anim.index = 0;
    anim.dest  = iters.length - 1;

    ager_progress.domain([0,iters.length - 1]);
    ager_progress
        .callback(function(near) {
            anim.index = epochs
                    .reduce(function(prev, curr) {
                        return Math.abs(curr - near) < Math.abs(prev - near)
                            ? curr: prev;
                    });

            update(d3.values(incdata.output.strategies_iter[anim.index])
                .map(function(d, i) { return [i, d]; }));
          }) // callback function()
        ;
    ager_progress.value(0);


    // Reset the world grid
    world.selectAll("rect").attr("class", "empty");


    progressgrid();
    coords.domain([0,grid_size])

    var cell = world.selectAll("rect")
            .data(iters[anim.index], function(d) { return d[0]; });

    // Remove old cells first
    cell.exit().remove();

    // Enter
    cell.enter().append("rect")
        .attr("class", "empty")
        .attr("id", function(d, i) { return "cell" + i; })
        .attr("width", length)
        .attr("height", length)
        .attr("y", function(d) { return coords((d[0] / grid_size) >> 0); })
        .attr("x", function(d) { return coords( d[0] % grid_size      ); });

    // Update
    cell.attr("class", function(d) { return dict[d[1]]; })
} // simulate()


// Capture URL query param
function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match &&
            decodeURIComponent(match[1].replace(/\+/g, ' ').replace(/\//g, ''));
} // getParameterByName()


function progressgrid() {
    var word = "Loading";
    var message = d3.merge(word.split('').map(function(l) {
            return font_table.get(l); }))
        , offset = {
            col: Math.floor((grid_size - message.length)/2),
            row: Math.floor((grid_size / 2) - (message[0].length + 2))
          }
        , hm = d3.merge(message.map(function(columns, i) {
                return columns.map(function(value, j) {
                    return [(offset.row + j) * grid_size + i + offset.col, value];
                });
            }))
            .filter(function(d) { return d[1] > 0; }) // don't need empty cells
    ;

    var msg = world.selectAll("rect").data(hm, function(d) { return d[0]; });
    msg.attr("class", function(d) { return dict[d[1]]; });
    msg.exit().attr("class", function(d) { return "empty"; });
} // progressgrid()


function progress(percent) {
    if(percent === 0) {
        d3.selectAll(".progbar").attr("class", "empty")
        return;
    }
    // Number of cells to fill in
    var message = d3.range(Math.round(percent * grid_size / 100))
                .map(function(r) { return [1,1,1]; })
        , offset = {
            col: 0,
            row: Math.ceil((grid_size / 2) + ((message[0] == undefined ? 0 : message[0].length) + 2))
          }
        , hm = d3.merge(message.map(function(columns, i) {
                return columns.map(function(value, j) {
                    return [(offset.row + j) * grid_size + i + offset.col, 0];
                });
            }))
    ;

    var msg = world.selectAll("rect").data(hm, function(d) { return d[0]; });
    msg.attr("class", function(d) { return "progbar " + dict[d[1]]; });

} // progress()
