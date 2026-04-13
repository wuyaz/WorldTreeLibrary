import { getBlockEls, getRefBlockEls } from './blockEditor.js';

export async function refreshPromptPreviewView({
  force = false,
  logContentEl,
  logPromptBtn,
  buildReferenceBundle,
  formatReferenceText,
  buildPrompt,
  applyAllPromptMacros,
  getManualConfig,
  wbMode,
  entryName,
  tableMd,
  instructionMd,
  refBlockListEl,
  getRefBlocksPreset,
  getRefOrderPreset,
  blockListEl,
  prePromptText,
  schemaText,
  templateState,
  hiddenRows,
  getLastRef,
  setLastRef
}) {
  if (!logContentEl) return;
  try {
    let ref = null;
    if (force) {
      ref = await buildReferenceBundle({
        overrideChat: null,
        wbMode: wbMode || 'auto',
        manualConfig: getManualConfig?.(),
        worldBookName: 'Current Chat'
      });
      setLastRef?.(ref);
    } else {
      ref = getLastRef?.();
      if (!ref) {
        ref = await buildReferenceBundle({
          overrideChat: null,
          wbMode: wbMode || 'auto',
          manualConfig: getManualConfig?.(),
          worldBookName: 'Current Chat'
        });
        setLastRef?.(ref);
      }
    }

    const refBlocks = await formatReferenceText({
      ref,
      entryName: entryName || 'WorldTreeMemory',
      tableMd: tableMd || '',
      instructionMd: instructionMd || '',
      refBlockEls: getRefBlockEls(refBlockListEl),
      refBlocksPreset: getRefBlocksPreset?.() || [],
      refOrderPreset: getRefOrderPreset?.() || []
    });

    const promptTextRaw = buildPrompt({
      blockEls: getBlockEls(blockListEl),
      refTextBlocks: refBlocks,
      prePromptText: prePromptText || '',
      instructionText: instructionMd || '',
      schemaText: schemaText || '',
      tableText: tableMd || '',
      templateState,
      hiddenRows
    });

    const promptText = await applyAllPromptMacros(promptTextRaw);
    localStorage.setItem('wtl.lastPrompt', promptText || '');
    if (logPromptBtn?.dataset?.active === 'true') {
      logContentEl.value = promptText || '';
    }
  } catch (e) {
    console.warn('[WorldTreeLibrary] preview build failed', e);
  }
}
