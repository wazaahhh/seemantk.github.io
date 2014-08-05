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
	length = width / grid_size;

//d3.select("#pause").on("click", function() { });
//d3.select("#play" ).on("click", function() { });

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
		.callback(draw);

var svg = d3.select("#viz").append("svg")
		.attr("class", "mainviz")
		.attr("width", width)
		.attr("height", width);

var grid = svg.append("g").attr("class", "world");
var cell = grid.selectAll(".cell")
			.data(convert(abm.initialize()), function(d) { return d[0]; });

// Enter
cell.enter().append("rect")
	.attr("class",  function(d) { return "cell " + fill(d[1]); })
	.attr("width",  length)
	.attr("height", length)
	.attr("y",      function(d) { return loc((d[0] / grid_size) >> 0); })
	.attr("x",      function(d) { return loc( d[0] % grid_size); });

// Run the agent based model simulation
abm();


/*
 * Helpers and such
 */
function convert(strategy) {
	return strategy.keys().map(function(d) { return [+d, +strategy.get(d)]; });
}


/*
 * Convert the abm iteration/strategy into a visualizable format.
 */
function draw(strategy, iteration) {
	if(strategy === false) {
		return true;
	}

	var cnv = convert(strategy);
	console.log("wachaaaa");
	cnv.forEach(function(d) { console.log(d); });
	var cell = grid.selectAll(".cell")
			.data(cnv, function(d) { return d[0]; });

	cell.attr("class", function(d) { return "cell " + fill(d[1]); });

	d3.select("#legend-title").text("Iteration: " + iteration);
	return true;
} // draw()
