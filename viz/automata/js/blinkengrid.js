/*
 * A square grid of square cells
 */
function blinkengrid() {
    /*
     * Internal variables
     */
    var viz, svg
        , margin = { top: 5, right: 15, bottom: 5, left: 15 }
        , width = 500, height = 500 // square by default
        , id = "#blinkengrid"
    ;

    var grid
        , cell_count = 49 // default based on Thomas' abm automata
        , coords = d3.scale.linear()
                .range([0, width])
    ;

    var fontfile = "fonts.csv"
		, font
		, message
        , offset = {}
        , lights
    ;


    /*
     * Main function object, which draws/updates the progress bar
     */
    function blinken(selection) {
		viz = selection;

		build_font_table();
		initialize();
    } // blinken

	function build_font_table() {
		queue()
			.defer(d3.csv, fontfile)
			.await(function(error, bitmap) {
				var columns = d3.keys(bitmap[0]);

				columns.shift();

        		bitmap.forEach(function(f) {
            		f.matrix = columns.map(function(c) {
                		return ("0000000" + parseInt(f[c],16).toString(2))
                    		.slice(-8)
                    		.split('')
                    		.map(function(bit) { return +bit; });
            		})
					switch(f.Letter) {
						case "i":
						case "j":
						case "k":
						case "l":
						case "1":
						case "!":
						case "(":
						case ")":
							break;
						default:
 	 	 	 	 	 	 	 // right-pad each letter
            				f.matrix.push([0,0,0,0,0,0,0,0]);
					}
        		});

        		font = d3.nest()
            		.key(function(d) { return d.Letter; })
            		.rollup(function(leaves) { return leaves[0].matrix; })
            		.map(font, d3.map);
			});
	} // build_font_table

	function initialize() {
        viz.selectAll(id).remove();

        svg = viz 
          .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
			.attr("id", id)
		  .append("g")
			.attr("transform", "translate(" + margin.left +","+ margin.top + ")")
		;

		var length = d3.min([width, height]); // length of a cell's side

		svg.selectAll("rect")
    		.data(d3.range(cell_count * cell_count), function(d, i) { return i; })
  	  	  .enter().append("rect")
    		.attr("class", "off") // by default all lights are off
    		.attr("id", function(d, i) { return "cell" + i; })
    		.attr("x", function(d, i) { return coords( i % cell_count)      ; })
    		.attr("y", function(d, i) { return coords((i / cell_count) >> 0); })
    		.attr("width",  length / cell_count)
    		.attr("height", length / cell_count)
		;
	} // initialize()


    /*
     * Getter/Setter closure functions
     */
    blinken.width = function(value) {
        if(!arguments.length) return width;

        width = value;
        coords.range([0, width]);
        return blinken;
    } // blinken.width()


    blinken.height = function(value) {
        if(!arguments.length) return height;

        height = value;
        return blinken;
    } // blinken.height()


    blinken.cell_count = function(value) {
        if(!arguments.length) return cell_count;

        cell_count = value;
        coords.domain([0, cell_count]);
        return blinken;
    } // blinken.cell_count()

	blinken.grid = function(value) {
		return svg;
	} // blienken.grid()

    // Return the function object as the final thing
    return blinken;
}
