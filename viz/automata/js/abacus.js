// Initialize the visualization by drawing the world grid
var width = 500
    , dict = {"-1": "empty", "0": "defector", "1": "cooperator" }
    , world = blinkengrid()
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
    , fontfile = "font.csv"
    ;

d3.select("#viz").call(world);
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
    .defer(d3.csv, fontfile) // bitmap font for blinkenwriting
    .defer(d3.xml, uri.base) // directory listing in XML
    .await(function(error, font, xml) {
        var loc = "results/json/"
          , listing = [].slice.call(xml.getElementsByTagName("Key"))
                .filter(function(d) { return !d.textContent.indexOf(loc); })// == 0
                .map(function(d) { return d.textContent.slice(loc.length); })
        ;

        world.font(font);

        /*
         * Construct a select box dropdown to hold the names of the available
         * sims in the S3 bucket.
         */
		d3.select("#chooser")
			.append("text")
			.text("Choose a sim: ");

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

            d3.json(uri.base + uri.results + simfile)
                .on("beforesend", function() {
                    // Clear the grid and put up a message
                    world.blank();
                    world.title("Loading");
                })
                .on("progress", function() {
                    // Update the progress bar
                    world.progress(d3.event.loaded/d3.event.total);
                })
                .get(function(error, incdata) {
                    world.blank();
                    if(incdata == undefined) return;

                    simulate(error, incdata);
                    d3.select("#play").node().click();
                    d3.select("#permalink")
                        .attr("href", function(d) {
                            return d3.select(this).attr("data-url")
                                + "?sim=" + simfile.split('.json')[0];
                        })
						.append("Direct link to this sim.");
                });
        } // s3load()
    })
; // queue()


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
    world.grid().selectAll("rect").data(dataset, function(d) { return d[0]; })
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

    ager_progress
        .domain([0,iters.length - 1])
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


    var cell = world.grid().selectAll("rect")
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

