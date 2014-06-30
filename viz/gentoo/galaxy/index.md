---
layout: viz/timeywimey
title: Gentoo Developers
viztitle: Twinkling Gentoo Linux
tagline: Visualization of Gentoo Developers over the years.
commissioned: false
category: gentoo
---
<section id="description">
	<div class="col-lg-4 col-sm-4">
				<h3 class="panel-title">About The Visualization</h3>
				<p>Data is hard. And incomplete. If you see anything inaccurate or that you disagree with, please contact us. File a bug or send us a message on the forums, mailing lists or social media.
				</p>
	</div><!--.col-lg-3 .col-sm-3-->
	<div class="col-lg-4 col-sm-4">
				<h3 class="panel-title">How it Works</h3>
				<p>Gentoo Linux activity since the first CVS commit in July 2000. To pause the activity you can either click the pause/stop button or click on a date (month or year). There will be a slight difference in the paused display depending on which you hit. The pause button literally pauses the action. The date strip shows the entire historical snapshot per the date clicked.</p>
	</div><!--.col-lg-6 .col-sm-6-->
	<div class="col-lg-4 col-sm-4 pull-right">
			<h3 class="panel-title">About the Data</h3>
			{% for article in site.data.writing.medium %}
				{% if article.category == page.category %}
				<div class="col-lg-4">
					{% include embed/medium.html %}
				</div>
				{% endif %}
			{% endfor %}
	</div><!--.col-lg-12 .col-sm-12-->
</section>
