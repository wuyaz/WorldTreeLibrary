// AI 调用

export const callOpenAI = async (options = {}) => {
  const {
    baseUrl = '',
    apiKey = '',
    model = '',
    temperature = 0.7,
    maxTokens = 1024,
    promptText = '',
    stream = true
  } = options;

  if (!baseUrl || !apiKey || !model) throw new Error('请先配置 OpenAI URL/Key/模型');

  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const payload = {
    model,
    temperature,
    max_tokens: maxTokens,
    stream,
    messages: [
      { role: 'user', content: promptText }
    ]
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new Error(`第三方 API 调用失败: ${res.status} ${message || res.statusText}`.trim());
  }

  if (!stream) {
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  if (!res.body) {
    const data = await res.json().catch(() => ({}));
    return data?.choices?.[0]?.message?.content || '';
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let output = '';

  const consumeEvent = (eventText) => {
    const lines = eventText.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        const message = json?.choices?.[0]?.message?.content;
        if (typeof delta === 'string') output += delta;
        else if (typeof message === 'string') output += message;
      } catch {
        // 忽略非 JSON 或不完整分片，继续等待后续数据
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || '';
    for (const part of parts) consumeEvent(part);

    if (done) break;
  }

  if (buffer.trim()) consumeEvent(buffer);
  return output;
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

  const isStLike = sendMode === 'st';
  if (!isStLike) {
    throw new Error(`不支持的填表模式: ${sendMode}`);
  }

  const generateOptions = {
    writeToChat: false,
    timeoutMs: 60000,
    extraBlocks: [
      { role: 'user', content: promptText }
    ]
  };

  const res = await ST_API.prompt.generate(generateOptions);
  const text = res.text || '';
  if (typeof logAi === 'function') logAi(text);
  return text;
};
