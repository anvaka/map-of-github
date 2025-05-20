# Map of GitHub

This is a map of 690,000+ GitHub projects. Each dot is a project. Dots are close to each other if they have a lot of common
stargazers.

<div align="center">
<img src="public/android-chrome-512x512.png" alt="Map of GitHub logo"/>
</div>
<div align="center">
  <i>Logo by Louise Kashcha, 9 years old. Thank you ❤️</i> 
</div>

## Map releases
- [Current release, May 10, 2025](https://anvaka.github.io/map-of-github/) - 690K projects, 1.5K clusters
- [Initial release, May 8, 2023](https://anvaka.github.io/map-of-github/?v=v1) - 400K projects, 1K clusters

## How was it made?

[![current map](public/current-map.png)](https://anvaka.github.io/map-of-github/)

The first step was to fetch who gave stars to which repositories. For this I used a public data set of github activity events on 
Google BigQuery, considering events between Feb 2011 and May 2025. This gave me around 500 million stars.
(Side note: Mind blowing to think that Milky Way has more than 100 billion stars)

In the second phase I computed exact [Jaccard Similarity](https://en.wikipedia.org/wiki/Jaccard_index) between each repository. 
For my home computer's 24GB RAM this was too much, however an AWS EC2 instance with 512GB of RAM chewed through it in a few hours.
(Side note: I tried other similarities too, but Jaccard gave the most believable results)

In the third phase I used a few clustering algorithms to split repositories together. I liked [Leiden clustering](https://www.nature.com/articles/s41598-019-41695-z)
the best and ended up with 1,500+ clusters with ~690K projects.

In the fourth phase I used my own [ngraph.forcelayout](https://github.com/anvaka/ngraph.forcelayout) to compute layouts of nodes
inside clusters, and a separate configuration to get global layout of clusters.

In the fifth phase we need to render the map. Unlike my previous projects, I didn't want to reinvent the wheel, so
ended up using [maplibre](https://maplibre.org/). All I had to do was convert my data into GeoJSON format, generate tiles
with [tippecanoe](https://github.com/mapbox/tippecanoe) and configure the browsing experience.

## Country names

A lot of country labels were generated with help of ChatGPT. If you find something wrong, you can right click it, edit, and send
a pull request - I'd be grateful.

The query that I used to generate labels was twofold. First I setup the system prompt to be:

> You are a master namer of programming communities. Your task is to create a unique, specific, and memorable name for a "country" of GitHub repositories based on their common themes, technologies, or purposes.
>
> The name should be:
> 1. Concise (1-3 words maximum)
> 2. Distinctive and specific to these particular repositories
> 3. Capture the unique essence of this specific collection
> 4. AVOID generic terms like "JSWorld", "UI", "Web", "Forge", "Archipelago", "Hub", "Republic", "Nexus", etc.
> 5. Creative but immediately understandable
> 6. If repositories are focused on a specific language, framework, or domain, the name should reflect this specificity
> 7. IMPORTANT: If two repositories are similar, DO NOT combine their names (e.g., avoid "NodeNexus" if there's also a "Node Nexus")
> 8. Use strong imagery and metaphors (e.g., "Anvil Force" for build tools, "Circuit Citadel" for hardware libs)
> 9. For collections with a clear theme or purpose, choose a name that evokes that specific technology or domain
> 
> Each name must be HIGHLY DISTINCT from all other countries. Imagine this name appearing on a map - it should be instantly recognizable.
>
> Only return the name itself without explanations or quotes - just the raw name.

Second the user input was:

> Name a country containing these GitHub repositories: `repoList`.
> Repository names without owners: `repoNamesOnly`
>
> Please analyze the specific themes, technologies, and unique aspects of these repositories to create a distinct name that wouldn't apply to other programming communities.
> 
> The name should be distinctive and not easily confused with other country names on a map.

If LLM returned a name that was too close to previous names, I would ask it to try again and increase the temperature to be more creative.

I liked the results very much: It is fun to explore the map, discover the land, and peer into their meaning.


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