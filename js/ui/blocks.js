// UI 绑定辅助

export const getRefBlockEls = (refBlockListEl) => Array.from(refBlockListEl?.querySelectorAll('.wtl-block') || []);
export const getBlockEls = (blockListEl) => Array.from(blockListEl?.querySelectorAll('.wtl-block') || []);

export const serializeBlockOrder = (listEl) => {
  if (!listEl) return null;
  return Array.from(listEl.querySelectorAll('.wtl-block')).map((el) => ({
    id: el.dataset.id,
    label: el.dataset.label,
    type: el.dataset.type,
    field: el.dataset.field || undefined,
    position: el.dataset.position || undefined,
    hidden: el.dataset.hidden === 'true',
    content: el.dataset.content || undefined,
    prefix: el.dataset.prefix || undefined,
    suffix: el.dataset.suffix || undefined,
    usePrefix: el.dataset.usePrefix || undefined,
    useSuffix: el.dataset.useSuffix || undefined
  }));
};
