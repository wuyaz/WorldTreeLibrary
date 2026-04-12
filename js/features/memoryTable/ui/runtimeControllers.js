import { refreshPromptPreviewView } from './promptPreview.js';
import {
  buildManagedPromptInjectionText,
  findSendTextarea,
  restoreRuntimeInjectedInput,
  applyRuntimeManagedPromptInjection
} from '../logic/injection.js';

export function createBatchController({
  batchStartEl,
  batchEndEl,
  batchStepEl,
  setStatus,
  runFillOnce
}) {
  const getChatMessagesSlice = (messages, start, end) => {
    if (!Array.isArray(messages)) return [];
    const s = Math.max(1, start || 1);
    const e = Math.min(messages.length, end || messages.length);
    return messages.slice(s - 1, e);
  };

  const buildBatchChatOverride = async (start, end) => {
    const chat = await window.ST_API.chatHistory.list({
      format: 'openai',
      mediaFormat: 'url',
      includeSwipes: false
    }).catch(async () => {
      return window.ST_API.chatHistory.list({
        format: 'gemini',
        mediaFormat: 'url',
        includeSwipes: false
      });
    });
    const messages = chat?.messages || [];
    const slice = getChatMessagesSlice(messages, start, end);
    return { ...chat, messages: slice };
  };

  const runBatchFill = async () => {
    const start = Number(batchStartEl?.value || 1);
    const end = Number(batchEndEl?.value || 1);
    const step = Math.max(1, Number(batchStepEl?.value || 1));
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < 1 || end < start) {
      setStatus('批量参数无效');
      return;
    }
    const totalBatches = Math.ceil((end - start + 1) / step);
    for (let i = 0; i < totalBatches; i++) {
      const s = start + i * step;
      const e = Math.min(end, s + step - 1);
      setStatus(`批量填表中 (${s}-${e})`);
      const override = await buildBatchChatOverride(s, e);
      await runFillOnce(override);
    }
    setStatus('批量完成');
  };

  return {
    getChatMessagesSlice,
    buildBatchChatOverride,
    runBatchFill
  };
}

export function createOpenAiModelController({
  openaiUrlEl,
  openaiKeyEl,
  openaiModelEl
}) {
  const refreshModels = async () => {
    const baseUrl = openaiUrlEl?.value || '';
    const apiKey = openaiKeyEl?.value || '';
    if (!baseUrl || !apiKey) throw new Error('请先填写 OpenAI URL/Key');
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await res.json();
    const models = (data.data || []).map((m) => m.id).sort();
    if (openaiModelEl) {
      openaiModelEl.innerHTML = models.map((id) => `<option value="${id}">${id}</option>`).join('');
      if (models[0]) openaiModelEl.value = models[0];
    }
  };

  return { refreshModels };
}

export function createPromptPreviewController({
  logContentEl,
  logPromptBtn,
  buildReferenceBundle,
  formatReferenceText,
  buildPrompt,
  applyAllPromptMacros,
  getManualConfig,
  getWbMode,
  getEntryName,
  getTableMarkdown,
  getInstructionMarkdown,
  refBlockListEl,
  getRefBlocksPreset,
  getRefOrderPreset,
  blockListEl,
  getPrePromptText,
  getSchemaText,
  getTemplateState,
  getHiddenRows,
  getLastRef,
  setLastRef
}) {
  const refreshPromptPreview = async (force = false) => {
    await refreshPromptPreviewView({
      force,
      logContentEl,
      logPromptBtn,
      buildReferenceBundle,
      formatReferenceText,
      buildPrompt,
      applyAllPromptMacros,
      getManualConfig,
      wbMode: getWbMode(),
      entryName: getEntryName(),
      tableMd: getTableMarkdown(),
      instructionMd: getInstructionMarkdown(),
      refBlockListEl,
      getRefBlocksPreset,
      getRefOrderPreset,
      blockListEl,
      prePromptText: getPrePromptText(),
      schemaText: getSchemaText(),
      templateState: getTemplateState(),
      hiddenRows: getHiddenRows(),
      getLastRef,
      setLastRef
    });
  };

  return { refreshPromptPreview };
}

export function createHookController({
  getSendModeFlags,
  refreshPromptPreview,
  saveState,
  tableInjectToggleBtn,
  instInjectToggleEl,
  schemaInjectToggleEl,
  syncTableInjection,
  syncInstructionInjection,
  syncSchemaInjection,
  applyManagedPromptInjection,
  restoreManagedPromptInput
}) {
  const ensureHooks = async () => {
    if (window.__wtlHooksInstalled) return;
    window.__wtlHooksInstalled = true;
    await window.ST_API.hooks.install({
      id: 'WorldTreeLibrary.hooks',
      intercept: {
        targets: ['sendButton', 'sendEnter'],
        block: { sendButton: true, sendEnter: true }
      },
      broadcast: { target: 'dom' }
    });

    window.addEventListener('st-api-wrapper:intercept', async (e) => {
      const p = e.detail || {};
      if (p.target !== 'sendButton' && p.target !== 'sendEnter') return;
      const { mode: sendMode, isStLike } = getSendModeFlags();

      await refreshPromptPreview(true);

      try {
        await saveState();
        if (tableInjectToggleBtn?.checked) await syncTableInjection();
        if (instInjectToggleEl?.checked) await syncInstructionInjection();
        if (schemaInjectToggleEl?.checked) await syncSchemaInjection();
      } catch (err) {
        console.warn('[WorldTreeLibrary] inject failed', err);
      }

      const target = p.target || 'sendButton';
      if (!isStLike && sendMode !== 'external') {
        console.warn('[WorldTreeLibrary] unknown send mode, fallback to default send', sendMode);
      }

      let injected = false;
      try {
        injected = await applyManagedPromptInjection();
        await window.ST_API.hooks.bypassOnce({ id: 'WorldTreeLibrary.hooks', target });
        document.getElementById('send_but')?.click();
      } catch (err) {
        console.warn('[WorldTreeLibrary] inject failed', err);
      } finally {
        if (injected) {
          window.setTimeout(() => {
            restoreManagedPromptInput();
          }, 0);
        }
      }
    });
  };

  return { ensureHooks };
}

export function createManagedPromptInjectionController({
  getSendModeFlags,
  getManagedPromptInjectionItems,
  runtimeInjectedInputRef
}) {
  const restoreManagedPromptInput = () => {
    runtimeInjectedInputRef.current = restoreRuntimeInjectedInput(runtimeInjectedInputRef.current);
  };

  const applyManagedPromptInjection = async () => {
    const { mode: sendMode, isStLike } = getSendModeFlags();
    const { items } = getManagedPromptInjectionItems();
    const injectedText = buildManagedPromptInjectionText(items);
    const result = applyRuntimeManagedPromptInjection({
      runtimeInjectedInput: runtimeInjectedInputRef.current,
      isStLike,
      sendMode,
      injectedText,
      textarea: findSendTextarea(document)
    });
    runtimeInjectedInputRef.current = result.runtimeInjectedInput;
    return result.applied;
  };

  const syncManagedPromptInjections = async () => {
    const { items } = getManagedPromptInjectionItems();
    const payload = buildManagedPromptInjectionText(items);
    localStorage.setItem('wtl.runtimeManagedPromptInjection', payload || '');
  };

  return {
    restoreManagedPromptInput,
    applyManagedPromptInjection,
    syncManagedPromptInjections,
    syncTableInjection: async () => syncManagedPromptInjections(),
    syncInstructionInjection: async () => syncManagedPromptInjections(),
    syncSchemaInjection: async () => syncManagedPromptInjections()
  };
}
