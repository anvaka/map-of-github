import fuzzysort from 'fuzzysort';
import log from './log.js';
import config from './config.js';
import dedupingFetch from './dedupingFetch.js';

const fetchedIndex = new Set();
const seenWords = new Set();

export default function createFuzzySearcher() {
  let words = [];
  let lastPromise;
  let lastQuery;
  let api = {
    find
  }

  return api;

  function find(query) {
    if (lastPromise) {
      lastPromise.cancel();
    }
    lastQuery = query;
    const cacheKey = query[0];
    let isCancelled = false;
    if (!fetchedIndex.has(cacheKey)) {
      const p = dedupingFetch(`${config.namesEndpoint}/${cacheKey}.json`).then(data => {
        data.forEach(word => {
          if (!seenWords.has(word[0])) {
            words.push({name: word[0], lat: word[1], lon: word[2]});
            seenWords.add(word[0]);
          }
        });
        fetchedIndex.add(cacheKey);
        if (isCancelled || lastQuery !== query) {
          return; // Nobody cares, but lets keep the index.
        }
        return find(query); // Try again, but now with the index.
      }).catch(err => {
        log.error('FuzzySearch', 'Failed to fetch index for ' + cacheKey, err)
      });
      p.cancel = () => {
        isCancelled = true;
      };
      return p;
    }

    lastPromise = fuzzysort.goAsync(query, words, {limit: 10, key: 'name'})

    return lastPromise.then(results => {
      if (isCancelled) return; 
      return results.map(x => ({
        html: fuzzysort.highlight(x, '<b>', '</b>'),
        text: x.target,
        lat: x.obj.lat,
        lon: x.obj.lon,
      }));
    }); 
  }
}