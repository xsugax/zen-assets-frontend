/* Account history + statement export (Phase 2 proof stack) */
const AccountHistory = (() => {
  'use strict';

  let _wired = false;

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function _fmtMoney(n) {
    const x = parseFloat(n);
    if (isNaN(x)) return '$0.00';
    return '$' + x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _apiBase() {
    const host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4000/api';
    return 'https://zen-assets-backend.onrender.com/api';
  }

  function _authHeaders() {
    const token = sessionStorage.getItem('zen_token') || localStorage.getItem('zen_token');
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  async function downloadStatement(format) {
    const fmt = format === 'html' ? 'html' : 'csv';
    const url = `${_apiBase()}/wallet/statement?format=${fmt}`;
    const res = await fetch(url, { headers: _authHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Export failed');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fmt === 'html' ? 'zen-statement.html' : 'zen-statement.csv';
    if (fmt === 'html') {
      window.open(a.href, '_blank', 'noopener');
    } else {
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function _renderAttribution(container) {
    if (!container || typeof InvestmentReturns === 'undefined') return;
    const snap = InvestmentReturns.getSnapshot();
    const L = typeof ZenCopy !== 'undefined' ? ZenCopy.ledger : {};
    container.innerHTML = `
      <div class="ledger-attribution">
        <div class="ledger-att-title">${_esc(L.attributionTitle || 'Earnings attribution (session)')}</div>
        <div class="ledger-att-row"><span>${_esc(L.poolInterest || 'Interest pool')}</span><strong>${_fmtMoney(snap.unclaimedInterest)}</strong></div>
        <div class="ledger-att-row"><span>${_esc(L.poolTrading || 'Trading pool')}</span><strong>${_fmtMoney(snap.unclaimedTrading)}</strong></div>
        <div class="ledger-att-row"><span>${_esc(L.poolDaily || 'Daily pool')}</span><strong>${_fmtMoney(snap.unclaimedDaily)}</strong></div>
        <div class="ledger-att-row"><span>${_esc(L.poolWeekly || 'Weekly pool')}</span><strong>${_fmtMoney(snap.unclaimedWeekly)}</strong></div>
        <p class="ledger-att-note">Session pools — claim transfers to wallet (live balance).</p>
      </div>`;
  }

  async function refresh() {
    const tbody = document.getElementById('account-history-tbody');
    const status = document.getElementById('account-history-status');
    const walletEl = document.getElementById('account-history-wallet');
    if (!tbody || typeof UserAuth === 'undefined') return;

    const L = typeof ZenCopy !== 'undefined' ? ZenCopy.ledger : {};
    tbody.innerHTML = `<tr><td colspan="6">${_esc('Loading…')}</td></tr>`;

    const [txRes, walletRes] = await Promise.all([
      UserAuth.getTransactions({ limit: 50 }),
      UserAuth.getWallet().catch(() => ({ ok: false })),
    ]);

    const walletBal = walletRes.ok ? parseFloat(walletRes.balance) : null;
    if (walletEl && walletBal != null) {
      walletEl.textContent = _fmtMoney(walletBal);
    }

    const txs = txRes.transactions || [];
    if (!txs.length) {
      tbody.innerHTML = `<tr><td colspan="6">${_esc(L.empty || 'No transactions yet')}</td></tr>`;
    } else {
      tbody.innerHTML = txs.map(tx => {
        const amt = parseFloat(tx.amount);
        const cls = amt >= 0 ? 'feel-up' : 'feel-down';
        return `<tr>
          <td>${_esc(tx.created_at ? new Date(tx.created_at).toLocaleString() : '—')}</td>
          <td>${_esc(tx.type)}</td>
          <td>${_esc(tx.status)}</td>
          <td class="${cls}">${_fmtMoney(amt)}</td>
          <td>${_fmtMoney(tx.balance_after)}</td>
          <td>${_esc(tx.notes || tx.method || '')}</td>
        </tr>`;
      }).join('');
    }

    if (status && walletBal != null && txs.length) {
      const last = txs.find(t => t.balance_after != null);
      const lastBal = last ? parseFloat(last.balance_after) : null;
      const ok = lastBal == null || Math.abs(lastBal - walletBal) < 0.02;
      status.textContent = ok
        ? (L.reconcileOk || 'Ledger matches wallet balance')
        : (L.reconcileWarn || 'Refresh to reconcile with wallet');
      status.className = 'ledger-reconcile ' + (ok ? 'ok' : 'warn');
    }

    _renderAttribution(document.getElementById('account-history-attribution'));
  }

  function wire() {
    if (_wired) return;
    _wired = true;
    const refreshBtn = document.getElementById('account-history-refresh');
    const csvBtn = document.getElementById('account-history-export-csv');
    const pdfBtn = document.getElementById('account-history-export-pdf');
    if (refreshBtn) refreshBtn.addEventListener('click', () => refresh().catch(() => {}));
    if (csvBtn) {
      csvBtn.addEventListener('click', async () => {
        try {
          await downloadStatement('csv');
          if (typeof App !== 'undefined' && App.showToast) App.showToast('Statement CSV downloaded', 'success');
        } catch (e) {
          if (typeof App !== 'undefined' && App.showToast) App.showToast(e.message, 'error');
        }
      });
    }
    if (pdfBtn) {
      pdfBtn.addEventListener('click', async () => {
        try {
          await downloadStatement('html');
          if (typeof App !== 'undefined' && App.showToast) App.showToast('Open statement and use Print → Save as PDF', 'info');
        } catch (e) {
          if (typeof App !== 'undefined' && App.showToast) App.showToast(e.message, 'error');
        }
      });
    }
  }

  return { wire, refresh, downloadStatement };
})();
