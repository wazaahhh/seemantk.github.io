queue()
	.defer(d3.json, "zambia.json")
	.defer(d3.xml,  "img/nkwazi.svg")
	.await(chartify);

// Load Eagle:
/*
d3.xml("nkwazi.svg", "image/svg+xml", function(xml) {
		  document.body.appendChild(xml.documentElement);
	  });
*/

function chartify(error, zambia, nkwazi) {
	var flag = {
		colors : { // colors per the svg at wikipedia
			green: "#198a00",
			oldgreen: "#oe5400",
			orange: "#ef7d00",
			black: "#000",
			red: "#de2010",
		},
		percent : {
			green: 64.3,
			rbo: 35.7
		},
	};

	var percent = {};

	var greenColors = d3.scale.linear()
		.range([flag.colors.green, flag.colors.oldgreen])
		.interpolate(d3.interpolateHcl);

	var margin = {top: 50, left: 30, down: 50, right: 20},
		chart = {height: 300, width: 450}, // 2:3 (H:W) Ratio
		bar = {height: chart.height * .641, width: chart.width * .119};

	var cycle = 250, // animation frame
		index = 0,
		keys;



	var dataset = d3.map(zambia);
	layers = sortify(dataset.get('imports'));

	// Flag Axes
	var xflag = d3.scale.ordinal()
			.range([0, chart.width]);

	var yflag = d3.scale.linear()
			.domain([0, d3.max(layers, function(d) { return d.y + d.y0; })])
			.range([0, chart.height]);

	var ygreen = d3.scale.linear()
			.range([0, chart.height])
			.clamp(true);


	// Axes for rbo (red+black+orange) bars
	var xrbo = d3.scale.linear()
			.domain([64.3,100])
			.range([(chart.height * 0.643), chart.height])
			.clamp(true);

	var yrbo = d3.scale.linear()
			.domain([0,100])
			.range([0,chart.width])
			.clamp(true);


	// Draw the chart
	var svg = d3.select(".viz").append("svg")
			.attr("width", chart.width)
			.attr("height", chart.height);

	var flag = svg.append("g")
			.attr("class", "flag")
			.attr("width", chart.width)
			.attr("height", chart.height);


	var bird = nkwazi.getElementsByTagName("svg")[0];
	flag.node().appendChild(bird);

	// Draw the bars
	flatten();
	flagify();

	function flatten() {
		flag.selectAll("rect")
			.data(layers, function(d) { return d.name; })
	  	  .enter().append("rect")
			.attr("y", function(d) { return yflag(d.y0); })
			.attr("x", 0)
			.attr("class", function(d) { return d.class; })
			.attr("width", function(d) { return chart.width; })
			.attr("height",function(d) { return yflag(d.y); });

		/* Paint the green ones.  The RBO bars will be painted by CSS. */
		flag.selectAll(".green")
			.style("fill", function(d, i) { return d.color; });
	} // flatten()

	function flagify() {

		/*
		var rbos = layers.filter(function(d) { return d.class !== "green"; });
		yrbo.domain([0, d3.max(rbos, function(d) { return d.y + d.y0; })]);
		*/

		flag.selectAll(".rbo")
		  .transition().duration(500)
			.each("start", function() { // Bring the RBO bars to the front
				d3.select(this).node().parentNode.appendChild(this);
			})
			.attr("width", xrbo(percent.rbo))
		  .transition().delay(500).duration(500) // Rotate them to the right spot
			.attr("transform", "rotate(-90) translate(-" + chart.height + "," +
					(chart.width * percent.green / 100) + ")")
		  .transition().delay(1000).duration(500) // Adjust the heights to match.
			.attr("y", function(d) { return yrbo(d.y0); })
			.attr("height", function(d) { return yrbo(d.y); })
			;

		var greens = layers.filter(function(d) { return d.class === "green"; });
		ygreen.domain([0, d3.max(greens, function(d) { return d.y + d.y0; }) ]);


		flag.selectAll(".green")
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
		var ret = [], tmp = [],
			sorted = arr.sort(function(a, b) {
				return d3.ascending(
					Math.abs(a.value - flag.percent.rbo / 3),
					Math.abs(b.value - flag.percent.rbo / 3)
				);
			});

		// The three items closest to 7.65% will become the rbo bars
		sorted[0].class = "red rbo";
		tmp.push(sorted[0]);
		sorted[1].class = "black rbo";
		tmp.push(sorted[1]);
		sorted[2].class = "orange rbo";
		tmp.push(sorted[2]);

		// Calculate rbo percent
		percent.rbo = d3.sum(ret, function(d) { return d.value; });

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

