function progressbar() {
    /*
     * Internal variables
     */
    var callback
        , height 
        , width = 960 // by default, assume a full-width slider
        , margin = { top:20, right:50, bottom: 20, left:50 }
        , x = d3.scale.linear()
            .domain([0,100])
            .clamp(true)
        , axis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat("")
        , brush = d3.svg.brush()
            .x(x)
            .extent([0,0])
        , slider
        , handle
        ;

    // The main function object, which generates the chart
    function my(container) {
        my.width(container.node().offsetWidth);
        my.height(container.node().offsetHeight);
    
        brush.on("brush", brushed);

        var svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            ;

        var x_axis = svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height / 2 + ")")
          .call(axis);

		x_axis
            .select(".domain")
            .select(function() {
                return this.parentNode.appendChild(this.cloneNode(true));
            })
            .attr("class", "halo");

		x_axis.selectAll(".tick")
			.style("cursor", "pointer")
			.on("click", function(d) {
				console.log(d);
			});

        slider = svg.append("g")
            .attr("class", "slider")
            .call(brush);

        slider.selectAll(".extent,.resize")
            .remove();

        handle = slider.append("circle")
            .attr("class", "handle")
            .attr("transform", "translate(0," + height / 2 + ")")
            .attr("r", 5);

        slider.call(brush.event);

        /*
         * Callback for the brush
         */
        function brushed() {
            var value = brush.extent()[0];

            if(d3.event.sourceEvent) { // not programmatic
                value = x.invert(d3.mouse(this)[0]);
                brush.extent([value,value]);
                callback(Math.round(value));
            }

            handle.attr("cx", x(value));
        } // brushed()
    } // my()

    /*
     * Public Method to move the handle's position.
     */
    my.move = function(value) {
        if(arguments.length) {
            slider.call(brush.extent([value,value]));
            slider.call(brush.event);
        }

        return my;
    } // my.move()

    /*
     * Getters/Setters for the public API
     */
    my.width = function(value) {
        if(!arguments.length) return width;
        width = value;
        x.range([0, width - margin.left - margin.right]);

        return my;
    } // my.width()

    my.height = function(value) {
        if(!arguments.length) return height;
        height = value;

        return my;
    } // my.height()


    my.domain = function(value) {
        if(!arguments.length) return x.domain();

        x.domain(d3.extent(value));
        brush.x(x);
        d3.select(".axis")
            .call(axis.scale(x).tickValues(value));

        return my;
    } // my.domain()

    my.callback = function(value) {
        if(!arguments.length) return callback;
        callback = value;

        return my;
    } // my.callback()


    // THE LAST LINE: always return the main function object
    return my;
}

