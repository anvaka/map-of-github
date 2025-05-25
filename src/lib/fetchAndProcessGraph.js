import config from './config';

export async function fetchAndProcessGraph(groupId, progressCallback) {
  const fileName = `${groupId}.graph.dot`;
  const url = `${config.graphsEndpoint}/${fileName}`;

  let text;

  if (progressCallback) {
    // Fetch with progress tracking
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch graph for group ${groupId}: ${response.status} ${response.statusText}`);
    }

    // Get content length if available
    const totalBytes = response.headers.get('content-length')
      ? parseInt(response.headers.get('content-length'), 10)
      : undefined;

    // Create a reader from the response body
    const reader = response.body.getReader();
    let bytesReceived = 0;
    let chunks = [];

    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;

      if (!done) {
        const value = result.value;
        chunks.push(value);
        bytesReceived += value.length;

        progressCallback({
          fileName,
          bytesReceived,
          totalBytes
        });
      }
    }

    // Combine all chunks into a single array
    const chunksAll = new Uint8Array(bytesReceived);
    let position = 0;
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }

    // Convert to text
    text = new TextDecoder("utf-8").decode(chunksAll);
  } else {
    // Standard fetch without progress
    let response = await fetch(url);
    text = await response.text();
  }

  let fromDot = await import('ngraph.fromdot');
  let graph = fromDot.default(text);

  graph.forEachNode(node => {
    node.data.l = node.data.l.split(',').map(x => +x);
    if (node.data.c === undefined) {
      // Nodes of external groups will have their groupId set in the `.data.c` property
      // However nodes that belong to current group will have this property set to undefined
      // We set it here to make sure we know which group the node belongs to
      node.data.c = groupId;
    }
  });

  return graph;
}
