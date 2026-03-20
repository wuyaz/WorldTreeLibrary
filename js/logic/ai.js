// AI 调用

export const callOpenAI = async (options = {}) => {
  const {
    baseUrl = '',
    apiKey = '',
    model = '',
    temperature = 0.7,
    maxTokens = 1024,
    promptText = ''
  } = options;

  if (!baseUrl || !apiKey || !model) throw new Error('请先配置 OpenAI URL/Key/模型');

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'user', content: promptText }
      ]
    })
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
};

export const callAi = async (options = {}) => {
  const {
    ST_API = window.ST_API,
    sendMode = 'st',
    promptText = '',
    logPrompt = null,
    logAi = null,
    openai = {}
  } = options;

  if (typeof logPrompt === 'function') logPrompt(promptText || '');

  if (sendMode === 'external') {
    const aiText = await callOpenAI({ ...openai, promptText });
    if (typeof logAi === 'function') logAi(aiText || '');
    return aiText;
  }

  const res = await ST_API.prompt.generate({
    writeToChat: false,
    timeoutMs: 60000,
    extraBlocks: [
      { role: 'user', content: promptText }
    ]
  });
  const text = res.text || '';
  if (typeof logAi === 'function') logAi(text);
  return text;
};
