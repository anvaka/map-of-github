import * as marked from 'marked';
import DOMPurify from 'dompurify';
import bus from './bus.js';

const readmeFilesFormat = [
  'README.md',       // (Markdown)
  'README.markdown', // (Markdown)
  'README.rst',      // (reStructuredText)
  'README.txt',      // (Plain Text)
  'README',          // (Plain Text)
  'README.mkd',      // (Markdown)
  'readme.md',       // (Markdown)
];

const rawGithubUrl = 'https://raw.githubusercontent.com/';
const headers = {Accept: 'application/vnd.github.v3+json'}
let currentUser;
let cachedRepositories = new Map();

if (document.cookie.includes('github_token')) {
  headers['Authorization'] = 'Bearer ' + document.cookie.split('github_token=')[1].split(';')[0];
}

export function setAuthToken(token) {
  headers['Authorization'] = 'Bearer ' + token;
  // also write to cookie:
  document.cookie = 'github_token=' + token;
  bus.fire('auth-changed');
}

export async function getCurrentUser() {
  if (currentUser) return currentUser;
  if (!headers['Authorization']) return;

  const response = await fetch('https://api.github.com/user', {headers});
  if (response.ok) {
    currentUser = await response.json();
    return currentUser;
  }
}

export async function getRepoInfo(repoName) {
  if (cachedRepositories.has(repoName)) {
    return cachedRepositories.get(repoName);
  }
  const response = await fetch(`https://api.github.com/repos/${repoName}`, {headers});
  if (!response.ok) {
    if (response.headers.get('x-ratelimit-remaining') === '0') {
      let retryIn = new Date(response.headers.get('x-ratelimit-reset') * 1000);
      return {
        state: 'RATE_LIMIT_EXCEEDED',
        name: repoName,
        retryIn: retryIn.toLocaleDateString() + ' ' + retryIn.toLocaleTimeString()
      };
    } else if (response.status === 404) {
      return {
        state: 'NOT_FOUND',
        name: repoName
      }
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  const remainingRequests = response.headers.get('x-ratelimit-remaining');
  const repository = {
    state: 'LOADED',
    name: data.name,
    description: data.description,
    language: data.language,
    stars: formatNiceNumber(data.stargazers_count),
    forks: formatNiceNumber(data.forks_count),
    watchers: data.watchers_count,
    default_branch: data.default_branch,
    topics: data.topics,
    license: data.license?.spdx_id || data.license?.key,
    updated_at: new Date(data.updated_at).toLocaleDateString(),
    remainingRequests
  };
  cachedRepositories.set(repoName, repository);
  return repository;
}

export async function getReadme(repoName, default_branch) {
  if (!default_branch) {
    default_branch = ['master', 'main'];
  }
  if (!Array.isArray(default_branch)) {
    default_branch = [default_branch];
  }
    
  for (const branch of default_branch) {
    for (const readmeFile of readmeFilesFormat) {
      const response = await fetch(`${rawGithubUrl}${repoName}/${branch}/${readmeFile}`);
      if (response.ok) {
        let markdownString = await response.text();
        currentRepoURL = 'https://github.com/' + repoName;
        currentRawRepoUrl = 'https://raw.githubusercontent.com/' + repoName + '/' + branch;
        marked.setOptions({
          baseUrl: `https://github.com/${repoName}/blob/${branch}/`,
        })
        let unsafeDOM = marked.parse(markdownString);
        return {
          state: 'LOADED',
          content: DOMPurify.sanitize(unsafeDOM)
        };
      }
    }
  }
}

function formatNiceNumber(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// function fixRelativePaths(markdown, repo, branch) {
//   const repoUrl = `https://github.com/${repo}/blob/${branch}`;
//   let fixedMarkdown = markdown;
  
//   // Fix markdown links and image sources
//   const markdownRegex = /(!\[.*?\]\()(.+?)(\))/g;
//   fixedMarkdown = fixedMarkdown.replace(markdownRegex, (match, p1, p2, p3) => {
//     if (p2.startsWith('http')) {
//       return match;
//     } else {
//       return `${p1}${repoUrl}/${p2}${p3}`;
//     }
//   });
  
//   // Fix <img> tags
//   const imgRegex = /(<img.*?src=")(.+?)(".*?>)/g;
//   let imgUrl = 'https://raw.githubusercontent.com/' + repo + '/' + branch + '/';
//   fixedMarkdown = fixedMarkdown.replace(imgRegex, (match, p1, p2, p3) => {
//     if (p2.startsWith('http')) {
//       return match;
//     } else {
//       return `${p1}${imgUrl}/${p2}${p3}`;
//     }
//   });
  
//   return fixedMarkdown;
// }

const renderer = new marked.Renderer();
let currentRepoURL = '';
let currentRawRepoUrl = '';
// const repoUrl = 'https://github.com/' + repo + '/' + branch;
renderer.link = function(href, title, text) {
  if (href.startsWith('#')) {
    href = currentRepoURL + href;
  }
  if (href.startsWith('./')) {
    // https://raw.githubusercontent.com/nocodb/nocodb/develop
    // https://github.com/nocodb/nocodb/develop/packages/nc-gui/assets/img/icons/512x512.png
    href = currentRepoURL + href.slice(2);
  }
  return marked.Renderer.prototype.link.call(this, href, title, text);
};
renderer.image = function(href, title, text) {
  return marked.Renderer.prototype.image.call(this, getNormalizedImageLink(href), title, text);
};
renderer.html = function(html) {
  const imgRegex = /<img.*?src="(.*?)".*?>/g;
  html = html.replace(imgRegex, (match, src) => {
    src = getNormalizedImageLink(src);
    return match.replace(/src="(.*?)"/, `src="${src}"`);
  });
  return marked.Renderer.prototype.html.call(this, html);
}

function getNormalizedImageLink(href) {
  let isRelative = !(href.startsWith('http') || href.startsWith('data:') || href.startsWith('blob:') || href.startsWith('ftp:'));
  if (isRelative) {
    href = currentRawRepoUrl + '/' + href;
  }
  return href;
}

marked.use({ renderer });