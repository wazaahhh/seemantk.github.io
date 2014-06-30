queue()
    .defer(d3.json, "questions.json")
    .await(pre_questify);

function questify(dataset, me) {
	var radios = ['none', 'questions'],
		columns = ['category', 'fill', 'questions', 'votes'],
		fields  = ['category', 'questions', 'votes'];

	var bladeTweens = {};

    var width = 500,
        height = 500,
        radius = Math.min(width, height)/2,
        duration = 750; // milliseconds

	var magnification = "all", // initial magnification
		categorylock  = true;

	var tooltip = d3.select(".tooltip")
					.style("opacity", 0);

	var categories = 
			d3.nest()
				.key(function(d) { return d.category_title; })
				.rollup(function(leaves) {
					var mine = leaves.filter(function(d) {
									return d.user_id === me;
								});
					return {
						all: {
							votes: d3.sum(leaves, function(d) {
										return d.votes_count;
									}),
							issues: leaves.length,
							values: []
						},
						me: {
							votes: d3.sum(mine, function(d) {
										return d.votes_count;
									}),
							issues: mine.length,
							values: mine
						}
					};
				  })
				.entries(dataset);

	// Initial sort
	dataset.sort(function(a, b) {
		return d3.descending(a.updated_at, b.updated_at);
	});

	var fill = d3.scale.category20(),
		greys =
			d3.scale.ordinal()
				.range([d3.hsl("#fff"), d3.hsl("#000")]);

	/*
	 * Axes for extent, height and radius
	 */

	var x = d3.scale.linear().range([0, 2 * Math.PI]), // wedge extent(?) 
		y = d3.scale.sqrt().range([0, radius]);        // wedge radial distance

	var bladerange = [radius*2/3+5, radius], // wedge heights
		rall = d3.scale.linear().range(bladerange)
				.domain([0,
					d3.max(dataset, function(d) { return d.votes_count; })
				]),
		rme  = d3.scale.linear().range(bladerange)
				.domain([0,
					d3.max(dataset.filter(function(d) {return d.user_id === me;}),
						function(d) {
							return d.votes_count;
						})
				]);


	/*
	 * Category Donut - aka the Lifebuoy.  This always reflects the current
	 * category distribution based on magnification (me, all, group).
	 * Based on Pie Chart Update II: http://bl.ocks.org/mbostock/1346410
	 */
	var arc = {
		safebuoy: d3.svg.arc()
				.innerRadius(radius*2/3 - 12)
				.outerRadius(radius*2/3),
		/* Unused
		lifebuoy: d3.svg.arc()
				.innerRadius(radius*1/3)
				.outerRadius(radius*1/3 + 5),
		*/
		heel: d3.svg.arc()
				.innerRadius(radius*2/3 - 12)
				.outerRadius(radius*2/3),
		blade: {
			all: d3.svg.arc()
            		.innerRadius(radius*2/3)
            		.outerRadius(function(d) { return rall(d.data.votes_count); }),
			me: d3.svg.arc()
					.innerRadius(radius*2/3)
					.outerRadius(function(d) {
						return d.data.user_id === me
								? rme(d.data.votes_count)
								: rall(0);
					  }),
		}
	};

	var pie = {
		buoy: d3.layout.pie()
				.value(function(d) { return d.values.all.issues; })
				.sort(function(a, b) {
					return d3.ascending(a.key, b.key);
				}),
		fan: d3.layout.pie()
				.value(function(d) { return 1; })
				.sort(function(a, b) {
					return d3.ascending(a.category_title, b.category_title);
				}),
	};

    var svg =
			d3.select(".viz").append("svg")
				.attr("class", "mainviz")
        		.attr("width", width)
        		.attr("height", height)
	  	  	  .append("g")
				.attr("transform", "translate(" + width/2 + "," + height/2 + ")");

	draw();

	function draw() {
		var tortilla = svg.append("g").attr("class", "questions");
		tortilla.datum(dataset).selectAll(".blade")
				.data(pie.fan)
			  .enter().append("path")
				.attr("class", "blade")
				.classed("notme", function(d) {
					return d.data.user_id === me ? false : true;
				  })
				.attr("d", arc.blade.all)
				.attr("fill", function(d) {
					return d.data.user_id === me
						? fill(d.data.category_title)
						: "#ccc";
				  })
				.on("mouseover", function(d) {
					tooltip.html(d.data.full_question);
					tooltip.transition().duration(200)
						.style("opacity", 0.9)
						.style("left", (d3.event.pageX + 14) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
				  })
				.on("mouseout", function(d) {
					tooltip.transition().duration(500)
						.style("opacity", 1e-6);
				  })
				.each(stash); // store initial angles

		tortilla.datum(dataset).selectAll(".heel")
				.data(pie.fan)
			.enter().append("path")
				.attr("d", arc.heel)
				.attr("class", "heel")
				.attr("fill", function(d) { return fill(d.data.category_title);})
				.on("mouseover", function(d) {
					tooltip.html(d.data.category_title);
					tooltip.transition().duration(200)
						.style("opacity", 0.9)
						.style("left", (d3.event.pageX + 14) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
				  })
				.on("mouseout", function(d) {
					tooltip.transition().duration(500)
						.style("opacity", 1e-6);
				  })
				.each(stash); // store initial angles

		var buoy = svg.append("g").attr("class", "categories");
		buoy.datum(categories).selectAll("path")
				.data(pie.buoy)
			.enter().append("path")
				.attr("d", arc.safebuoy)
				.style("fill", function(d) { return fill(d.data.key); })
				.on("mouseover", function(d) {
					tooltip.html(d.data.key);
					tooltip.transition().duration(200)
						.style("opacity", 0.9)
						.style("left", (d3.event.pageX + 14) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
				  })
				.on("mouseout", function(d) {
					tooltip.transition().duration(500)
						.style("opacity", 1e-6);
				  })
				.style("cursor", "pointer")
				.on("click", function(d) { zoomcat(d.data.key); })
				.each(stash); // store initial angles


		/*
		 * Legend table and controls
		 */
		// Reset the all/me dropdown to "all" on load
		d3.select("#filter").node().value = "all";
		// Attach the all/me dropdown to the magnifier() function
		d3.select("#filter").on("change", magnifier);
		var legend = d3.select("#legend");

		// Header Row
		var header = legend.select("thead");

					
		header.append("tr").selectAll("th").data(radios)
			  .enter().append("th")
				.attr("colspan", function(d) { return d === "none" ? 3 : 2; })
				.each(function(d) {
					if(d==="none") {
						d3.select(this)
						  .append("div")
							.attr("class", "checkbox")
							.classed("text-left", true)
						  .append("label")
							.text("Group by category")
						  .append("input")
							.attr("type", "checkbox")
							.attr("checked", true)
							.on("change", rearranger);
					};
				});

		header.append("tr").selectAll("th").data(fields)
		  	  	  .enter().append("th")
		  			.attr("colspan", function(d) {return d==="category" ? 2 : 1;})
					.attr("class", function(d) { return "cell-"+d; })
					.text(function(d) { return d; });
		
		// Data Rows
		var rows = legend.select("tbody").selectAll("tr")
						.data(categories)
					.enter().append("tr");

		var cells = rows.selectAll("td")
						.data(function(row) {
							return columns.map(function(col) {
								return [col, row];
							});
						})
					.enter().append("td");

		cells.attr("class", function(d) { return "cell-"+d[0]; });

		//  Color the appropriate cell on each row.
		cells.filter(function(d) { return d[0] === "fill"; })
			.style("background", function(d) {
				var color = d3.rgb(fill(d[1].key));
				var rgba = "rgba(" +
					color.r + "," +
					color.g + "," +
					color.b + "," +
					(categorylock === "off"
						? (magnification === "me" ? 1 : 0.4)
						: 1) + ")";
				return rgba;
			});

		// Fill in the remaining cells on each row.
		cells.filter(function(d) { return d[0] === "category"; })
			.text(function(d) { return d[1].key; });

		cells.filter(function(d) { return d[0] === "votes"; })
			.text(function(d) { return d[1].values[magnification].votes; });

		cells.filter(function(d) { return d[0] === "questions"; })
			.text(function(d) { return d[1].values[magnification].issues; });




		function magnifier() {
			magnification = this.value;

			var buoyTween = safebuoyTween;

			if(this.value === "me") { // zooming in from "all" from to "me"
				/*
				 * Update the legend
				 */
				d3.select("#legend").selectAll("td.cell-votes")
					.text(function(d) {return d[1].values[magnification].votes;});

				d3.select("#legend").selectAll("td.cell-questions")
					.text(function(d) {return d[1].values[magnification].issues;});

				/*
				 * Retract all bars except "mine".
				 * Magnify max("mine") to maximum height
				 */
				d3.select("g.questions").selectAll("path.blade")
					.transition().duration(duration)
					.attr("d", arc.blade.me);

				// Switch the blades to only make room for matching user_id
				pie.fan.value(function(d) { return d.user_id === me ? 1 : 0; });

				d3.select("g.questions").selectAll("path.blade")
					.data(pie.fan)
			  	  .transition().delay(duration).duration(duration)
					.attr("d", arc.blade.me)
					.attrTween("d", bladeTweens.me);

				// Match the heels to the blades
				d3.select("g.questions").selectAll("path.heel")
					.data(pie.fan)
			  	  .transition().delay(duration).duration(duration)
					.attrTween("d", heelTween);

				// Switch the middle categories ring to reflect the new ratios.
				pie.buoy.value(function(d) { return d.values.me.issues; });

				d3.select("g.categories").selectAll("path")
					.data(pie.buoy)
			  	  .transition().delay(duration).duration(duration)
					.attrTween("d", buoyTween);
			} else { // zooming out from "me" to "all"
				/*
				 * Update the legend -- ugh, DRY violation
				 */
				d3.select("#legend").selectAll("td.cell-votes")
					.html(function(d) {return d[1].values[magnification].votes;});

				d3.select("#legend").selectAll("td.cell-questions")
					.html(function(d) {return d[1].values[magnification].issues;});

				// Switch the blades to only make room for matching user_id
				pie.fan.value(function(d) { return 1; });

				d3.select("g.questions").selectAll("path.blade")
					.data(pie.fan)
			  	  .transition().duration(duration)
					.attr("d", arc.blade.all)
					.attrTween("d", bladeTweens.me);

				// Match the heels to the blades
				d3.select("g.questions").selectAll("path.heel")
					.data(pie.fan)
			  	  .transition().duration(duration)
					.attrTween("d", heelTween);

				// Switch the middle categories ring to reflect the new ratios.
				pie.buoy.value(function(d) { return d.values.all.issues; });

				d3.select("g.categories").selectAll("path")
					.data(pie.buoy)
			  	  .transition().duration(duration)
					.attrTween("d", buoyTween);

				// Switch the bar heights back
				d3.select("g.questions").selectAll("path.blade")
					.transition().delay(duration).duration(duration)
					.attr("d", arc.blade.all);

			} // zooming out
		} // magnifier()


		function rearranger() {
			categorylock = !categorylock;
			if(!categorylock) {
				/*
				 * Hide the buoy to show the heels underneath
				 */
				d3.select("g.categories").selectAll("path")
			  	  .transition().duration(duration)
					.style("fill-opacity", 1e-6)
				  .transition().delay(duration)
					.attr("display", "none");

				/*
				 * Re-sort the fan in chronological order, by activity
				 */
				pie.fan.sort(function(a, b) {
					return d3.descending(a.updated_at, b.updated_at);
				  });

				// Blades
				d3.select("g.questions").selectAll("path.blade")
					.data(pie.fan)
			  	  .transition().delay(duration).duration(duration)
				  	.ease("elastic")
					.attrTween("d", bladeTweens[magnification]);

				// Heels
				d3.select("g.questions").selectAll("path.heel")
					.data(pie.fan)
				  .transition().duration(duration)
					.attr("display", null)
			  	  .transition().delay(duration).duration(duration)
				  	.ease("elastic")
					.attrTween("d", heelTween)
					.style("fill-opacity", function(d) {
						return d.data.user_id === me ? 1 : .4;
					  });
			} else {
				/*
				 * Re-sort the fan in category order
				 */
				pie.fan = pie.fan.sort(function(a, b) {
					return d3.ascending(a.category_title, b.category_title);
				  });

				// Blades
				d3.select("g.questions").selectAll("path.blade")
					.data(pie.fan)
			  	  .transition().duration(duration)
				  	.ease("quad")
					.attrTween("d", bladeTweens[magnification]);

				// Heels
				d3.select("g.questions").selectAll("path.heel")
					.data(pie.fan)
			  	  .transition().duration(duration)
				  	.ease("quad")
					.attrTween("d", heelTween)
					.style("fill-opacity", 1)
				  .transition().delay(duration*2)
				  	.attr("display", "none");


				// Lock the lifebuoy into safe mode.
				// The heels got hidden above, and this gets unhidden now
				d3.select("g.categories").selectAll("path")
					.transition().delay(duration).duration(duration)
					.style("fill-opacity", 1)
					//.attr("d", arc.safebuoy)
					.attr("display", null);

			}

		} // rearranger()


		function zoomcat(cat) {

		} // zoomcat()
	}


	// Stash the old values for transition (er, apparently).
	function stash(d, i) {
		this._current = d;
		this._currindx = i;
	}

	// Interpolate the arcs in data space.
	// This and stash() are taken from: http://bl.ocks.org/mbostock/4063423
	function safebuoyTween(a) {
		var i = d3.interpolate(this._current, a);
		this._current = i(0);
		return function(t) {
			return arc.safebuoy(i(t));
		};
	} // safebuoyTween()

	function lifebuoyTween(a) {
		var i = d3.interpolate(this._current, a);
		this._current = i(0);
		return function(t) {
			return arc.lifebuoy(i(t));
		};
	} // lifebuoyTween()

	bladeTweens.all = function (a) {
				var i = d3.interpolate(this._current, a);
				this._current = i(0);
				return function(t) {
					return arc.blade.all(i(t));
				}
			};
	bladeTweens.me  = function (a) {
				var i = d3.interpolate(this._current, a);
				this._current = i(0);
				return function(t) {
					return arc.blade.me(i(t));
				};
			};

	function heelTween(a) {
		var i = d3.interpolate(this._current, a);
		this._current = i(0);
		return function(t) {
			return arc.heel(i(t));
		};
	} // heelTween()
} // questify()




function pre_questify (error, incdata) {
	var dataset =
			d3.map(incdata.item.issues.with_choices).values();

	dataset.forEach(function(d) {
		d.key           = d.full_question;
		d.updated_at    = new Date(d.updated_at).getTime();
		d.user_id       = +d.user_id;
		d.prompts_count = +d.prompts_count;
		d.votes_count   = +d.votes_count;
		d.choices_count = +d.choices_count;
		d.choices       = d3.map(d.choices).values();
		d.choices.forEach(function(c) { c.key = c.data; });
	});

	/*
	 * Viz title, with a select box
	 */
	d3.select("#viz-title").append("text")
		.html("Issues: <select id=\"filter\"><option>me</option><option>all</option></select>");

	/*
	 * Placeholder for what the upstream datashape may look like
	 */
	var users = d3.nest()
					.key(function(d) { return d.username; })
					.map(dataset, d3.map);

	d3.select("#viz-nav").selectAll("button")
		.data(users.keys().sort(d3.ascending), function(d) { return d; })
	  .enter().append("button")
		.attr("id", function(d, i) { return "button" + i; })
		.attr("type", "button")
		.attr("class", "btn btn-info")
		.text(function(d) { return d; })
		.style("cursor", "pointer")
		.on("click", function(d) {
			d3.selectAll(".mainviz").remove();
			d3.selectAll("th").remove();
			d3.selectAll("tr").remove();
			questify(dataset, users.get(d)[0].user_id);
			d3.selectAll("input").filter(function(d, i) { return i === 0; })
				.property("checked", true);
		});

	d3.select("#button2").each(function(d) { this.click(); });
	d3.select("#button4").each(function(d) { this.click(); });
}
