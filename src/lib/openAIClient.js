
export function getStoredOpenAIKey() {
  return localStorage.getItem('openai-token') || '';
}

export function storeOpenAIKey(key) {
  localStorage.setItem('openai-token', key);
}

export async function getOpenAIModels() {
  const headers = getAuthHeaders();
  return fetch('https://api.openai.com/v1/models', { headers })
    .then(response => response.json())
    .then(data => {
      if (data.error) throw new Error(data.error.message);

      return data.data.filter(x => x.id.includes('gpt'));
    });
}

export async function sendChatRequest(messages) {
  const headers = getAuthHeaders();
  headers['Content-Type'] = 'application/json';
  const body = JSON.stringify(messages); 

  const url = "https://api.openai.com/v1/chat/completions";
  const response = await fetch(url, { method: "POST", headers, body });
  const data = await response.json();

  if (data?.error?.message) throw new Error(data.error.message);

  // TODO: Handle errors
  return data.choices[0].message;
}

function getStoredOpenAIKeyOrThrow() {
  const key = getStoredOpenAIKey();
  if (!key) throw new Error('No OpenAI API key provided');

  return key;
}

function getAuthHeaders() {
  return { 'Authorization': `Bearer ${getStoredOpenAIKeyOrThrow()}` }
}