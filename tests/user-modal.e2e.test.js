/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

describe('User modal interactions', () => {
  beforeEach(() => {
    const html = fs.readFileSync(path.join(__dirname, '../public/partials/user-modal.html'), 'utf8');
    document.body.innerHTML = html;
    window.currentEditingUserId = null;

    window.showNewUserModal = function () {
      const modal = document.getElementById('user-modal');
      const title = document.getElementById('user-modal-title');
      const form = document.getElementById('user-form');
      if (!modal || !title || !form) return;
      title.textContent = 'Nuevo Usuario';
      window.currentEditingUserId = null;
      form.reset();
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };

    window.closeUserModal = function (e) {
      if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
      }
      const modal = document.getElementById('user-modal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        window.currentEditingUserId = null;
      }
    };
  });

  test('open and close modal does not navigate', () => {
    const modal = document.getElementById('user-modal');
    const originalHref = window.location.href;

    window.showNewUserModal();
    expect(modal.style.display).toBe('flex');

    const cancelBtn = modal.querySelector('button.btn-secondary');
    cancelBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(modal.style.display).toBe('none');
    expect(window.location.href).toBe(originalHref);
  });
});
