import { buildTemplatePrompt, parseSchemaToTemplate } from '../table/template.js';
import { ensureEditWrapper } from '../table/commands.js';
import { ensureTableWrapper } from '../table/markdown.js';
import { getRefBlockEls } from './blocks.js';
import { buildBlockLabel } from './blockEditor.js';

export function createBlockModalController({
  openModal,
  makeModalSaveButton,
  buildReferenceBundle,
  formatReferenceText,
  getManualConfig,
  getWbMode,
  getEntryName,
  getTableMarkdown,
  getInstructionMarkdown,
  getSchemaValue,
  getSchemaSource,
  setSchemaSource,
  getTemplateState,
  setTemplateState,
  setTemplateActiveSectionId,
  updateSchemaPreview,
  saveState,
  refreshPromptPreview,
  findAnyBlockElById,
  refBlockListEl,
  getRefBlocksPreset,
  getRefOrderPreset,
  getLastRef,
  setLastRef,
  getPrePromptText,
  setPrePromptText,
  setInstructionText,
  setSchemaText,
  setTableMarkdown
}) {
  const getBlockText = (block) => {
    if (block.type === 'preprompt') return getPrePromptText();
    if (block.type === 'instruction') return ensureEditWrapper(getInstructionMarkdown());
    if (block.type === 'schema') return buildTemplatePrompt(getTemplateState()) || getSchemaValue();
    if (block.type === 'table') return ensureTableWrapper(getTableMarkdown());
    if (block.type === 'custom') return (block.content ?? findAnyBlockElById(block.id)?.dataset.content) || '';
    return '';
  };

  const setBlockText = (block, value) => {
    if (block.type === 'preprompt') setPrePromptText(value);
    if (block.type === 'instruction') setInstructionText(value);
    if (block.type === 'schema') {
      setSchemaText(value);
      setSchemaSource(value);
    }
    if (block.type === 'table') setTableMarkdown(value);
    if (block.type === 'custom') {
      block.content = value;
      const el = findAnyBlockElById(block.id);
      if (el) el.dataset.content = value;
    }
  };

  const getBlockTextAsync = async (block, el) => {
    const prefix = el?.dataset.prefix || '';
    const suffix = el?.dataset.suffix || '';
    const usePrefix = (el?.dataset.usePrefix ?? (prefix ? 'true' : 'false')) === 'true';
    const useSuffix = (el?.dataset.useSuffix ?? (suffix ? 'true' : 'false')) === 'true';
    if (['preprompt', 'instruction', 'schema', 'table', 'system', 'custom'].includes(block.type)) {
      const base = getBlockText(block);
      return `${usePrefix ? prefix : ''}${base}${useSuffix ? suffix : ''}`.trim();
    }
    if (block.type === 'reference' || block.type === 'chat' || block.type === 'persona' || block.type === 'character' || block.type === 'worldBook') {
      const ref = getLastRef() || await buildReferenceBundle({
        overrideChat: null,
        wbMode: getWbMode(),
        manualConfig: getManualConfig(),
        worldBookName: 'Current Chat'
      });
      setLastRef(ref);
      const refBlocks = await formatReferenceText({
        ref,
        entryName: getEntryName(),
        tableMd: getTableMarkdown(),
        instructionMd: getInstructionMarkdown(),
        refBlockEls: getRefBlockEls(refBlockListEl),
        refBlocksPreset: getRefBlocksPreset() || [],
        refOrderPreset: getRefOrderPreset() || []
      });
      const target = refBlocks.find((item) => item.id === block.id);
      const base = target ? target.text : '';
      return `${usePrefix ? prefix : ''}${base}${useSuffix ? suffix : ''}`.trim();
    }
    return '';
  };

  const openBlockEdit = (block) => {
    const title = `编辑内容：${buildBlockLabel(block)}`;
    const value = getBlockText(block);
    const saveBtn = makeModalSaveButton('保存', (next) => {
      setBlockText(block, next);
      if (block.type === 'schema') {
        const nextTemplateState = parseSchemaToTemplate(getSchemaSource() || getSchemaValue() || '');
        setTemplateState(nextTemplateState);
        setTemplateActiveSectionId(nextTemplateState.sections[0]?.id || '');
        updateSchemaPreview();
      }
      saveState();
      refreshPromptPreview(true);
    });
    openModal(title, value, [saveBtn]);
  };

  const openBlockWrapperEdit = (block, el) => {
    const title = `包装设置：${buildBlockLabel(block)}`;
    const prefix = el?.dataset.prefix || '';
    const suffix = el?.dataset.suffix || '';
    const usePrefix = (el?.dataset.usePrefix ?? (prefix ? 'true' : 'false')) === 'true';
    const useSuffix = (el?.dataset.useSuffix ?? (suffix ? 'true' : 'false')) === 'true';
    let prefixToggle = null;
    let suffixToggle = null;
    let prefixInput = null;
    let suffixInput = null;
    const saveBtn = makeModalSaveButton('保存', () => {
      if (!prefixToggle || !suffixToggle || !prefixInput || !suffixInput) return;
      if (el) {
        el.dataset.usePrefix = prefixToggle.checked ? 'true' : 'false';
        el.dataset.useSuffix = suffixToggle.checked ? 'true' : 'false';
        el.dataset.prefix = prefixInput.value || '';
        el.dataset.suffix = suffixInput.value || '';
      }
      saveState();
      refreshPromptPreview(true);
    });
    openModal(title, '', [saveBtn], (wrap) => {
      wrap.innerHTML = '';
      const prefixRow = document.createElement('div');
      prefixRow.className = 'wtl-row';
      prefixToggle = document.createElement('input');
      prefixToggle.type = 'checkbox';
      prefixToggle.checked = usePrefix;
      const prefixLabel = document.createElement('label');
      prefixLabel.textContent = '启用前缀';
      prefixInput = document.createElement('input');
      prefixInput.className = 'text_pole';
      prefixInput.value = prefix;
      prefixInput.disabled = !prefixToggle.checked;
      prefixToggle.addEventListener('change', () => {
        prefixInput.disabled = !prefixToggle.checked;
      });
      prefixRow.appendChild(prefixToggle);
      prefixRow.appendChild(prefixLabel);
      const prefixWrap = document.createElement('div');
      prefixWrap.className = 'wtl-row';
      prefixWrap.appendChild(prefixInput);

      const suffixRow = document.createElement('div');
      suffixRow.className = 'wtl-row';
      suffixToggle = document.createElement('input');
      suffixToggle.type = 'checkbox';
      suffixToggle.checked = useSuffix;
      const suffixLabel = document.createElement('label');
      suffixLabel.textContent = '启用后缀';
      suffixInput = document.createElement('input');
      suffixInput.className = 'text_pole';
      suffixInput.value = suffix;
      suffixInput.disabled = !suffixToggle.checked;
      suffixToggle.addEventListener('change', () => {
        suffixInput.disabled = !suffixToggle.checked;
      });
      suffixRow.appendChild(suffixToggle);
      suffixRow.appendChild(suffixLabel);
      const suffixWrap = document.createElement('div');
      suffixWrap.className = 'wtl-row';
      suffixWrap.appendChild(suffixInput);

      wrap.appendChild(prefixRow);
      wrap.appendChild(prefixWrap);
      wrap.appendChild(suffixRow);
      wrap.appendChild(suffixWrap);
    }, { hideContent: true, readOnly: true });
  };

  const openBlockPreview = async (block, el) => {
    const title = `预览：${buildBlockLabel(block)}`;
    const content = await getBlockTextAsync(block, el);
    openModal(title, content || '', []);
  };

  return {
    getBlockText,
    setBlockText,
    getBlockTextAsync,
    openBlockEdit,
    openBlockWrapperEdit,
    openBlockPreview
  };
}
