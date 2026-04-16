// @ts-nocheck

let cachedToken = null;

async function getToken() {
  if (cachedToken) return cachedToken;
  
  // Try multiple ways to get the token
  let token = window.token;
  
  // Try to get from top window (iframe case)
  if (!token && window.parent && window.parent !== window) {
    token = window.parent.token;
  }
  
  // Try to get from SillyTavern context
  if (!token) {
    const ctx = window.SillyTavern?.getContext?.();
    token = ctx?.token;
  }
  
  // Try to get from meta tag
  if (!token) {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      token = metaTag.getAttribute('content');
    }
  }
  
  // If still no token, fetch from API
  if (!token) {
    try {
      const response = await fetch('/csrf-token');
      if (response.ok) {
        const data = await response.json();
        token = data.token;
      }
    } catch (e) {
      console.error('[WTL ChatManager] Failed to fetch token:', e);
    }
  }
  
  if (token) {
    cachedToken = token;
  }
  
  return token;
}

export async function getRequestHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  const token = await getToken();
  
  console.log('[WTL ChatManager] Token:', token ? 'found: ' + token.substring(0, 10) + '...' : 'not found');
  
  if (token) {
    headers['X-CSRF-Token'] = token;
  }
  
  return headers;
}

export async function listCharacters() {
  const ctx = window.SillyTavern?.getContext?.();
  let characters = window.characters || ctx?.characters || [];

  console.log('[WTL ChatManager] Initial characters:', characters.length);
  console.log('[WTL ChatManager] ctx available:', !!ctx);
  console.log('[WTL ChatManager] getCharacters function:', typeof ctx?.getCharacters);

  if ((!characters || characters.length === 0) && ctx && typeof ctx.getCharacters === 'function') {
    console.log('[WTL ChatManager] Calling getCharacters...');
    await ctx.getCharacters();
    characters = window.characters || ctx.characters || [];
    console.log('[WTL ChatManager] After getCharacters:', characters.length);
  }

  console.log('[WTL ChatManager] Final characters:', characters.length, characters.map(c => c.name));
  return Array.isArray(characters) ? characters : [];
}

export async function getPastCharacterChats(avatarUrl) {
  console.log('[WTL ChatManager] Fetching chats for avatar:', avatarUrl);
  try {
    const headers = await getRequestHeaders();
    const response = await fetch('/api/characters/chats', {
      method: 'POST',
      body: JSON.stringify({ avatar_url: avatarUrl }),
      headers: headers,
    });

    console.log('[WTL ChatManager] Response status:', response.status);

    if (!response.ok) {
      console.warn('[WTL ChatManager] Response not ok');
      return [];
    }

    const data = await response.json();
    console.log('[WTL ChatManager] Response data:', data);
    
    if (typeof data === 'object' && data.error === true) {
      console.warn('[WTL ChatManager] Data has error');
      return [];
    }

    const chats = Object.values(data);
    console.log('[WTL ChatManager] Chats found:', chats.length);
    return chats.sort((a, b) => a.file_name.localeCompare(b.file_name)).reverse();
  } catch (error) {
    console.error('[WTL ChatManager] getPastCharacterChats error:', error);
    return [];
  }
}

export async function fetchAllChats() {
  console.log('[WTL ChatManager] fetchAllChats called');
  const allChats = [];
  
  const characters = await listCharacters();
  
  if (characters.length === 0) {
    console.warn('[WTL ChatManager] No characters found');
    return [];
  }

  console.log('[WTL ChatManager] Processing', characters.length, 'characters');

  for (const char of characters) {
    const avatarUrl = char.avatar;
    console.log('[WTL ChatManager] Character:', char.name, 'avatar:', avatarUrl);
    if (!avatarUrl) {
      console.warn('[WTL ChatManager] No avatar for character:', char.name);
      continue;
    }

    try {
      const chats = await getPastCharacterChats(avatarUrl);
      console.log('[WTL ChatManager] Got', chats.length, 'chats for', char.name);
      
      chats.forEach(chat => {
        const fileName = chat.file_name || chat.name;
        if (!fileName) return;
        
        const timestamp = chat.last_mes || chat.create_date || 0;
        let normalizedTimestamp = 0;
        if (typeof timestamp === 'string') {
          const parsed = Date.parse(timestamp);
          normalizedTimestamp = Number.isNaN(parsed) ? 0 : parsed;
        } else if (typeof timestamp === 'number') {
          normalizedTimestamp = timestamp;
        }
        
        allChats.push({
          character: char.name,
          charId: avatarUrl,
          fileName: fileName,
          timestamp: normalizedTimestamp,
          preview: chat.mes || '暂无预览',
          globalKey: `${avatarUrl}|${fileName}`,
          messageCount: chat.chat_items || chat.messages_count || chat.message_count || 0,
          fileSize: chat.file_size || ''
        });
      });
    } catch (e) {
      console.error(`[WTL ChatManager] Failed to fetch chats for ${char.name}:`, e);
    }
  }

  console.log('[WTL ChatManager] Total chats fetched:', allChats.length);
  return allChats;
}

export async function fetchChatContent(charId, fileName) {
  console.log('[WTL ChatManager] fetchChatContent called with:', { charId, fileName });
  
  const fileVariants = [fileName, fileName.replace(/\.jsonl$/i, '')];
  let lastError = null;

  for (const fName of fileVariants) {
    try {
      const headers = await getRequestHeaders();
      console.log('[WTL ChatManager] Trying to fetch:', { avatar_url: charId, file_name: fName });
      
      const response = await fetch('/api/chats/get', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          avatar_url: charId,
          file_name: fName,
        }),
      });

      console.log('[WTL ChatManager] Response status:', response.status);
      
      if (!response.ok) {
        console.warn('[WTL ChatManager] Response not ok:', response.status, await response.text());
        continue;
      }

      const result = await response.text();
      console.log('[WTL ChatManager] Response text length:', result?.length);
      console.log('[WTL ChatManager] Response preview:', result?.substring(0, 200));
      
      if (result && result !== '{}' && result !== '[]') {
        try {
          const parsed = JSON.parse(result);
          console.log('[WTL ChatManager] Parsed JSON type:', Array.isArray(parsed) ? 'array' : 'object', 'has lines:', !!parsed.lines);
          
          if (parsed.lines) return parsed.lines;
          
          if (Array.isArray(parsed)) {
            console.log('[WTL ChatManager] Direct array response, count:', parsed.length);
            return parsed;
          }
        } catch(e) {
          console.log('[WTL ChatManager] Not a single JSON, trying JSONL parse');
          const lines = result.split('\n')
            .filter(l => l.trim() !== '')
            .map(l => {
              try { return JSON.parse(l); } 
              catch { return null; }
            })
            .filter(Boolean);
          console.log('[WTL ChatManager] Parsed JSONL lines:', lines.length);
          if (lines.length > 0) return lines;
        }
      } else {
        console.log('[WTL ChatManager] Result is empty or {}');
      }
    } catch (err) {
      lastError = err;
      console.warn('[WTL ChatManager] fetchChatContent error:', err);
    }
  }
  console.error('[WTL ChatManager] All fetch attempts failed. Last error:', lastError);
  return null;
}

export async function openCharacterChat(charId, fileName) {
  try {
    const scriptModule = await import('/script.js');
    
    let normalizedCharId = charId;
    if (normalizedCharId.endsWith('.png')) {
      normalizedCharId = normalizedCharId.slice(0, -4);
    }
    
    const characters = scriptModule.characters || window.characters || [];
    const charIdx = characters.findIndex(
      c => c.avatar === charId || c.avatar === normalizedCharId + '.png' || c.name === normalizedCharId
    );
    
    if (charIdx === -1) {
      console.warn('[WTL ChatManager] Character not found:', charId);
      return false;
    }
    
    let normalizedFileName = fileName;
    while (normalizedFileName.endsWith('.jsonl')) {
      normalizedFileName = normalizedFileName.slice(0, -6);
    }
    
    if (typeof scriptModule.selectCharacterById === 'function') {
      await scriptModule.selectCharacterById(charIdx);
    } else if (typeof window.selectCharacterById === 'function') {
      await window.selectCharacterById(charIdx);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (typeof scriptModule.openCharacterChat === 'function') {
      await scriptModule.openCharacterChat(normalizedFileName);
      return true;
    } else if (typeof window.openCharacterChat === 'function') {
      await window.openCharacterChat(normalizedFileName);
      return true;
    }
    
    console.warn('[WTL ChatManager] openCharacterChat function not found');
    return false;
  } catch (e) {
    console.error('[WTL ChatManager] Failed to open chat:', e);
    return false;
  }
}
