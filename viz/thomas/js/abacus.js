// Initialize the visualization by drawing the world grid
var width = 500,
	svg = d3.select("#viz").append("svg")
		.attr("class", "mainviz")
		.attr("width", width)
		.attr("height", width),
	fill = d3.scale.ordinal()
		.domain([-1, 0, 1])
		.range(["white", "red", "green"]),
	world = svg.append("g").attr("class", "world"),
	iters, anim;

/*
 * Connect the player buttons up to the animation.
 */
d3.select("#pause").on("click", function() {
    anim.pause = !anim.pause;
    update();
});

d3.select("#play").on("click", function() {
    anim.fwd = true;
    if(anim.pause) {
        anim.pause = false;
        d3.timer(step);
    }
});

d3.select("#yalp").on("click", function() {
    anim.fwd = false;
    if(anim.pause) {
        anim.pause = false;
        d3.timer(step);
    }
});

// Label the loading progress bar
d3.select("#loader").select(".progresstitle").text("Loading Simulation...");

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
			.on("change", function() {
				d3.select("#loader").style("display", null);
				d3.json(uri.base + uri.results + this.value)
					.on("progress", function() {
						var percentage = Math.round(d3.event.loaded * 100 / d3.event.total);
						d3.select("#loader").select(".progress-bar")
							.attr("aria-valuenow", percentage)
							.style("width", percentage + "%")
							.select(".sr-only")
							.text(percentage + "% Complete");
					})
				.get(gestate)
			})
			.selectAll("option")
			.data(listing)
		  .enter().append("option")
			.attr("value", function(d) { return d; })
			.text(function(d) { return d.slice(0, -5); });
	});

function gestate(error, incdata) {
	if(typeof incdata === "undefined") return;

	// Hide the loading progress bar
	d3.select("#loader")
		.style("display", "none")
		.select(".progress-bar")
		.attr("aria-valuenow", 0)
		.style("width", "0%")
		.select(".sr-only")
		.text('');
	// Reset the world grid
	d3.selectAll(".cell").style("fill", fill(-1));
	
	var grid_size = incdata.input.grid_size,
		length = width / grid_size;

	iters = incdata.output.mv;
	iters.unshift(d3.values(incdata.input.strategy_init).map(function(d, i) {
		return [i, d];
	}));

	anim = {
		fwd:   true,
		pause: false,
		index: 1,
		dest:  iters.length-1,
	};

	var loc = d3.scale.linear()
			.domain([0,grid_size])
			.range([0,width]);

	var cell = world.selectAll(".cell")
			.data(iters[0], function(d) { return d[0]; });

	// Remove old cells first
	cell
		.exit().remove();

	// Enter
	cell.enter().append("rect")
		.attr("class", "cell")
		.attr("width", length)
		.attr("height", length)
		.attr("y",    function(d) { return loc(row(d[0])); })
		.attr("x",    function(d) { return loc(col(d[0])); });

	// Update
	cell.style("fill", function(d) { return fill(d[1]); });

	d3.timer(step);

	/*
	 * CALLBACK: step forward to the next iteration.
	 * (this function is a callback for d3.timer())
	 */
	function step() {
		if(anim.pause) return true;
		if(anim.index === anim.dest) {
			anim.pause = true;
			return true;
		}

		update();

		// Advance to the next iteration
		if(anim.fwd) {
			anim.index++;
			if(anim.index > iters.length - 1) {
				anim.index = 0;
				anim.pause = true;
				return true;
			}
		} else { // !anim.fwd
			anim.index--;
			if(anim.index < 0) {
				anim.index = iters.length - 2;
				anim.pause = true;
				return true;
			}
		}
		d3.timer(step);
		return true;
	} // step()

	function update() {
		world.selectAll(".cell")
			.data(iters[anim.index], function(d) { return d[0]; })
			.style("fill", function(d) { return fill(d[1]); });

		d3.select("#legend-title").text("Iterations: " + anim.index);
		var percentage = Math.round(100 * anim.index / anim.dest);
		d3.select("#ager").select(".progress-bar")
			.attr("aria-valuenow", percentage)
			.style("width", percentage + "%")
			.select(".sr-only")
			.text("Iterations: " + anim.index);
	} // update()

	function row(index) {
		return (index / grid_size) >> 0; // integer division
	} // row()

	function col(index) {
		return index % grid_size;
	} // col()
}
