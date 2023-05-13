# Map of GitHub

This is a map of 400,000+ GitHub projects. Each dot is a project. Dots are close to each other if they have a lot of common
stargazers.

<div align="center">
<img src="public/android-chrome-512x512.png" alt="Map of GitHub logo"/>
</div>
<div align="center">
  <i>Logo by Louise Kashcha, 9 years old. Thank you ❤️</i> 
</div>

## How was it made?

[![current map](public/current-map.png)](https://anvaka.github.io/map-of-github/)

The first step was to fetch who gave stars to which repositories. For this I used a public data set of github activity events on 
Google BigQuery, considering only events between Jan 2020 and March 2023. This gave me more than 350 million stars.
(Side note: Mind blowing to think that Milky Way has more than 100 billion stars)

In the second phase I computed exact [Jaccard Similarity](https://en.wikipedia.org/wiki/Jaccard_index) between each repository. 
For my home computer's 24GB RAM this was too much, however an AWS EC2 instance with 512GB of RAM chewed through it in a few hours.
(Side note: I tried other similarities too, but Jaccard gave the most believable results)

In the third phase I used a few clustering algorithms to split repositories together. I liked [Leiden clustering](https://www.nature.com/articles/s41598-019-41695-z)
the best and ended up with 1000+ clusters.

In the fourth phase I used my own [ngraph.forcelayout](https://github.com/anvaka/ngraph.forcelayout) to compute layouts of nodes
inside clusters, and a separate configuration to get global layout of clusters.

In the fifth phase we need to render the map. Unlike my previous projects, I didn't want to reinvent the wheel, so
ended up using [maplibre](https://maplibre.org/). All I had to do was convert my data into GeoJSON format, generate tiles
with [tippecanoe](https://github.com/mapbox/tippecanoe) and configure the browsing experience.

## Country names

A lot of country labels were generated with help of ChatGPT. If you find something wrong, you can right click it, edit, and send
a pull request - I'd be grateful.

The query that I used to generate labels was:

```
Please analyze these repository and detect a common theme (e.g. programming language, technology, domain). Pay attention to language too (english, chinese, korean, etc.). If there is no common theme found, please say so. Otherwise, If you can find a strong signal for a common theme please come up with a specific name for imaginary country that contains all these repositories. Give a few options. When you give an option prefer more specific over generic option (for example if repositories are about recommender systems, use that, instead of generic DeepLearning)
```

## Geocoding?

To implement a searchbox, I used a simple dump of all repositories, indexed by their first letter (or their author's). So when you type
`a` in the search box, I look up all repositories that start with `a` and show them to you with fuzzy matcher on the client.

## Design

Most of the time I like data presented by this project better than visual design of the map. If you have experience designing maps
or just have a wonderful design vision how it should look like - please don't hesitate to share. I'm still looking for the style
that matches the data.

## Support

If you find this project useful and would like to support it - please join [the support group](https://github.com/sponsors/anvaka).
If you need any help with this project or have any questions - don't hesitate to open an issue here or ping me on [twitter](https://twitter.com/anvaka)

Thank you to all my friends and supporters who helped me to get this project off the ground:
Ryan, Andrey, Alex, Dmytro. You are awesome!

Thank you to my dear daughter Louise for making a logo for this project. I love you!

Endless gratitude to all open source contributors who made this project possible. I'm standing on the shoulders of giants.

## License

I'm releasing this repository under MIT license. However if you use the data in your own work, please consider giving attribution to this project.