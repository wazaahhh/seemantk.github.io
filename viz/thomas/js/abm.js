function abm() {

	function property_game() {
		var size       = 100,
			percs      = 1,
			strategies_iter = {},
			coop_level     = {},
			strategy_sets = {
				standard:   [1.02, 1.0, 0.0, 0.0],
				helbing_yu: [1.3,  1.0, 0.1, 0.0]
			};
 
		var STRATEGY_SET = d3.map({C: 1, D: 0}),
			grid_size    = 49,
			iterations   = 200,
			MCS          = Math.pow(grid_size,2) * iterations, // Monte Carlo Steps
			percs        = 0.5, // Grid Sparsity
			r            = 0.05, // Probability of not copying best strategy
			q            = 0.05, // Chance of spontaneous cooperation (noise 1)
			m            = 1, // Probability of migration
			s            = 1, // Proability of expelling
			M            = 5, // Moore's Distance
			C; // Cooperation dictionary

		var uploadToS3 = false,
			forceMove  = false,
			moves      = [];

		function my() {
			var strategy        = initialize(),
				clevel          = coop_level(strategy),
				strategy_init = d3.map(strategy);

			C = {
					'iteration': [0],
					'c': [clevel['c']],
					'd': [clevel['d']],
					'e': [clevel['e']]
				};
			
			for(var i = 0; i < MCS; i++) {
				var ret = oneStep();
				strategy = ret.strategy;
				moves.append(ret.moves);

				clevel = coop_level(strategy);

				// conditions to break the loop
				// TODO: NEED TO FIND OUT ABOUT THE FIRST CONDITION (line 475)

				if(clevel['c'] === 0) {
					console.log("no cooperators left");
					break;
				}

				if(clevel['d'] === 0) {
					console.log("no defectors left");
					break;
				}

				if(i % (Math.pow(grid_size, 2) - 1) === 0 &&
						d3.max(C['c'].slice(-3)) < 0.01) {
					console.log("lower threshold of cooperators reached");
					break;
				}

				if(i % (Math.pow(grid_size, 2) + 1) === 0) {
					strategies_iter[i] = strategy;
				}

				if(i % Math.pow(grid_size, 2) === 0) {
					C['iteration'].append(i);
					C['c'].append(clevel['c']);
					C['d'].append(clevel['d']);
					C['e'].append(clevel['e']);
				}
			}
					


			/*
			 * Helper Functions called above.
			 */
			
			function initialize() {
				var strategies = {},
					l = Math.pow(size, 2);

				var shuffled_grid = d3.shuffle(d3.range(l));

				var limit = Math.round(percs * l + Math.random() - 0.5);
				var subgrid = d3.shuffle(
							percs < 1 ? shuffled_grid.slice(0,limit) : d3.range(l)
						);			
				var rest = percs < 1 ? [] : shuffled_grid.slice(limit);

				var stratvals = STRATEGY_SET.values();

				subgrid.forEach(function(d) {
					strategies[d] = choice(stratvals);
				});

				rest.forEach(function(d) {
					strategies[d] = -1;
				});
				strategies = d3.map(strategies);
				return d3.map(strategies);
			} // initialize()

			function coop_level(strategy) {
				var coop = strategy.values(),
					norm = coop.filter(function(d) { return d >= 0; }).length;

				return {
					// cooperators
					c: coop.filter(function(x) { return x === 1; }).length / norm,
					// defectors
					d: coop.filter(function(x) { return x === 0; }).length / norm,
					// empty
					e: coop.filter(function(x) { return x < 0; }).length / norm,
				};
			} // coopLevel()

			/*
			 * Pick a random entry from the given array
			 * In: array
			 * Out: random value
			 */
			function choice(array) {
				return array[Math.floor(Math.random() * array.length)];
			} // choice()

			function default_arg(arg, val) {
				return typeof arg === "undefined" ? val : arg;
			/*
			 * Basic Evolutionary Game Theory Tools
			 */
			/*
			 * Find the 4 nearest neighbors.
			 * Argument: site
			 * Optional BOOLEAN argument: non_empty_sites
			 */
			function find_neighbors(site, non_empty_sites) {
				non_empty_sites = default_arg(non_empty_sites, true);

				var hood = [
						site - 1,
						site + 1,
						site - strategy_size,
						site + strategy_size
					].forEach(function(d) {
						return d % l;
					});

				if(non_empty_sites) {
					hood = hood.filter(function(d) { strategies.get(d) > -1; });
				  }

				return d3.map(hood);
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

				hood.forEach(function(d) {
					po['all'][d] = payoff(n, strategy);
				});

				if(!hood.length) {
					// Empty neighborhood
					po['best_site'] = site;
					po['best_pay_off'] = po['o_pay_off'];
				} else {
					po['all'][site] = po['o_pay_off'];
					po['best_site'] = d3.max(d3.map(po['all']).keys());
					po['best_pay_off'] = po['all'][po['best_site']];
				}

				return d3.map(po);
			} // play_with_all_neighbors()


			/*
			 * Find the overall pay-off for a site.
			 * (Play simultaneously with all neighbors).
			 */
			function payoff(site, strategy) {
				var po = [];

				find_neighbors(typeof site === "number" ? site: site[0], strategy)
					.forEach(function(d) {
						po.push(prisoners_dilemma()[0]);
					});

				return d3.sum(po);
			} // payoff()


			/*
			 * Search for a site within Moore's neighborhood of size
			 * (2M + 1) x (2M + 1)
			 * Optional argument: site_occupation
			 * 				: "all", "occupied", "empty"
			 */
			function search_for_sites(site, strategy, site_occupation) {
				site_occupation = default_arg(site_occupation, "all");

				var size = Math.sqrt(strategy.keys().length),
					Y    = d3.range(site - M * size, site + (M+1) * size, size),
					X    = d3.range(-M, M + 1);

				var neighbors = [];

				X.forEach(function(d) { neighbors.push((Y+d) % size); });
				neighbors = d3.set(neighbors);
				neighbors.remove(site);

				switch(site_occupation) {
					case 'occupied':
						neighbors.forEach(function(d) {
							if(d < 0) {
								 neighbors.remove(d);
							}

						  });
						break;
					case 'empty':
						neighbors.forEach(function(d) {
							if(d > 1) {
								neighbors.remove(d);
							}
						  });
						break;
				};

				return d3.set(neighbors);
			} // search_for_sites()

			/*
			 * Find neighboring sites with better pay-off.
			 * Argument: site
			 * Optional BOOLEAN argument: site_occ
			 */
			function explore_neighborhood(site, strategy, site_occ) {
				var neighborhood = search_for_sites(site, strategy, site_occ);
				
				var po = d3.map({});

				if(strategy.get(site) === -1) {
					console.log("no strategy at site: " + site);
					return 0;
				}

				var ownPayoff = payoff(site, strategy);
				po.set(site, ownPayoff); 

				if(forceMove) {
					po.remove(site);
				}

				neighborhood.forEach(function(d) {
					po.set(d, payoff(strategy.get(d) === -1
								? [d, strategy.get(site)] : d,
								strategy)
						 	 + Math.random() - 0.5 / 10000
					);

					best_site = d3.max(po.values());
				)};

				return d3.map({
					'o_site'     : site,
					'o_pay_off'  : ownPayoff,
					'best_site'  : Math.round(best_site),
					'best_payoff': Math.round(po.get(best_site))
				});
			} // explore_neighborhood()


			/*
			 * Move agents
			 * In: change dictionary
			 * In/Out: strategy
			 * Out: [strategy, this move]
			 */
			function move(neighborhood, strategy) {
				var best_site_strat = strategy.get(neighborhood.get('best_site')),
					s1 = d3.map(strategy);

				var o_site    = neighborhood.get('o_site'),
					best_site = neighborhood.get('best_site');

				var ret = {
						'strategies': strategy,
						's0' : d3.map(strategy),
						'seq': {0: o_site, 1: best_site},
						'mv' : {o_site: -1, best_site: strategy.get(o_site)}
				};

				if(best_site === o_site) {
					s1.set(best_site, strategy.get(o_site));
					s1.set(o_site, -1);
					if(original_best_site > -1) {
						var expell = explore_neighborhood(best_site, s1, "empty"),
							expelled_site = expell.get('best_site');
						strategy = d3.map(s1);
						strategy.set(expelled_site, best_site_strat);

						ret['strategies']        = strategy;
						ret['s1']                = s1;
						ret['mv'][best_site]     = s1.get(best_site);
						ret['mv'][expelled_site] = strategy.get(expelled_site)}
					} else {
						strategy = d3.map(s1);
						ret['strategies']     = strategy;
						ret['s1']             = s1;
						ret['mv'][best_site]  = s1.get(best_site);
					}
				}
				return d3.map({ret});
			} // move()

			function oneStep(strategy) {
				// Pick a random agent
				var comparison,
					site  = choice(strategy.keys()),
					moves = {},
					hood;

				if(strategy.get(site) !== -1) {
					// Migration
					if(Math.random() < m) {
						hood = explore_neighborhood(site, Math.random() < s
								? "all" // best possible site (property game)
								: "empty" //  migrate to empty site
							);

						var mv = move(hood, strategy);

						strategy = mv.get('strategy');
						moves = mv.get('mv');

						site = hood.get('best_site');
					}

					comparison = play_with_all_neighbors(site, strategy);

					if(comparison.has('best_site')) {
						// Update strategy given comparison with neighbors
						strategy = dirk_update(comparison, strategy);
						moves.set('site', strategy.get('site'));
					}
				}

				return {'strategy': strategy, 'moves': moves};
			} // oneStep()


			/*
			 * Strategy Sets
			 */
			
			/*
			 * Prisoners' Dilemma
			 */
			function prisoners_dilemma(player1, player2, strategy) {
				var strat = strategy_sets.helbing_yu,
					game_set = {
						"[1,1]": [strat.R, strat.R],
						"[1,0]": [strat.S, strat.T],
						"[0,1]": [strat.T, strat.S],
						"[0,0]": [strat.P, strat.P],
					};

				return game_set[JSON.stringify(typeof player1 === "number"
							? strategy.get(player1)
							: player1[1]),
						strategy.get(player2)
					];
			} // prisoners_dilemma()

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
		} // my()

		my.grid_size = function(value) {
			if(!arguments.length) return grid_size;
			grid_size = value;
			return my;
		}; // my.grid_size()

		my.percs = function(value) {
			if(!arguments.length) return percs;
			percs = value;
			return my;
		}; // my.percs()

		my.r = function(value) {
			if(!arguments.length) return r;
			r = value;
			return my;
		}; // my.r()

		my.q = function(value) {
			if(!arguments.length) return q;
			q = value;
			return my;
		}; // my.q()

		my.m = function(value) {
			if(!arguments.length) return m;
			m = value;
			return my;
		}; // my.m()

		my.s = function(value) {
			if(!arguments.length) return s;
			s = value;
			return my;
		}; // my.s()

		my.M = function(value) {
			if(!arguments.length) return M;
			M = value;
			return my;
		}; // my.M()

		my.uploadToS3 = function(value) {
			if(!arguments.length) return uploadToS3;
			uploadToS3 = value;
			return my;
		};  // my.uploadToS3()

		my.forceMove = function(value) {
			if(!arguments.length) return forceMove;
			forceMove = value;
			return my;
		}; // my.forceMove()

		return my;
	} // property_game()
}
