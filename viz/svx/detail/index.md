---
layout: viz/poc
title: Pairwise Voting
tagline: Visualization of the voting results of a single question.
script: js/scorify.js
commissioned: true
navname: More Questions
---
The client was developing a pairwise voting application to promote fair process in decision making within organizations. It works kind of like the eye doctor (do you like this or this better? what about this or this? -- always a binary choice, until you've been asked all/enough permutations -- to enable fair process decision-making.
Thus each choice can have a number of "yes" votes and a number of "no" votes (depending on whether it was preferred over another choice).
A score is assigned, based on the ratio of yes to no
The graph shows:
	Each choice is a wedge.  From 12 o'clock, clockwise the choices go from highest to lowest score.
	The translucent disk is like the x-axis -- the portion inside represents "no" vote, and outside are the "yes" votes
	The radio controls in the table are actually for the widget, to show the number of votes as well as to cancel yes/no votes and make apparent why the highest score is the highest score.
