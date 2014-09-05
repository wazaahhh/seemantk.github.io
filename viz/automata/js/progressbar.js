function progressbar() {
    /*
     * Internal variables
     */
    var callback
        , height 
        , width = 960 // by default, assume a full-width slider
        , margin = { top: 20, right: 15, bottom: 20, left: 15 }
        , brush
        , x = d3.scale.linear()
            .domain([0,100])
            .clamp(true)
        , axis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat("")
    ;

    // The main function object, which generates the chart
    function my(selection) {
        selection.each(function(d, i) { 
            my.width(this.offsetWidth);
            my.height(this.offsetHeight);
        
            var svg = d3.select(this).append("svg")
                    .attr("width", width - margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform"
                        , "translate(" + margin.left + "," + (margin.top / 2) + ")")
            , x_axis = svg.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(0," + height / 2 + ")")
                    .call(axis)
            ;

            x_axis
                .select(".domain")
                .select(function() {
                    return this.parentNode.appendChild(this.cloneNode(true));
                })
                .attr("class", "halo");

            brush = d3.svg.brush()
                    .x(x)
                    .extent([0,0])
                    .on("brush", function() {
                        var value = brush.extent()[0];

                        if(d3.event.sourceEvent) { // not programmatic
                            value = x.invert(d3.mouse(this)[0]);
                            brush.extent([value,value]);
                            callback(Math.round(value));
                        }

                        handle.attr("cx", x(value));
                    }) // brush callback()
                , slider = svg.append("g")
                    .attr("class", "slider")
                    .call(brush)
            ;

            slider.selectAll(".extent,.resize")
                .remove();

            var handle = slider.append("circle")
                .attr("class", "handle")
                .attr("transform", "translate(0," + height / 2 + ")")
                .attr("r", 5);

            slider.call(brush.event);
        });
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

