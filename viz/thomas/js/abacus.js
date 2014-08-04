/*
 * The main evolutionary game visualization
 */
var	iterations        = 100,
	grid_size         = 49,
	perc_filled_sites = 0.5,
	r = 0.05,
	q = 0.05,
	m = 1,
	s = 0.045,
	M = 5;

var width = 500,
	length = width / grid_size;
	
    d3.select("#pause").on("click", function() {
    });
    d3.select("#play").on("click", function() {
    });
    d3.select("#yalp").on("click", function() {
    });



	var fill = d3.scale.ordinal()
			.domain([-1, 0, 1])
			.range(["empty", "defector", "cooperator"]);

	var loc = d3.scale.linear()
			.domain([0, grid_size])
			.range([0, width]);

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
			.draw(draw);

	var svg = d3.select("#viz").append("svg")
			.attr("class", "mainviz")
			.attr("width", width)
			.attr("height", width);

	var grid = svg.append("g").attr("class", "world");
	var cell = grid.selectAll(".cell")
				.data(convert(abm.initialize()));
	
	// Enter
	cell.enter().append("rect")
		.attr("class",  function(d) { return "cell " + fill(d[1]); })
		.attr("width",  length)
		.attr("height", length)
		.attr("y",      function(d) { return loc((d[0] / grid_size) >> 0); })
		.attr("x",      function(d) { return loc( d[0] % grid_size); });


	abm.call();
	
	/*
	 * Convert the abm iteration/strategy into a visualizable format.
	 */
	function convert(strategy) {
		var converted = [];
		strategy.keys().sort(d3.ascending).forEach(function(k) {
			converted.push([k, strategy.get(k)]);
		});
		return converted;
	}

	function draw(strategy) {
		var cell = grid.selectAll(".cell")
					.data(convert(strategy), function(d) { return d[0]; });

		cell.attr("class", function(d) { return "cell " + fill(d[1]); });

		//d3.select("#legend-title").text("Iteration: " + anim.index);
	} // draw()
