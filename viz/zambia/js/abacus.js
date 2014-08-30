queue()
    .defer(d3.json, "facts.json")
    .defer(d3.xml,  "img/Flag_of_Zambia.svg")
    .await(chartify);

function chartify(error, facts, figure) {
    // Let's put the flag on screen first
    d3.select(".viz").node().appendChild(figure.getElementsByTagName("svg")[0]);

    var svg = d3.select("svg");
    
    svg.attr("transform", "scale(.5)");

    // Now we can calculate various dimensions
    var margin = {top: 50, left: 30, down: 50, right: 20}
        , chart = {
            height: svg.node().viewBox.animVal.height,
            width : svg.node().viewBox.animVal.width
          }
		, widthrbo = d3.scale.linear()
			.domain([0, 100])
			.range([0, chart.width])
		, heightrbo = d3.scale.linear()
			.domain([64.3,100])
			.range([chart.height * 0.643, chart.height])
			.clamp(true)
		, xrbo = d3.scale.linear()
			.domain([0, 100])
			.range([chart.width, 0])
		, ygreen = d3.scale.linear()
			.range([chart.height, 0])
        , defaults = {
			rbo: d3.select(".rbo").node().getBoundingClientRect().width / chart.width
		  }
		;

    var cycle = 250 // animation frame
        , index = 0
        , colors = {
            rgb: d3.scale.ordinal()
                .domain(["green", "oldgreen", "orange", "black", "red"])
                .range(["#198a00", "#oe5400", "#ef7d00", "#000", "#de2010"]),
            green: d3.scale.ordinal()
                
            }
        ;

    colors.green.rangeBands([colors.rgb("green"), colors.rgb("oldgreen")]);

    layers = sortify(facts.exports);
	console.log(facts);

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
     *      - minimum percentage of each RBO = ~.06%
     *      - maximum percentage of each RBO = ~64.2%
     */
    var area = d3.svg.area()
            .x(function(d) { return d.name; })
            .y0(function(d) { return d.y0; })
            .y1(function(d) { return d.y0 + d.y; })
        , stack = d3.layout.stack()
            .values(function(d) { return [d]; })
            .x(function(d) { return d.name; })
            .y(function(d) { return d.value; })
        ;

	flagify();

    function flatten() {
        var flag = svg.selectAll("rect")
            .data(layers);
        flag.selectAll(".green").style("fill", function(d) { return d.color; });

    } // flatten()

    function flagify() {
		var h = heightrbo(d3.sum(layers.get('rbo').map(function(d) { return d.value; })));
        svg.selectAll(".rbo").data(stack(layers.get('rbo')))
          .transition().duration(500)
            .attr("x", function(d) { return xrbo(d.y0) - widthrbo(d.y); })
            .attr("width", function(d) { return widthrbo(d.y); })
            .attr("height", h)
		;

		/*
        svg.selectAll(".green").data(stack(layers.get('green')))
            .transition().duration(500)
            .attr("y", function(d) { return ygreen(d.y0); })
            .attr("height", function(d) { return ygreen(d.y + d.y0); })
            ;
		*/
    } // flagify()

    function sortify(arr) {
        var sorted = arr.sort(function(a, b) {
                return Math.abs(a.value - defaults.rbo) >
                    Math.abs(b.value - defaults.rbo)
            });

        sorted
            .forEach(function(d, i) {
                d.group = i < 3 ? "rbo" : "green"; // classify
            })
            ;

        return d3.nest()
            .key(function(d) { return d.group; })
            .sortValues(function(a, b) {
                return d3.descending(a.value, b.value);
            })
            .map(sorted, d3.map)
            ;
    } // sortify()
};

