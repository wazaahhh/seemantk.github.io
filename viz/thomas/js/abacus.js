/*
 * The main evolutionary game visualization
 */
var	iterations        = 100,
	grid_size         = 49,
	perc_filled_sites = 0.5,
	r = 0.05,
	q = 0.05,
	s = 0.045,
	m = 1,
	M = 5;

var width = 500,
	length = width / grid_size,
	pause = false;

d3.select("#pause").on("click", function() { pause = true;  });
d3.select("#play" ).on("click", function() {
		if(pause === true) {
			pause = false;
			d3.timer(update());
		}
	});

var fill = d3.scale.ordinal()
		.domain([-1, 0, 1])
		.range(["empty", "defector", "cooperator"]);

var loc = d3.scale.linear()
		.domain([0, grid_size])
		.range ([0, width]);

/*
 * Launch the agent
 */
abm = agent_based_model()
		.r(r)
		.q(q)
		.m(m)
		.s(s)
		.M(M)
		.iterations(iterations)
		.grid_size(grid_size)
		.percs(perc_filled_sites)
		.dilemma("helbing_yu");

var svg = d3.select("#viz").append("svg")
		.attr("class", "mainviz")
		.attr("width", width)
		.attr("height", width);

var grid = svg.append("g").attr("class", "world");

grid.selectAll(".cell")
	.data(abm.initial(), function(d) { return d.key; })
  .enter().append("rect")
	.attr("class",  function(d) { return "cell " + fill(d.value); })
	.attr("width",  length)
	.attr("height", length)
	.attr("y",      function(d, i) { return loc((i / grid_size) >> 0); })
	.attr("x",      function(d, i) { return loc( i % grid_size); });

// Run the agent based model simulation
abm();
d3.timer(update());


/*
 * Helpers and such
 */


function update() {
	return function() {
		if(pause === true) return true;

		var strategy = abm.step()();
		d3.select("#viz-title").text("Iteration: " + abm.counter());

		if(strategy === true) return true;

		grid.selectAll(".cell")
				.data(strategy, function(d) { return d.key; })
				.attr("class", function(d) { return "cell " + fill(d.value); });

		d3.timer(update());
		return true;
	}
} // draw()
