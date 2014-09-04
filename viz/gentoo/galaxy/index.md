---
layout: viz/timeywimey
title: Gentoo Developers
toy: twinkly+timey-wimey
viztitle: Gentoo Linux Galaxy
tagline: Gentoo Developers over the years.
commissioned: false
category: gentoo
also:
  - href: "https://medium.com/linux-operation-system/re-emerging-history-i-27f8b0b493d3"
  - title: Re-emerging History (I)
howto:
  - component: scatterplot
    step: The *twinkly* component of this viz represents the developers.  The faded versions of each color indicate that the developer is inactive in a given month.
  - component: streamgraph
    step: The *wimey* part of the *timey-wimey* component of this viz shows the total headcount.
  - component: time axis
    step: The *timey* part of the *timey-wimey* component is the axis for the streamgaph, and indicates the current time in the scatterplot.  Jump to any time by clicking along the streamgraph.
  - component: player controls
    step: The reverse play button will reverse time and play back to the &quot;big bang&quot; event at the beginning.
  - component: tooltips
    step: hover over a circle to see more details on a particular developer.
---
This is *timey-wimey* information represented, literally, in a *spacey-wacey* layout.

Data is hard. And incomplete. If you see anything inaccurate or that you disagree with, please contact us. File a bug or send us a message on the forums, mailing lists or social media.

Gentoo Linux activity since the first CVS commit in July 2000. To pause the activity you can either click the pause/stop button or click on a date (month or year). There will be a slight difference in the paused display depending on which you hit. The pause button literally pauses the action. The date strip shows the entire historical snapshot per the date clicked.
