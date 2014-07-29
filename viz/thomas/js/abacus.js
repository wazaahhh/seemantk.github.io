queue()
	.defer(d3.json, "agents3.json")
	.await(gestate);

var iters, anim;
function gestate(error, incdata) {
	var grid_size = incdata.input.grid_size,
		width = 500,
		length = width / grid_size;

	iters = incdata.output.mv;
	iters.unshift(d3.map(incdata.input.strategy_init)
							.values()
							.map(function(d, i) { return [i, d]; }));

	anim = {
		fwd:   true,
		pause: false,
		index: 0,
		dest:  iters.length-1,
		cycle: 50,
	};

    d3.select("#pause").on("click", function() {
        anim.pause = !anim.pause;
        draw();
    });
    d3.select("#play").on("click", function() {
        anim.fwd = true;
        if(anim.pause) {
            anim.pause = false;
            d3.timer(step(), anim.cycle);
        }
    });
    d3.select("#yalp").on("click", function() {
        anim.fwd = false;
        if(anim.pause) {
            anim.pause = false;
            d3.timer(step(), anim.cycle);
        }
    });



	var fill = d3.scale.ordinal()
			.domain([-1, 0, 1])
			.range(["white", "red", "green"]);

	var loc = d3.scale.linear()
			.domain([0,grid_size])
			.range([0,width]);

	var svg =
			d3.select("#tardis").append("svg")
				.attr("class", "mainviz")
				.attr("width", width)
				.attr("height", width);
	

	var grid = svg.append("g").attr("class", "world");
	d3.timer(step(), anim.cycle);

	/*
	 * CALLBACK: step forward to the next iteration.
	 * (this function is a callback for d3.timer())
	 */
	function step() {
		return function() {
			if(anim.pause) return true;
			if(anim.index === anim.dest) {
				anim.pause = true;
				return true;
			}

			console.log("drawing", iters[anim.index]);
			draw();

			// Advance to the next cycle
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
			d3.timer(step(), anim.cycle);
			return true;
		}
	} // step()

	function draw() {
		var cell = grid.selectAll(".cell")
					.data(iters[anim.index], function(d) { return d[0]; });

		d3.select("#legend-title").text("Iteration: " + anim.index);

		// Enter
		cell.enter().append("rect")
	  		.attr("class", "cell")
			.attr("width", length)
			.attr("height", length)
			.attr("y",    function(d) { return loc(row(d[0])); })
			.attr("x",    function(d) { return loc(col(d[0])); })

		// Update
		cell.transition()
			.duration(anim.cycle)
			.attr("fill", function(d) { return fill(d[1]); });

	} // draw()

	function row(index) {
		return (index / grid_size) >> 0; // integer division
	} // row()

	function col(index) {
		return index % grid_size;
	} // col()
}
