let DOMPurify;
let marked;

let currentRepoURL = '';
let currentRawRepoUrl = '';

export async function getMarkdownContent(markdownString, repoName, branch) {

  if (!marked) {
    marked = await import('marked');
    initMarkedRenderer(marked);
  }
  if (!DOMPurify) {
    let domPurifyModule = await import('dompurify');
    DOMPurify = domPurifyModule.default;
  }

    currentRepoURL = 'https://github.com/' + repoName;
    currentRawRepoUrl = 'https://raw.githubusercontent.com/' + repoName + '/' + branch;
    marked.setOptions({
      baseUrl: `https://github.com/${repoName}/blob/${branch}/`,
    })
    let unsafeDOM = marked.parse(markdownString);
    return DOMPurify.sanitize(unsafeDOM);
}

function initMarkedRenderer(marked) {
  const renderer = new marked.Renderer();
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
}