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
                .domain([0, cell_count])
    ;

    var title
        , bitmap
        , font
    ;


    /*
     * Main function object, which draws/updates the progress bar
     */
    function blinken(selection) {
        viz = selection;
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
        draw(d3.range(cell_count * cell_count).map(function(d, i) { return [i, 0]; }), true);
    } // blinken


    /*
     * Helper functions
     */

    /*
     * Build the font bitmap arrays
     */
    function build_font_table(hexmap) {
        bitmap = hexmap.map(function(f) {
            f.matrix = d3.keys(hexmap[0])
                .map(function(c) {
                    return ("0000000" + parseInt(f[c],16).toString(2))
                        .slice(-8)
                        .split('')
                        .map(function(bit) { return +bit; });
                });

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
            return f;
        });

        font = d3.nest()
            .key(function(d) { return d.Letter; })
            .rollup(function(leaves) { return leaves[0].matrix; })
            .map(bitmap, d3.map)
        ;
    } // build_font_table()


    /*
     * convert the word into bitmaps
     */
    function wordmap(sentence) {
        var word = d3.merge(sentence.split('')
                    .map(function(l) {
                        return font.get(l);
                    }))
            , offset = {
                col: Math.floor((cell_count - word.length)/2),
                row: Math.floor((cell_count / 2) - (word[0].length + 2))
            }
        ;
        return d3.merge(word.map(function(columns, i) {
            return columns.map(function(value, j) {
                return [(offset.row + j) * cell_count + i + offset.col, value];
            });
        }));
    } // wordmap()

    function draw(data, blank) {
        var length = d3.min([width, height]), // length of a cell's side
            cells = svg.selectAll("rect").data(data, function(d, i) { return i; });

        cells
          .enter().append("rect")
            .attr("id", function(d, i) { return "cell" + i; })
            .attr("x", function(d, i) { return coords( i % cell_count)      ; })
            .attr("y", function(d, i) { return coords((i / cell_count) >> 0); })
            .attr("width",  function() { console.log(length / cell_count); return length / cell_count; })
            .attr("height", length / cell_count)
            .attr("class", "on")
        ;

        if(blank) { cells.exit().attr("class", "off"); }
    } // draw()




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
    } // blinken.grid()

    blinken.font = function(value) {
        if(!arguments.length) return font;

        build_font_table(value);
    } // blinken.font()

    blinken.title = function(value) {
        if(!value) return;

        draw(wordmap(value), true);
        return;
    } // blinken.title()

    /*
     * Public API functions
     */
    blinken.progress = function(value) {
        if(!value) return;

        var message = d3.range(Math.round(value * cell_count / 100))
                .map(function() { return [1,1,1]; })
            , offset = Math.ceil((cell_count / 2)
                    + ((message[0] == undefined ? 0 : message[0].length) + 2))
            , hm = d3.merge(message.map(function(columns, i) {
                    return columns.map(function (bit, j) {
                        return [(offset + j) * cell_count + i, 0];
                    });
            }))
        ;

        var msg = svg.selectAll("rect")
                .data(hm, function(d) { return d[0]; })
                .attr("class", "progbar cooperator");

        return blinken;
    } // blinken.progress()



    // Return the function object as the final thing
    return blinken;
}
