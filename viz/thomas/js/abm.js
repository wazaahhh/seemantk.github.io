function abm() {
	var STRATEGY_SET = {C: 1, D: 0},
		grid_size    = 49,
		iterations   = 200,
		MCS          = Math.pow(grid_size,2) * iterations, // Monte Carlo Steps
		percs        = 0.5, // Grid Sparsity
		r            = 0.05, // Probability of not copying best strategy
		q            = 0.05, // Chance of spontaneous cooperation (noise 1)
		m            = 1, // Probability of migration
		s            = 1, // Proability of expelling
		M            = 5; // Moore's Distance


	function property_game() {
		var size = 100,
			pfs  = 1,
			strategies = {};

		function my() {
			l = Math.pow(size, 2);

			var shuffled_grid = d3.shuffle(d3.range(l));

			var limit = Math.round(pfs * l + Math.random() - 0.5);
			var subgrid = d3.shuffle(
						pfs < 1 ? shuffled_grid.slice(0,limit) : d3.range(l)
					);			
			var rest = pfs < 1 ? [] : shuffled_grid.slice(limit);

			subgrid.each(function(d) {
				strategies[d] = STRATEGY_SET
									.values()
									[Math.floor(Math.random() * choices.length)];
			});

			rest.each(function(d) {
				strategies[d] = -1;
			});
		} // my();

		my.size = function(value) {
			if(!arguments.length) return size;
			size = value;
			return my;
		};

		my.pfs = function(value) {
			if(!arguments.length) return pfs;
			pfs = value;
			return my;
		};

		return my;
	}
}
