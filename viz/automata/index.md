---
layout: viz/science
title: Agent-Based Property Game
viztitle: Agent-Based Property Game
tagline: Real estate property simulation.
toy: blinkengrid+cellular automata
description: Property gains/losses due to competition/cooperation among agents.
category: game theory
item: abm
commissioned: true
includes:
  - progressbar.js
  - blinkengrid.js
also:
  - href: "http://www.ischool.berkeley.edu/people/visitors/thomasmaillart"
    title: "Thomas Maillart's Page at UC Berkeley"
  - href: "http://en.wikipedia.org/wiki/The_Evolution_of_Cooperation"
    title: "Wikipedia: The Evolution of Cooperation"
  - href: "http://en.wikipedia.org/wiki/Prisoner%27s_dilemma"
    title: "Wikipedia: Prisoner's Dilemma"
howto:
  - component: r
    step: The probability that an agent will *not* copy the best strategy from their neighbors.
  - component: q
    step: The probability of spontaneous cooperation between the agent and a neighbor.
  - component: m
    step: The probability of migrating to an empty cell in the neighborhood with highest payoff.
  - component: M
    step: The radius of the neighborhood (# of cells in each direction).
  - component: s
    step: If another occupied cell has higher payoff, this is the probability of dispacing that agent into a neighboring cell with the next highest payoff.
---
Game theoretical _agent-based models_ (ABM), also called _public good games_, have been used for decades to investigate the emergence of cooperation in biology as well as in animal and human societies.

Here we present a grid-based public good game simulation, with agents (each site) playing the Prisoner's dilemma and endowed with updating and migration rules. Upon playing with her neighbors, each agent can decide to imitate and update her strategy, and switch between "cooperation" (green) and "defection" (red) to maximize her payoff. The agent can also explore her neighborhood for sites with better payoff, and move accordingly.

Public good games exhibit emergent properties, like the formation of clusters of cooperators (green), which in turn are likely to be invaded by defectors (red). This visualization helps quickly grasp the detailed and coarse-grained behaviors of the game, as function of the input parameters. You can see the difference of outcomes by choosing different simulations from the list: in some case, defectors "win" the game, while in others cooperators thrive.

In collaboration with [Thomas Maillart](http://www.ischool.berkeley.edu/people/visitors/thomasmaillart).
