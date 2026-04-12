export function buildBlockLabel(block) {
  return block.label || block.id || '未知块';
}

function ensureWrapperFlag(value, fallback = false) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function collectCurrentBlocks(host, includeContent = false) {
  return Array.from(host?.querySelectorAll('.wtl-block') || []).map((el) => ({
    id: el.dataset.id,
    label: el.dataset.label,
    type: el.dataset.type,
    field: el.dataset.field || undefined,
    position: el.dataset.position || undefined,
    hidden: el.dataset.hidden === 'true',
    content: includeContent ? (el.dataset.content || undefined) : undefined,
    prefix: el.dataset.prefix || undefined,
    suffix: el.dataset.suffix || undefined,
    usePrefix: el.dataset.usePrefix || undefined,
    useSuffix: el.dataset.useSuffix || undefined
  }));
}

function createBlockItem(block) {
  const item = document.createElement('div');
  item.className = 'wtl-block';
  if (block.hidden) item.classList.add('is-hidden');
  item.setAttribute('draggable', 'true');
  item.dataset.id = block.id;
  item.dataset.label = block.label || block.id;
  item.dataset.type = block.type || '';
  if (block.field) item.dataset.field = block.field;
  if (block.position) item.dataset.position = block.position;
  item.dataset.hidden = block.hidden ? 'true' : 'false';
  item.dataset.prefix = block.prefix || '';
  item.dataset.suffix = block.suffix || '';
  item.dataset.usePrefix = ensureWrapperFlag(block.usePrefix, Boolean(block.prefix)) ? 'true' : 'false';
  item.dataset.useSuffix = ensureWrapperFlag(block.useSuffix, Boolean(block.suffix)) ? 'true' : 'false';
  if (block.type === 'custom') item.dataset.content = block.content || '';
  return item;
}

function createActionButton(iconClass, title) {
  const button = document.createElement('button');
  button.className = 'wtl-icon-btn';
  button.innerHTML = `<i class="${iconClass}"></i>`;
  button.title = title;
  return button;
}

export function createBlockEditorController({
  blockListEl,
  refBlockListEl,
  getBlocksPreset,
  getRefBlocksPreset,
  saveState,
  refreshPromptPreview,
  openBlockPreview,
  openBlockWrapperEdit,
  openBlockEdit,
  blockAddEl,
  refBlockAddEl
}) {
  const normalizeBlocks = (blocks) => {
    const base = (getBlocksPreset() || []).map((block) => ({ ...block }));
    const incoming = Array.isArray(blocks) ? blocks : [];
    const map = new Map(base.map((block) => [block.id, block]));
    incoming.forEach((block) => {
      if (!block?.id) return;
      if (map.has(block.id)) {
        const current = map.get(block.id);
        map.set(block.id, { ...current, ...block });
      } else if (block.type === 'custom') {
        map.set(block.id, { ...block, hidden: Boolean(block.hidden) });
      }
    });
    const used = new Set(incoming.map((block) => block.id));
    const merged = [];
    incoming.forEach((block) => {
      const item = map.get(block.id);
      if (item) merged.push(item);
    });
    base.forEach((block) => {
      if (!used.has(block.id)) merged.push(block);
    });
    return merged.map((block) => {
      if (block.type === 'custom' && typeof block.content !== 'string') return { ...block, content: '' };
      return block;
    });
  };

  const normalizeRefBlocks = (blocks) => {
    const base = (getRefBlocksPreset() || []).map((block) => ({ ...block }));
    const incomingRaw = Array.isArray(blocks) ? blocks : [];
    const incoming = incomingRaw
      .map((block) => {
        if (!block?.id) return block;
        if (block.id.startsWith('ref_') && !block.id.startsWith('ref_custom_')) {
          return { ...block, id: block.id.replace(/^ref_/, '') };
        }
        return block;
      })
      .filter((block) => block?.id && block.id !== 'chat');

    const map = new Map(base.map((block) => [block.id, block]));
    incoming.forEach((block) => {
      if (!block?.id) return;
      if (map.has(block.id)) {
        const current = map.get(block.id);
        map.set(block.id, { ...current, ...block });
      } else {
        map.set(block.id, { ...block, hidden: Boolean(block.hidden) });
      }
    });

    const used = new Set(incoming.map((block) => block.id));
    const merged = [];
    incoming.forEach((block) => {
      const item = map.get(block.id);
      if (item) merged.push(item);
    });
    base.forEach((block) => {
      if (!used.has(block.id)) merged.push(block);
    });
    return merged;
  };

  const renderRefBlockList = (blocks) => {
    if (!refBlockListEl) return;
    const merged = normalizeRefBlocks(blocks);
    refBlockListEl.innerHTML = '';

    merged.forEach((block) => {
      const item = createBlockItem(block);
      const label = document.createElement('div');
      label.className = 'wtl-block-label';
      label.textContent = buildBlockLabel(block);

      const actions = document.createElement('div');
      actions.className = 'wtl-block-actions';

      const previewBtn = createActionButton('fa-solid fa-eye', '预览');
      const editBtn = createActionButton('fa-solid fa-gear', '编辑前缀/后缀');
      const editContentBtn = createActionButton('fa-solid fa-pen', '编辑内容');
      const hideBtn = createActionButton('fa-solid fa-ghost', '隐藏/显示');

      actions.appendChild(previewBtn);
      actions.appendChild(editBtn);
      if (block.type === 'custom') actions.appendChild(editContentBtn);
      actions.appendChild(hideBtn);

      item.appendChild(label);
      item.appendChild(actions);

      previewBtn.addEventListener('click', async () => {
        await openBlockPreview(block, item);
      });
      editBtn.addEventListener('click', () => {
        openBlockWrapperEdit(block, item);
      });
      editContentBtn.addEventListener('click', () => {
        openBlockEdit(block);
      });
      hideBtn.addEventListener('click', () => {
        const nextHidden = item.dataset.hidden !== 'true';
        item.dataset.hidden = nextHidden ? 'true' : 'false';
        item.classList.toggle('is-hidden', nextHidden);
        saveState();
        refreshPromptPreview(true);
      });

      refBlockListEl.appendChild(item);
    });
  };

  const renderBlockList = (blocks) => {
    if (!blockListEl) return;
    const merged = normalizeBlocks(blocks);
    blockListEl.innerHTML = '';

    merged.forEach((block) => {
      const item = createBlockItem(block);
      const label = document.createElement('div');
      label.className = 'wtl-block-label';
      label.textContent = buildBlockLabel(block);

      const actions = document.createElement('div');
      actions.className = 'wtl-block-actions';

      const previewBtn = createActionButton('fa-solid fa-eye', '预览');
      const editBtn = createActionButton('fa-solid fa-gear', '编辑前缀/后缀');
      const hideBtn = createActionButton('fa-solid fa-ghost', '隐藏/显示');
      const delBtn = createActionButton('fa-solid fa-trash', '删除');
      const canDelete = block.type === 'custom';

      actions.appendChild(previewBtn);
      actions.appendChild(editBtn);
      actions.appendChild(hideBtn);
      if (canDelete) actions.appendChild(delBtn);

      item.appendChild(label);
      item.appendChild(actions);

      previewBtn.addEventListener('click', async () => {
        await openBlockPreview(block, item);
      });
      editBtn.addEventListener('click', () => {
        openBlockWrapperEdit(block, item);
      });
      hideBtn.addEventListener('click', () => {
        const nextHidden = item.dataset.hidden !== 'true';
        item.dataset.hidden = nextHidden ? 'true' : 'false';
        item.classList.toggle('is-hidden', nextHidden);
        saveState();
        refreshPromptPreview(true);
      });
      delBtn.addEventListener('click', () => {
        if (!canDelete) return;
        item.remove();
        saveState();
        refreshPromptPreview(true);
      });

      blockListEl.appendChild(item);
    });
  };

  const addCustomBlock = () => {
    if (!blockListEl) return;
    const block = {
      id: `custom_${Date.now()}`,
      label: '自定义提示词',
      type: 'custom',
      hidden: false,
      content: '',
      prefix: '',
      suffix: '',
      usePrefix: 'false',
      useSuffix: 'false'
    };
    const current = collectCurrentBlocks(blockListEl, true);
    current.push(block);
    renderBlockList(current);
    saveState();
    refreshPromptPreview(true);
    openBlockEdit(block);
  };

  const addCustomRefBlock = () => {
    if (!refBlockListEl) return;
    const block = {
      id: `ref_custom_${Date.now()}`,
      label: '自定义提示词',
      type: 'custom',
      hidden: false,
      content: '',
      prefix: '',
      suffix: '',
      usePrefix: 'false',
      useSuffix: 'false'
    };
    const current = collectCurrentBlocks(refBlockListEl, false);
    current.push(block);
    renderRefBlockList(current);
    saveState();
    refreshPromptPreview(true);
    openBlockEdit(block);
  };

  blockAddEl?.addEventListener('click', addCustomBlock);
  refBlockAddEl?.addEventListener('click', addCustomRefBlock);

  return {
    buildBlockLabel,
    ensureWrapperFlag,
    normalizeBlocks,
    normalizeRefBlocks,
    renderBlockList,
    renderRefBlockList,
    addCustomBlock,
    addCustomRefBlock
  };
}
