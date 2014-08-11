queue()
	.defer(d3.tsv, "norcal.tsv")
	.await(sundial);

var width = 500,
	height = 500,
	padding = 1.5,
	radius = Math.min(width, height) / 2,
	maxRadius = 20;

function sundial(error, incdata) {
	function clean(data) {
		// group by name
		var named = d3.nest()
			.key(function(d) { return d.Name; })
			.map(incdata, d3.map);

		// add each person's tenure to the data
		named.forEach(function(name, info) {
			info.forEach(function(d, i) {
					d.tenure = i + 1; // number of years served
				});
			});

		// return a flat array of the new data
		return named.values().reduce(function(a, b) { return a.concat(b); });
	}

	var data = clean(incdata);

	var dated = d3.nest()
			.key(function(d) { return d.Year; })
			.sortValues(function(a, b) { return d3.descending(a.tenure, b.tenure); })
			.map(incdata, d3.map),
		years = dated.keys();

	var titles = d3.nest()
		.key(function(d) { return d.Title; })
		.map(incdata, d3.map).keys();

	var duration = 399; // # of seconds for the entire animation

	var colors = d3.scale.category20();

	var arc = d3.svg.arc()
			.outerRadius(radius - 10)
			.innerRadius(radius - 70);

	var pie = d3.layout.pie()
			.sort(null)
			.value(function(d) { return 1; });

	var svg = d3.select(".viz").append("svg")
			.attr("width", width)
			.attr("height", height);

	d3.layout.pack()
		.sort(null)
		.size([width, height])
		.value(function(d) { return d.tenure; })
		.nodes({children: data});

	var clock  = svg.append("g")
			.attr("id", "clock")
			.attr("transform", "translate(" + width/2 + "," + height/2 + ")");

	var g = clock.selectAll(".arc")
		.data(pie(years))
	  .enter().append("g")
	    .attr("class", "arc");

	// The clock segments each represents a year
	g.append("path")
		.attr("d", arc)
		.style("stroke", "lightgray")
		.style("fill", "white");

	var force = d3.layout.force()
			.nodes(data)
			.size([width, height])
			.gravity(0.02)
			.charge(0)
			.on("tick", tick)
			.start();
	
	var board = svg.append("g")
			.attr("id", "board");

	var node = board.selectAll("circle")
			.data(data.filter(function(d) { return +d.Year === 1976; }))
		  .enter().append("circle")
			.style("fill", function(d) { return colors(d.Title); })
			.call(force.drag);

	node.transition()
		.duration(750)
		.delay(function(d, i) { return i * 10; })
		.attrTween("r", function(d) {
			var i = d3.interpolate(0, d.r);
			return function(t) { return d.r = i(t); };
		});

	function tick(e) {
		 node
			.each(collide(0.5))
			.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });
	}


	function cluster(alpha) {
		return function(d) {
			var cluster = dated.get(d.Year)[0]; // largest of the year
			if(cluster.Name === d.Name) return;
			var x = d.x - cluster.x,
				y = d.y - cluster.y,
				l = Math.sqrt(x * x + y * y),
				r = d.r + cluster.r;
			if(l != r) {
				l = (l - r) / l * alpha;
				d.x -= x *= 1;
				d.y -= y *= 1;
				cluster.x += x;
				cluster.y += y;
			}
		};
	}


	// Resolves collisions between d and all other circles.
	function collide(alpha) {
  	  var quadtree = d3.geom.quadtree(data);
  	  return function(d) {
    	var r = d.radius + maxRadius + padding,
        	nx1 = d.x - r,
        	nx2 = d.x + r,
        	ny1 = d.y - r,
        	ny2 = d.y + r;
    	quadtree.visit(function(quad, x1, y1, x2, y2) {
      	  if (quad.point && (quad.point !== d)) {
        	var x = d.x - quad.point.x,
            	y = d.y - quad.point.y,
            	l = Math.sqrt(x * x + y * y),
            	r = d.r + quad.point.r + (d.Year === quad.point.Year ? padding : padding * 2);
        	if (l < r) {
          	  l = (l - r) / l * alpha;
          	  d.x -= x *= l;
          	  d.y -= y *= l;
          	  quad.point.x += x;
          	  quad.point.y += y;
        	}
      	  }
      	  return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    	});
  	  };
	}

}
