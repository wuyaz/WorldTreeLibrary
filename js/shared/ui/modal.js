export function createModalController({
  modalEl,
  modalTitleEl,
  modalContentEl,
  modalCustomEl,
  modalActionsEl
}) {
  const openModal = (title, content, actions = [], customBuilder = null, options = {}) => {
    if (!modalEl || !modalTitleEl || !modalContentEl || !modalActionsEl) return;
    const { hideContent = false, readOnly = false } = options || {};
    
    modalTitleEl.textContent = title || '';
    modalContentEl.value = content || '';
    modalContentEl.readOnly = readOnly === true;
    modalContentEl.style.display = hideContent ? 'none' : 'block';

    if (modalCustomEl) {
      modalCustomEl.innerHTML = '';
      if (typeof customBuilder === 'function') {
        modalCustomEl.style.display = 'block';
        customBuilder(modalCustomEl);
      } else if (hideContent && (content || '').length) {
        modalCustomEl.style.display = 'block';
        const message = document.createElement('div');
        message.className = 'wtl-modal-message';
        message.textContent = content || '';
        modalCustomEl.appendChild(message);
      } else {
        modalCustomEl.style.display = 'none';
      }
    }

    modalActionsEl.innerHTML = '';
    actions.forEach((btn) => modalActionsEl.appendChild(btn));
    
    if (modalEl.showModal) {
      if (modalEl.open) {
        modalEl.close();
      }
      modalEl.showModal();
    } else {
      modalEl.classList.add('is-open');
    }
    
    if (!hideContent) modalContentEl.focus();
  };

  const openConfirmModal = (title, message, actions = []) => {
    const builder = (wrap) => {
      const messageEl = document.createElement('div');
      messageEl.className = 'wtl-modal-message';
      messageEl.textContent = message || '';
      wrap.appendChild(messageEl);
    };
    openModal(title, '', actions, builder, { hideContent: true, readOnly: true });
  };

  const closeModal = () => {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    if (modalEl.open && modalEl.close) {
      modalEl.close();
    }
    if (modalActionsEl) {
      modalActionsEl.innerHTML = '';
    }
  };

  const makeModalSaveButton = (label, onSave) => {
    const btn = document.createElement('button');
    btn.className = 'menu_button';
    btn.textContent = label || '保存';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = modalContentEl?.value || '';
      if (onSave) onSave(next);
      closeModal();
    });
    return btn;
  };

  return {
    openModal,
    openConfirmModal,
    closeModal,
    makeModalSaveButton
  };
}
