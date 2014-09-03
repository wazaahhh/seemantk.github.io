function agent_based_model() {
	var strategy_sets = d3.map({
			standard:   {T: 1.02, R: 1.0, P: 0.0, S: 0.0},
			helbing_yu: {T: 1.3,  R: 1.0, P: 0.1, S: 0.0}
		}),
		C, // Cooperation dictionary
		MCS; // Monte Carlo Steps

	// Getters only
	var	moves      = []
		counter  = 1,
		current    = {}, previous   = {}, // board state
		dispatch   = d3.dispatch("start", "end"),
		callback   = function() {},
		step       = function() {},
		game_set   = [[[],[]],[[],[]]],
		solution   = "helbing_yu";

	// Variables available to getters & setters.  Here with default values.
	var uploadToS3 = false,
		forceMove  = false,
		iterations = 100,
		grid_size  = 49,
		percs      = 0.5, // Grid Sparsity
		r          = 0.05, // Probability of not copying best strategy
		q          = 0.05, // Chance of spontaneous cooperation (noise 1)
		m          = 1, // Probability of migration
		s          = 1, // Probability of expelling
		M          = 5; // Moore's Distance

	function game() {
		this.step = function() {
			while(counter < MCS) {
				current = one_step(d3.map(previous));

				calc_coop_level(current);

				// conditions to break the loop
				if(C.c.length > 10) {
					var last = C.c[C.c.length - 1],
						frozen = C.c.slice(-10)
							.every(function(e, i, a) {
								return e === last;
							});

					if(frozen) {
						alert("frozen");
						return true;
					}
				}

				if(coop_level['c'] === 0) {
					console.log("no cooperators left");
					return true;
				}

				if(coop_level['d'] === 0) {
					console.log("no defectors left");
					return true;
				}

				if(counter % (Math.pow(grid_size, 2) - 1) === 0 &&
						d3.max(C['c'].slice(-3)) < 0.01) {
					console.log("lower threshold of cooperators reached");
					return true;
				}

				if(counter % (Math.pow(grid_size, 2) + 1) === 0) {
					console.log(counter + ": strategy: " + current);
				}

				if(counter % Math.pow(grid_size, 2) === 0) {
					C.counter.push(counter);
					C.c.push(coop_level['c']);
					C.d.push(coop_level['d']);
					C.e.push(coop_level['e']);
				}

				counter += 1;
				return d3.map(moves[moves.length - 1]).entries();
			} // while()
		};


		/*
		 * Basic Evolutionary Game Theory Tools
		 */

		/*
		 * Find the 4 nearest neighbors.
		 * Argument: site
		 * Optional BOOLEAN argument: non_empty_sites
		 */
		function find_neighbors(site, strategy, non_empty_sites) {
			non_empty_sites = default_val(non_empty_sites, true);

			var size = Math.floor(Math.sqrt(strategy.keys().length)),
				hood = [site - 1, site + 1, site - size, site + size]
						.map(function(d) { return d % size; });

			console.log(size, site, hood);

			hood = non_empty_sites === true
				? hood.filter(function(d) { strategy.get(d) > -1; })
				: hood;

			console.log(size, site, hood);

			return hood;
		} // find_neighbors()

		/*
		 * Pay with all four nearest neighbors.
		 */
		function play_with_all_neighbors(site, strategy) {
			var po = {
				'all': {},
				'o_site': site,
				'o_pay_off': payoff(site, strategy)
			};

			var hood = find_neighbors(site, strategy);

			if(!hood.length) {
				// Empty neighborhood
				po['best_site'] = site;
				po['best_pay_off'] = po['o_pay_off'];
			} else {
				hood.forEach(function(d) {
					po['all'][d] = payoff(d, strategy);
				});

				po['all'][site] = po['o_pay_off'];
				po['best_site'] = d3.max(d3.map(po['all']).values());
				po['best_pay_off'] = po['all'][po['best_site']];
			}

			return d3.map(po);
		} // play_with_all_neighbors()


		/*
		 * Find the overall pay-off for a site.
		 * (Play simultaneously with all neighbors).
		 */
		function payoff(loc, strategy) {
			var site = typeof loc === "number" ? loc: loc[0],
				hood = find_neighbors(site, strategy);

			return hood.map(function(d) {
				return game_set[strategy.get(site)][strategy.get(d)][0];
			});
		} // payoff()


		/*
		 * Search for a site within Moore's neighborhood of size
		 * (2M + 1) x (2M + 1)
		 * Optional argument: site_occupation
		 * 				: "all", "occupied", "empty"
		 */
		function search_for_sites(site, strategy, site_occupation) {
			site_occupation = default_val(site_occupation, "all");

			var size = Math.sqrt(strategy.keys().length),
				Y    = d3.range(site - M * size, site + (M+1) * size, size),
				X    = d3.range(-M, M + 1);

			var neighbors = [];

			X.forEach(function(d) {
				Y.forEach(function(e) {
					var candidate = Math.round((e + d) % size);
					if(candidate !== site) {
						neighbors.push(candidate);
					}
				});
			});

			return site_occupation === "occupied"
				? neighbors.filter(function(d) { return !(d < 0); })
				: site_occupation === "empty"
					? neighbors.filter(function(d) { return !(d > 1); })
					: neighbors;
		} // search_for_sites()

		/*
		 * Find neighboring sites with better pay-off.
		 * Argument: site
		 * Optional BOOLEAN argument: site_occ
		 */
		function explore_neighborhood(site, strategy, site_occ) {
			var neighborhood = search_for_sites(site, strategy, site_occ),
				po = {};

			if(strategy.get(site) === -1) { return {}; }

			var ownPayoff = payoff(site, strategy);
			po[site] = ownPayoff; 

			if(forceMove) {
				delete po[site];
				forceMove = false;// needs to be always set (like a param, but not)
			}

			neighborhood.forEach(function(d) {
				po.d = payoff(
						strategy.get(d) === -1 ? [d, strategy.get(site)] : d,
						strategy
					) + (Math.random() - 0.5) / 10000;
			});

			var best_site = d3.max(d3.map(po).values());

			return d3.map({
				'o_site'     : site,
				'o_pay_off'  : ownPayoff,
				'best_site'  : Math.round(best_site),
				'best_payoff': Math.round(po.best_site)
			});
		} // explore_neighborhood()


		/*
		 * Move agents
		 * In: change dictionary
		 * In/Out: strategy
		 * Out: [strategy, this move]
		 */
		function move(neighborhood, strategy) {
			var best_site          = neighborhood.get('best_site'),
				o_site             = neighborhood.get('o_site'),
				best_site_strategy = strategy.get(best_site);

			var mv = {};
			mv[o_site] = -1;
			mv[best_site] = strategy.get(o_site);

			if(best_site == o_site) {
				mv[o_site] = strategy.get(o_site);
			} else {
				strategy.set(best_site, strategy.get(o_site));
				strategy.set(o_site, -1);
				if(best_site_strategy > -1) {
					forceMove = true;
					var expel = explore_neighborhood(best_site, strategy, "empty"),
						expelled_site = expel.get('best_site');
					strategy.set(expelled_site, best_site_strategy);
					mv[expelled_site] = strategy.get(expelled_site);
				}
				mv[best_site]  = strategy.get(best_site);
			}

			return d3.map({'strategy': strategy, 'mv': mv});
		} // move()

		function one_step(strategy) {
			// Pick a random agent
			var comparison = d3.map({}),
				site  = +choice(strategy.keys()),
				mv = {},
				hood;

			if(strategy.get(site) !== -1) { // if the site is nonempty
				if(Math.random() < m) { // Try to migrate
					hood = explore_neighborhood(site, strategy, Math.random() < s
							? "all" // best possible site (property game)
							: "empty" //  empty site
						);


					var ret = move(hood, strategy);

					mv         = ret.get('mv');
					strategy   = ret.get('strategy');
					site       = hood.get('best_site');

				}
				comparison = play_with_all_neighbors(site, strategy);
			}


			// Update strategy given comparison with neighbors
			if(comparison.has('best_site')) {
				strategy = dirk_update(comparison, strategy);
				mv[site] = strategy.get(site);
			}

			moves.push(mv);
			return strategy;
		} // one_step()


		/*
		 * Strategy Sets
		 */
		/*
		 * update strategies by player 1 trying to reproduce
		 * player 2's strategy with Dirk Temperature
		 */
		function dirk_update(po, strategy) {
			if(r === 1 && q === 0) return strategy;

			if(Math.random() > r) {
				// Update with best strategy
				strategy[po['o_site']] = strategy[po['best_site']];
			} else if(Math.random() < q) {
				strategy[po['o_site']] = 1;
			} else {
				strategy[po['o_site']] = 0;
			}
			return strategy;
		} // dirk_update()
	} // game()

	game.iterations = function(value) {
		if(!arguments.length) return iterations;
		iterations = value;
		return game;
	}; // game.iterations()

	game.counter = function(value) {
		if(!arguments.length) return counter;
		counter = value;
		return game;
	}; // game.counter()

	game.grid_size = function(value) {
		if(!arguments.length) return grid_size;
		grid_size = value;
		return game;
	}; // game.grid_size()

	game.percs = function(value) {
		if(!arguments.length) return percs;
		percs = value;
		return game;
	}; // game.percs()

	game.r = function(value) {
		if(!arguments.length) return r;
		r = value;
		return game;
	}; // game.r()

	game.q = function(value) {
		if(!arguments.length) return q;
		q = value;
		return game;
	}; // game.q()

	game.m = function(value) {
		if(!arguments.length) return m;
		m = value;
		return game;
	}; // game.m()

	game.s = function(value) {
		if(!arguments.length) return s;
		s = value;
		return game;
	}; // game.s()

	game.M = function(value) {
		if(!arguments.length) return M;
		M = value;
		return game;
	}; // game.M()

	game.uploadToS3 = function(value) {
		if(!arguments.length) return uploadToS3;
		uploadToS3 = value;
		return game;
	};  // game.uploadToS3()

	game.forceMove = function(value) {
		if(!arguments.length) return forceMove;
		forceMove = value;
		return game;
	}; // game.forceMove()

	/*
	 * Dispatch events back to the visualization
	 */
	game.callback = function(value) {
		if(!arguments.length) return callback;
		callback = value;
		return game;
	}; // game.callback()

	game.step = function() {
		return step;
	};


	game.counter = function() {
		return counter;
	}

	/*
	 * Class (public) method to generate and return the initial game board.
	 */
	game.initial = function() {

		// Counters and limits
		counter = 0;
		MCS = Math.pow(grid_size,2)*iterations; // Monte Carlo Steps

		// Initial game board and strategy
		var	board    = Math.pow(grid_size, 2),
			shuffled = d3.range(board); // unshuffled on assignment

		// actually shuffle the shuffled board
		d3.shuffle(shuffled);

		var cut  = Math.round(percs * board + Math.random() - 0.5),
			grid = percs < 1 ? shuffled.slice(0, cut) : d3.range(board),
			rest = percs < 1 ? shuffled.slice(cut) : [],
			stratvals = [0,1]; // 0 = defector, 1 = cooperator

		// Shuffle the grid:
		// Especially needed if percs >=1
		// Doesn't hurt to reshuffle anyway
		d3.shuffle(grid);

		grid.forEach(function(d) { current[d] = choice(stratvals); });
		rest.forEach(function(d) { current[d] = -1; });

		/*
		 * Set some other class variables.
		 */
		calc_coop_level(d3.map(current));

		C = {
				'counter': [0],
				'c': [coop_level['c']],
				'd': [coop_level['d']],
				'e': [coop_level['e']]
			};

		previous = d3.map(current);
		return d3.map(current).entries();
	} // game.initial()
	
	/*
	 * Public getter/setter to set the appropriate prisoner's dilemma strategy
	 */
	game.dilemma = function(tactic) {
        if(!arguments.length) return solution;
		solution = tactic;
		var strat = strategy_sets.get(solution);

		/* Set the prisoners dilemma solution */
		game_set[0][0] = [strat.P, strat.P];
		game_set[0][1] = [strat.T, strat.S];
		game_set[1][0] = [strat.S, strat.T];
		game_set[1][1] = [strat.R, strat.R];

        return game;
    }; // game.m()




	/*
	 * Internal helper function.
	 */
	function calc_coop_level(strategy) {
		var coop = strategy.values(),
			norm = coop.filter(function(d) { return d >= 0; }).length;

		coop_level = {
			// cooperators
			c: coop.filter(function(d) { return d === 1; }).length / norm,
			// defectors
			d: coop.filter(function(d) { return d === 0; }).length / norm,
			// empty
			e: coop.filter(function(d) { return d === -1; }).length / norm,
		};
	} // calc_coop_level()

	return game;
} // agent_based_model()

/*
 * Shuffle the given array then pick a random value from it.
 * In: array
 * Out: random value,
 * solution   = "helbing_yu";
 */
function choice(array) {
	d3.shuffle(array);
	return array[Math.floor(Math.random() * array.length)];
} // choice()

/*
 * Assign a default value to something, if it is undefined.
 */
function default_val(arg, val) {
	return typeof arg === "undefined" ? val : arg;
} // default_val()


