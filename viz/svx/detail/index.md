---
layout: viz/poc
title: Pairwise Voting
viztitle: Pairwise Voting
tagline: Visualization of the voting results of a single question.
commissioned: true
viznav: More Questions
toy: whitey-wipey plate
howto: 
  - step: Each wedge represents a choice.  Starting at the 12 o'clock position, the choices are arranged clockwise from highest score to lowest.
    component: wedges
  - step: The translucent disk is like the x-axis -- underneath it are the *no* votes, and outside it are the *yes* vote.
    component: translucent disk
  - step: The radio controls in the table are actually for the widget, to show the number of votes as well as to cancel yes/no votes and make apparent why the highest score is the highest score.
    component: radio controls
also:
  - href: "/viz/svx/overview/"
    title: All questions for an organization
  - href: "/viz/svx"
    title: About this commission.

---
The client was developing a pairwise voting application to promote fair process in decision making within organizations. It works kind of like the eye doctor (do you like this or this better? what about this or this? -- always a binary choice, until you've been asked all/enough permutations -- to enable fair process decision-making.
A score is assigned, based on the ratio of *yes* to *no* votes.

Thus each choice can have a number of *yes* votes and a number of *no* votes (depending on whether it was preferred over another choice).
