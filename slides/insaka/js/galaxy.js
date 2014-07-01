var margin = {top:20, right: 50, bottom: 30, left: 50},
		width = 900 - margin.left - margin.right,
		height = 550 - margin.top - margin.bottom,
		legwidth = 100, legheight = 80;

var dev = "seemant";
var index = 0;
var cycle = 750; // # of milliseconds per frame
var epoch; // year-month of the current frame
var progress = true;


// SCALES
var x = d3.scale.log()
				.range([margin.left * 1.5, width - margin.right])
				.clamp(true);

var x0 = d3.scale.ordinal()
				.domain([0])
				.range([margin.left / 2]);

var y = d3.scale.log()
				.range([height - margin.bottom * 4, margin.top])
				.clamp(true);

var y0 = d3.scale.ordinal()
				.domain([0])
				.range([height - margin.bottom * 2]);

var r = d3.scale.ordinal()
				.domain(["joinpart", "you", "active", "contributor", "retired"])
				.range([8, 6, 4, 4, 3]);

var t = d3.time.scale()
				.range([0,width]);

var color = d3.scale.ordinal()
				.domain(["contributor", "retired", "active", "you"])
				.range(["#00dd00", "#e5dff0", "#6048a8", "#dd4814"]);

var xAxis = d3.svg.axis()
				.scale(x)
				.ticks(20, d3.format("s"))
				.tickSize(6,0)
				.orient("bottom");

var x0Axis = d3.svg.axis()
				.scale(x0)
				.orient("bottom");

var yAxis = d3.svg.axis()
				.scale(y)
				.ticks(16, d3.format("s"))
				.tickSize(6,0)
				.orient("left");

var y0Axis = d3.svg.axis()
				.scale(y0)
				.orient("left");

var tAxis = d3.svg.axis()
				.scale(t)
				.orient("top");

var brush = d3.svg.brush()
				.x(t)
				.extent([0,0]);
		//		.on("brush", brushed);

var svg = d3.select(".viz").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var ldifDate = d3.time.format("%Y/%m/%d");
var titleDate = d3.time.format("%b %Y");
var monthDate = d3.time.format("%Y-%m");
var tooltipDate= d3.time.format("%d %b %Y");


d3.csv("data/gentoo.csv", function(error, gentoo) {
	gentoo.forEach(function(d) {
		d.total_commits = +d.total_commits;
		d.total_bugs = +d.total_bugs;
		d.joindate = ldifDate.parse(d.joindate);
		d.partdate = ldifDate.parse(d.partdate);
	});

	x.domain([
		1,
		d3.max(gentoo.map(function(d) { return +d.total_commits; }))
	]);

	y.domain([
		1,
		d3.max(gentoo.map(function(d) { return +d.total_bugs; }))
	]);

	t.domain([
		d3.min(gentoo.map(function(d) { return monthDate.parse(d.date); })),
		new Date
	]);

	// Grouped by month
	var cdata = d3.nest()
			.key(function(d) { return d.date; }).sortKeys(d3.ascending)
			.entries(gentoo);


	var stats;
	d3.json("data/rollcall.json", function(error, rollcall){
		stats = d3.nest()
				.key(function(d) {return d.developer; })
				.rollup(function(leaves) {
						return {
							"name": rollcall[leaves[0]['developer']],
							"bugs": d3.max(leaves, function(d) {
									return d.total_bugs;
								}),
							"commits": d3.max(leaves, function(d) {
									return d.total_commits;
								}),
							"tenure": zip(
								leaves.filter(function(d) {
										return d.joindate;
									}).map(function(d) {
										return d.joindate;
									}).sort(d3.ascending),
								leaves.filter(function(d) {
										return d.partdate;
									}).map(function(d) {
										return d.partdate;
									}).sort(d3.ascending)
								)
					}
				})
				.map(gentoo, d3.map);
	});


	var graph = svg.append("g").attr("class", "graph");
	var title = d3.select(".date-display");

	x_axis = graph.append("g")
			.attr("class", "x-axis")
			.attr("transform", "translate(0," + (height - margin.bottom) + ")");

	x_axis.append("g")
			.attr("class", "x axis")
			.call(xAxis);

	x_axis.append("g")
			.attr("class", "xzero axis")
			.call(x0Axis);

	x_axis.selectAll("text")
			.attr("y", 7)
			.attr("x", 9)
			.attr("transform", "rotate(90)")
			.style("text-anchor", "middle");

	svg.append("text")
			.attr("class", "x label")
			.attr("x", width - margin.right)
			.attr("y", height - margin.top * 2)
			.style("text-anchor", "end")
			.text("commits");

	y_axis = graph.append("g")
			.attr("class", "y-axis")
			.attr("transform", "translate(" + (margin.left / 2) + ",0)");

	y_axis.append("g")
			.attr("class", "y axis")
			.call(yAxis);


	y_axis.append("g")
			.attr("class", "yzero axis")
			.call(y0Axis);

	svg.append("text")
			.attr("class", "y label")
			.attr("y", 10)
			.attr("transform", "rotate(90)")
			.style("text-anchor", "start")
			.style("size", ".5em")
			.text("tickets");


	var interval;
	
	interval = setInterval(
			function() {
					if(index === 2 + cdata.length / 2) {
						index = 0;
						graph.selectAll("circle").remove()
					}
					update(cdata[index++]);
				},
			cycle
		);

	function update(data) {
		epoch = monthDate.parse(data.key);
		data.values.forEach(function(d) {
				if(progress && d.partdate)
					d.membership = "retired";
				else if(!progress && d.joindate)
					d.membership = "active";
				else
					d.membership = membership(stats.get(d.developer).tenure);
			});

		var circle = graph.selectAll("circle")
				.data(data.values, function(d) { return d.developer; });

		// ENTER
		circle.enter().append("circle")
				.attr("class", "circle")
				.attr("cx", function(d) {
						return d.total_commits === 0? x0(0) : x(d.total_commits);
					})
				.attr("cy", function(d) {
						return d.total_bugs === 0? y0(0) : y(d.total_bugs);
					})
				.attr("r", function(d) {
						return d.joindate || d.partdate ?
								r("joinpart") :
								r(d.membership);
					})
				.style("fill", function(d) {
						return color(d.membership);
					})
				.style("stroke", function(d) {
						return d.developer === dev? color("you") : "#301060";
					})
				.style("stroke-width", function(d) {
						return d.developer === dev? 2 : 1;
					})
			.append("title")
				.text(function(d) {
					return stats.get(d.developer).name +
						" (" + d.developer + ")" +
						"\nCommits: " + stats.get(d.developer).commits +
						"\nBugs Resolved: " + stats.get(d.developer).bugs +
						"\nTenure: " +
							formatTenure(stats.get(d.developer).tenure);
				});


		// UPDATE
		circle.transition()
				.duration(cycle)
				//.ease("linear")
				.attr("cx", function(d) {
					return d.total_commits === 0? x0(0) : x(d.total_commits);
				})
				.attr("cy", function(d) {
					return d.total_bugs === 0? y0(0) : y(d.total_bugs);
				})
				.attr("r", function(d) {
					if(d.developer === dev) return r("you");
					return r(d.membership);
				})
				.style("fill", function(d) {
					return color(d.membership);
				})
				.style("stroke", function(d) {
					return d.developer === dev? color("you") : "#301060";
				});

		title.transition()
				.duration(cycle)
				.text(function() {
					return titleDate(epoch);
				});

		if(progress) {
			circle.exit().transition()
				.duration(cycle)
				.attr("r", function(d) {
						if(d.developer === dev) return r("you");
						return r(d.membership);
					})
				.style("fill", function(d) {
						return color(d.membership);
					});
		} else {
			circle.exit()
				.select(function(d) { return d.membership !== "retired"; })
				.transition()
				.remove();
		}
	};

	function membership(tenure) {
		var current = d3.time.month(epoch);

		var tenuremap = {
			"true,true": "active",
			"false,true": "contributor",
			"true,false": "retired"
		};

		var tenures = tenure.map(function(t) {
				return t.map(function(m) {
					if(m)
						return d3.time.month(m)
					else
						return d3.time.month(new Date());
				})
			}).map(function(t) {
				return tenuremap[
					[current >= d3.min(t), current <= d3.max(t)].join()
				];
			});

		if(tenures[0] !== "retired")
			return tenures[0];
		else {
			if(tenures.length > 1)
				return tenures[1];
		}

		return tenures[0];
	}

	function formatTenure(tenure) {
		return tenure.map(function(term) {
			return term.map(function(date) {
				return date? tooltipDate(date): "present";
			}).join(" - ");
		}).join("\n and ");
	}
});

// Mimic Python's zip()
// From: http://stackoverflow.com/a/10284006/1968883
function zip() {
	var args = [].slice.call(arguments);
	var longest = args.reduce(function(a,b){
		return a.length > b.length ? a : b
	}, []);

	return longest.map(function(_,i){
		return args.map(function(array){return array[i]})
	});
}

