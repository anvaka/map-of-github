import fuzzysort from 'fuzzysort';
import log from './log.js';
import config from './config.js';

const fetchedIndex = new Set();
const seenWords = new Set();

export default function createFuzzySearcher() {
  let words = [];
  let lastPromise;
  let api = {
    find
  }

  return api;

  function find(query) {
    if (lastPromise) {
      lastPromise.cancel();
    }
    const cacheKey = query[0];
    if (!fetchedIndex.has(cacheKey)) {
      log('FuzzySearch', 'Fetching index for', cacheKey);
      let isCancelled = false;
      const p = fetch(`${config.namesEndpoint}/${cacheKey}.json`).then(r => r.json()).then(data => {
        data.forEach(word => {
          if (!seenWords.has(word[0])) {
            words.push({name: word[0], lat: word[1], lon: word[2]});
            seenWords.add(word[0]);
          }
        });
        fetchedIndex.add(cacheKey);
        if (isCancelled) return; // Nobody cares, but lets keep the index.
        return find(query); // Try again, but now with the index.
      }).catch(err => {
        log.error('FuzzySearch', 'Failed to fetch index for ' + cacheKey, err)
      });
      p.cancel = () => {isCancelled = true;};
      return p;
    }

    lastPromise = fuzzysort.goAsync(query, words, {limit: 10, key: 'name'})

    return lastPromise.then(results => {
      return results.map(x => ({
        html: fuzzysort.highlight(x, '<b>', '</b>'),
        text: x.target,
        lat: x.obj.lat,
        lon: x.obj.lon,
      }));
    }); 
  }
}