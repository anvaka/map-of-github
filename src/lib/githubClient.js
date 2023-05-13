import bus from './bus.js';
import { getMarkdownContent } from './getMarkdownContent.js';

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

export function signOut() {
  delete headers['Authorization'];
  document.cookie = 'github_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  currentUser = null;
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

export function getCachedCurrentUser() {
  return currentUser;
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
    } else if (response.status === 451) {
      return {
        state: 'ERROR',
        error: 'Repository is unavailable due to legal reasons (http status code 451).',
      }
    } else {
      const errorMessage = ['HTTP error']
      try {
        const data = await response.json();
        if (data?.message) errorMessage.push('Message: ' + data.message);
      } catch (e) {/* ignore */}
      errorMessage.push('Status: ' +  response.status);

      return {
        state: 'ERROR',
        error: errorMessage.join('. '),
      }
    }
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
        let safeMarkdownString = await getMarkdownContent(markdownString, repoName, branch);
        return {
          state: 'LOADED',
          content: safeMarkdownString
        };
      }
    }
  }
}

function formatNiceNumber(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
