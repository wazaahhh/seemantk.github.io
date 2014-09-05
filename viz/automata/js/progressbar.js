function slider()
{
    var margin = {top: 5, left: 15, right: 15, bottom: 5},
        width  = 300 - margin.left - margin.right,
        height = 40  - margin.top  - margin.bottom,
        brush  = d3.svg.brush(),
        handle, slider,
        value  = 0,
		axis = d3.svg.axis().orient("bottom").tickSize(0).tickPadding(12),
        upd    = function(d){value = d;},
        cback  = function(d){};

    var x = d3.scale.linear()
        .range ([0,width])
        .clamp(true);

    function chart(el)
    {
        brush.x(x).extent([0,0])
             .on("brush", brushed);

		axis.scale(x)
			.tickFormat("");

        var svg = el.attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top  + margin.bottom)
            .append("g").attr("transform","translate(" + margin.left + "," + margin.top + ")");

        svg.append("g")
           .attr("class","axis")
           .attr("transform", "translate(0,"+height/2+")")
           .call(axis);

        slider = svg.append("g")
            .attr("class","slider")
            .call(brush);

        slider.selectAll(".extent,.resize").remove();
        slider.select(".background").attr("height",height)

        handle = slider.append("circle")
            .attr("class","handle")
            .attr("transform", "translate(0,"+height/2+")")
            .attr("cx",x(value))
            .attr("r",9);

        function brushed()
        {
            if (d3.event.sourceEvent) value = x.invert(d3.mouse(this)[0]);
            upd(value);
            cback(value);
        }
        upd = function(v)
        {
            brush.extent([v,v]);
            value = brush.extent()[0];
            handle.attr("cx",x(value));
        }
    }

    chart.margin   = function(_) { if (!arguments.length) return margin;  margin = _; return chart; };
    chart.callback = function(_) { if (!arguments.length) return cback;   cback = _; return chart; };
    chart.value    = function(_) { if (!arguments.length) return value;   upd(_); return chart; };

	chart.domain   = function(_) {
		if (!arguments.length) return x.domain();
		x.domain(_);
		d3.select(".axis").call(axis.scale(x));

		return chart;
	};

    return chart;
}

