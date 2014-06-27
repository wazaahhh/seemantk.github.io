function scorify() {
    var perspective = "winloss",
		cycle = 500,
        questions = [1,2,3,4,5,6,7,8];

	var radios  = ['choice', 'score', 'winloss', 'votes'],
		fields  = ['choice', 'score', 'wins', 'losses', 'votes'],
		columns = ['choice', 'score', 'wins', 'fill', 'losses', 'votes'];


    var width  = 640,
        height = 500,
        radius = Math.min(width, height) / 2;

	var question,
		choices,
		pie = d3.layout.pie()
			.sort(sortByScore)
			.value(function(d) { return d.score; });

	var tooltip = d3.select("body").append("div")
				.attr("class", "tooltip")
				.style("opacity", 0);

	var color = d3.scale.category10();

	var rwin = d3.scale.linear()
			.range([radius*2/3 + 3, radius])
			.clamp(true);
	var arcChoice = d3.svg.arc()
			.outerRadius(function(d) { return rwin(d.data.wins); })
			.innerRadius(function(d) { return rloss(d.data.losses); });

	var rloss = d3.scale.linear()
			.range([radius*2/3 - 3, radius/3])
			.clamp(true);

	var rtotal = d3.scale.linear()
			.range([radius/3 + 3, radius])
			.clamp(true);

	var arcTotal = d3.svg.arc()
		.outerRadius(function(d) { return rtotal(d.data.wins + d.data.losses); })
		.innerRadius(radius/3 - 3);

    d3.select("#viz-nav").selectAll("button")
        .data(questions, function(d) { return d; })
      .enter().append("button")
        .attr("id", function(d) { return "button" + d; })
		.attr("type", "button")
        .attr("class", "btn btn-primary")
        .text(function(d) { return d; })
        .style("cursor", "pointer")
        .on("click", get_data);


	// Define draw area
	var svg = d3.select(".viz").append("svg")
			.attr("width", width)
			.attr("height", height)
		  .append("g")
			.attr("transform","translate(" + width/2 + "," + height/2 + ")");

	// Read data and draw
	get_data(6);

	/* Read json data file and call the draw() function */
	function get_data(question) {
    	queue()
        	.defer(d3.json, "question" + question + ".json")
        	.await(draw);
	} // get_data()


	function draw(error, data) {
		svg.selectAll(".donuts").remove();
		svg.selectAll("#vote-count").remove();
		d3.selectAll("dt").remove();
		d3.select("#legend").select("tbody").selectAll("tr").remove();

		question = d3.map(data).get('item');
		choices = d3.map(question.choices)
					.values()
					.sort(function(a, b) {
						return d3.descending(+a.score, +b.score);
					  });

		choices.forEach(function(d) {
			d.wins   = +d.wins;
			d.losses = +d.losses;
			d.score  = (+d.score).toFixed(1);
		});


		// Change the Question display
		d3.select("#viz-title")
			.html("&quot;" + question.full_question + "&quot;");

		// Draw new one
		donuts = svg.datum(choices).selectAll(".donuts")
			.data(pie)
		  .enter().append("g")
			.attr("class", "donuts");

		donuts.append("path")
			.attr("class", "wins")
			.attr("d", arcChoice)
			.style("fill", function(d) { return color(d.data.data); })
			.style("fill-rule", "evenodd")
			.on("mouseover", function(d) {
				tooltip.html(tooltipText(d))
				tooltip.transition().duration(200)
					.style("opacity", 0.9)
					.style("left", (d3.event.pageX + 14) + "px")
					.style("top", (d3.event.pageY - 28) + "px");
				});

		function tooltipText(d) {
			return (d.data.data + ":<br/>" + 
					(perspective === "difference"
						? Math.abs(d.data.wins - d.data.losses) + " aggregate " +
							(d.data.wins < d.data.losses ? "losses" : "wins")
						: (perspective === "counts"
							? (d.data.wins + d.data.losses) + " votes"
							: d.data.wins+" wins<br/>" + d.data.losses+" losses"
					   )
				)
			);
		};



		donuts.selectAll("path")
			.on("mouseout", function(d) {
				tooltip.transition().duration(500)
					.style("opacity", 1e-6);
			});

		svg.append("circle")
			.attr("class", "lossfill lossring")
			.attr("cx", 0)
			.attr("cy", 0)
			.attr("r", radius*2/3)
			.style("fill", "white")
			.style("stroke-width", 1)
			.style("stroke", "white")
			.style("pointer-events", "none");


		// center label
		svg.append("text")
			.text(question.votes_count + " Votes")
			.attr("id", "vote-count")
			.style("font-size", "2em")
			.style("text-anchor", "middle");

		// Legend
		var legend = d3.select("#legend");
		legend.transition().select("#question-statement")
			.text(question.name);

		// Header Row
		var header = legend.select("thead");

		header.selectAll("tr").remove(); // HACK. A second header row exists. Why?
		header.append("tr").selectAll("th") // controller row
			.data(radios)
		  .enter().append("th")
			.attr("colspan", function(d) {
				return d === "winloss" ? 3 : 1;
			  })
			.each(function(d) {
				if(d !== "choice")
					d3.select(this)
					  .append("input")
						.attr("type", "radio")
						.attr("id", function(d) { return "radio-" + d; })
						.attr("name", "mode")
						.attr("value", d)
						.attr("checked", function(d) {
							return d === "winloss" ? "checked" : null;
						});
					d3.select(this)
					  .append("label")
						.attr("for", function(d) { return "radio-" + d; })
						.html(function(d) {
							return d === "winloss"
								? "<sup>win</sup>/<sub>loss</sub>"
								: d === "choice"
									? "" 
									: d;
						});
			  })
			.on("change", function(d) {
				perspective = d;
				change();
			})
			.style("text-align", function(d) { return d === "winloss" ? "center" : d === "votes" ? "right" : "left"; });


		// Data Rows

		var rows = legend.select("tbody").selectAll("tr")
						.data(choices)
					  .enter().append("tr");

		var cells = rows.selectAll("td")
						.data(function(row) {
							return columns.map(function(col) {
								return [col, row];
							});
						})
					  .enter().append("td");


		cells.attr("class", function(d) { return d[0]; });

		cells.filter(function(d) { return d[0] === "fill"; })
			.attr("width", "1.6em")
			.append("svg")
			.attr("width", "1.6em")
			.attr("height", "1.6em")
			.style("background-color", function(d) {
				return color(d[1].data);
			})
		.append("rect")
			.attr("width", "100%")
			.attr("height", "100%")
			.style("fill", function (d) {
				var gradient = d3.select(this.parentNode).append("svg:defs")
					.append("svg:linearGradient")
					.attr("id", "legendgradient")
					.attr("x1", "0%")
					.attr("y1", "0%")
					.attr("x2", "100%")
					.attr("y2", "100%");

				gradient.append("svg:stop")
					.attr("offset", "0%")
					.attr("stop-color", "#fff")
					.attr("stop-opacity", 1e-6);

				gradient.append("svg:stop")
					.attr("offset", "50%")
					.attr("stop-color", "#fff")
					.attr("stop-opacity", 1e-6);

				gradient.append("svg:stop")
					.attr("offset", "50%")
					.attr("stop-color", "#fff")
					.attr("stop-opacity", .6);

				gradient.append("svg:stop")
					.attr("offset", "100%")
					.attr("stop-color", "#fff")
					.attr("stop-opacity", .6);

				return "url(#legendgradient)";
			});


		cells.filter(function(d) { return d[0] !== "fill"; })
			.html(function(d) {
				return d[0] === "choice"
					? d[1].data
					: d[0] === "votes"
						? (d[1].wins + d[1].losses)
						: d[0] === "wins"
							? "<sup>" + d[1][d[0]] + "</sup>"
							: d[0] === "losses"
								? "<sub>" + d[1][d[0]] + "</sub>"
								: d[1][d[0]];

							
			});

		perspective = "winloss";
		change();
	} // draw()

	function change() {
		perspective === "winloss"
			? transitionWinLoss()
			: perspective === "votes" 
				? transitionCounts()
				: transitionThreshold();
	} // change()
	

	function transitionThreshold() {
		var donut = svg.selectAll(".wins"),
			mask = svg.selectAll(".lossring");

		// Rescale so that the largest win and loss are both full height
		// Note: Wins and losses will be out of proportion on screen
		rwin.domain([
			0,d3.max(choices, function(d) { return d.wins - d.losses; })
		  ]);
		rloss.domain([
			0,d3.max(choices, function(d) { return d.losses - d.wins; })
		  ]);

		// Now calculate new wedges for difference
		arcChoice
			.outerRadius(function(d) {
				return rwin(d.data.wins - d.data.losses);
			  })
			.innerRadius(function(d) {
				return rloss(d.data.losses - d.data.wins)
			  });

		// Transition the paths to the new wedges
		donut.data(pie.sort(sortByScore))
			.transition()
			.duration(cycle)
			.attr("d", arcChoice);
		mask.transition()
			.duration(cycle)
			.attr("r", radius*2/3);
	} // transitionThreshold()


	function transitionWinLoss() {
		var donut = svg.selectAll(".wins"),
			mask = svg.selectAll(".lossring");

		// Adjust the scales to win/loss
		rwin.domain([0,d3.max(choices, function(d) { return d.wins; })]);
		rloss.domain([0,d3.max(choices, function(d) { return d.losses; })]);

		// Recalculate the wedges to show win/loss
		arcChoice
			.innerRadius(function(d) { return rloss(d.data.losses); })
			.outerRadius(function(d) { return rwin(d.data.wins); });

		// Transition paths to the new wedges
		donut.data(pie.sort(sortByScore))
			.transition()
			.duration(cycle)
			.attr("d", arcChoice);
		mask.transition()
			.duration(cycle)
			.attr("r", radius*2/3);
	} // transitionWinLoss()


	function transitionCounts() {
		var donut = svg.selectAll(".wins"),
			mask = svg.selectAll(".lossring");

		rtotal.domain([
			0, d3.max(choices, function(d) {return d.wins + d.losses;})
		]);

		donut//.data(pie.sort(sortByTotal))
		  .transition()
			.duration(cycle)
			.attr("d", arcTotal);
		mask.transition()
			.duration(cycle)
			.attr("r", radius/3);
	} // transitionCounts()

	function sortByTotal(a, b) {
		return d3.ascending([
			+a.data.wins + +a.data.losses,
			+b.data.wins + +b.data.losses
		]);
	}

	function sortByScore(a, b) {
		return d3.descending(+a.score, +b.score);
	}
} // scorify()

scorify();
d3.select("#button6")
	.each(function(d) { this.click(); });

