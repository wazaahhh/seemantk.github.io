queue()
	.defer(d3.json, "facts.json")
	.defer(d3.xml,  "img/Flag_of_Zambia.svg")
	.await(chartify);

function chartify(error, facts, figure) {
	// Let's put the flag on screen first
	var svg = d3.select(".viz");

	svg.node().appendChild(figure.getElementsByTagName("svg")[0]);

	d3.select("svg")
		.attr("transform", "scale(.5)");

	// Now we can calculate various dimensions
	var margin = {top: 50, left: 30, down: 50, right: 20},
		chart = {
			height: +(d3.select(".green").attr("height")),
			width: +(d3.select(".green").attr("width"))
		},
		rbobars = {
			height: +(d3.select("#red").attr("height")),
			width: +(d3.select("#red").attr("width"))
		},
		ratio = {
			width: rbobars.width / chart.width,
			height: rbobars.height / chart.height
		},
		percent = {
			rbomax: ratio.height,
		};

	console.log(percent);

	var colors = d3.scale.ordinal()
			.domain(["green", "oldgreen", "orange", "black", "red"])
			.range(["#198a00", "#oe5400", "#ef7d00", "#000", "#de2010"])
		greenColors = d3.scale.linear()
		.range([colors("green"), colors("oldgreen")])
		.interpolate(d3.interpolateHcl);


	var cycle = 250, // animation frame
		index = 0,
		keys;
	

	layers = sortify(facts.imports);

	/*
	 * Flag Axes
	 */
	/*
	 * Green bars will be stacked on the y-axis.
	 *   - have constant and equal widths (for this version)
	 *   - minimum percentage: 0%
	 *   - maximum percentage: ~99.7%
	 *
	 * RBO bars are stacked on the x-axis.
	 *   - have constant and equal heights
	 * 	 - minimum percentage of each RBO = ~.06%
	 * 	 - maximum percentage of each RBO = ~64.2%
	 */
	// stacked axes
	var rbolayers = layers.filter(function(d) { return d.class === "rbo"; }),
		grnlayers = layers.filter(function(d) { return d.class !== "rbo"; });

	console.log(rbolayers, grnlayers);
	var xrbo = d3.scale.linear()
			.domain([0, d3.max(rbolayers, function(d) { return d.y + d.y0; })])
			.rangeRound([chart.width, .1 * chart.width])
			.clamp(true),
		ygreen = d3.scale.linear()
			.domain([0, d3.max(grnlayers, function(d) { return d.y + d.y0; })])
			.range([chart.height,0])
			.clamp(true);

	console.log(xrbo.domain(), xrbo.range());

	// Draw the bars
	flatten();
	flagify();


	function flatten() {
		var flag = svg.selectAll("rect")
			.data(layers);
		flag.selectAll(".green").style("fill", function(d) { return d.color; });

	} // flatten()

	function flagify() {
		svg.selectAll(".rbo")
		  .transition().duration(500)
		  	.attr("x", function(d) { console.log("width: " + xrbo(d.y + d.y0)); return xrbo(d.y + d.y0); })
			.attr("width", function(d) { return xrbo(d.value); })
			.attr("height", chart.height)
			/*
			 .each("start", function() { // Bring the RBO bars to the front
				d3.select(this).node().parentNode.appendChild(this);
			})
			*/
			;

		var greens = layers.filter(function(d) { return d.class === "green"; });
		//ygreen.domain([0, d3.max(greens, function(d) { return d.y + d.y0; }) ]);


		svg.selectAll(".green")
			.transition().duration(500)
			.attr("y", function(d) { return ygreen(d.y0); })
			.attr("height", function(d) { return ygreen(d.y); })
			;
	} // flagify()

	function stackify(data) {
		return d3.layout.stack()
					.values(function(d) { return [d]; })
					.x(function(d) { return d.name; })
					.y(function(d) { return d.value; })
				(sorted(sortify(data)));
	} // stackify()

	function sortify(arr) {
		var ret = [],
			tmp = [],
			sorted = arr.sort(function(a, b) {
				return d3.ascending(
					Math.abs(a.value - ratio.width),
					Math.abs(b.value - ratio.width)
				);
			});

		console.log(sorted);
		// The three items closest to 7.65% will become the rbo bars
		sorted[0].class = "rbo";
		sorted[0].color = "red"
		tmp.push(sorted[0]);
		sorted[1].class = "rbo";
		sorted[1].color = "black";
		tmp.push(sorted[1]);
		sorted[2].class = "rbo";
		sorted[2].color = "orange";
		tmp.push(sorted[2]);

		console.log(tmp);
		// Calculate rbo percent
		percent.rbo = d3.sum(tmp, function(d) { return d.value; });
		console.log(percent);

		var rbo = d3.layout.stack()
					.values(function(d) { return [d]; })
					.x(function(d) { return d.name; })
					.y(function(d) { return d.value; })
					(tmp)

		// Re-sort the rest into descending order by value
		var greensorted = sorted.slice(3)
			.sort(function(a, b) { return d3.descending(a.value, b.value); });

		greenColors.domain([0, greensorted.length]);

		tmp = [];
		for(var i = 0; i < greensorted.length; ++i) {
			greensorted[i].color = greenColors(i);
			greensorted[i].class = "green";
			tmp.push(greensorted[i]);  // Keeps the RBO bars on top of the green bars
		}

		// Calculate green percent
		percent.green = d3.sum(greensorted, function(d) { return d.value; });

		var green = d3.layout.stack()
					.values(function(d) { return [d]; })
					.x(function(d) { return d.name; })
					.y(function(d) { return d.value; })
					(tmp);

		return rbo.concat(green);
	} // sortify()
};

