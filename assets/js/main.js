// Minimal shared behaviors for VerifyWire pages.
// - Updates the onboarding progress bar based on data attributes.
// - Handles wallet connection status across all pages

(() => {
    // Doma Testnet params (from docs)
    const DOMA_PARAMS = {
      chainId: "0x17cc4", // 97476
      chainName: "Doma Testnet",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://rpc-testnet.doma.xyz"],
      blockExplorerUrls: ["https://explorer-testnet.doma.xyz"]
    };

    const hasMM = typeof window.ethereum !== "undefined";

    function setLocal(addr) {
      if (addr) {
        localStorage.setItem("vw_wallet_connected", "1");
        localStorage.setItem("vw_wallet_addr", addr);
      } else {
        localStorage.removeItem("vw_wallet_connected");
        localStorage.removeItem("vw_wallet_addr");
      }
    }

    function getLocal() {
      return {
        connected: localStorage.getItem("vw_wallet_connected") === "1",
        addr: localStorage.getItem("vw_wallet_addr") || ""
      };
    }

    function formatAddress(addr) {
      if (!addr || addr.length < 10) return addr;
      return addr.slice(0, 6) + "..." + addr.slice(-4);
    }

    async function ensureDoma() {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: DOMA_PARAMS.chainId }]
        });
        return true;
      } catch (e) {
        // 4902 = chain not added
        if (e && (e.code === 4902 || String(e.message || "").includes("Unrecognized chain ID"))) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [DOMA_PARAMS]
          });
          return true;
        }
        throw e;
      }
    }

    async function connect() {
      if (!hasMM) {
        window.open("https://metamask.io/download/", "_blank", "noopener");
        return;
      }
      try {
        await ensureDoma();
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        const addr = accounts && accounts[0] ? accounts[0] : "";
        setLocal(addr);
        renderWalletStatus();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Failed to connect wallet.");
      }
    }

    function disconnect() {
      setLocal("");
      renderWalletStatus();
    }

    function renderWalletStatus() {
      const walletStatusEl = document.getElementById('wallet-status');
      if (!walletStatusEl) return;

      const s = getLocal();
      const isDashboardPage = window.location.pathname.includes('dashboard.html');

      if (s.connected && s.addr) {
        // Connected state
        const viewDashboardButton = isDashboardPage ? '' : `<button class="btn clear" onclick="window.location.href='/dashboard.html'">View Dashboard</button>`;
        walletStatusEl.innerHTML = `
          <div class="wallet-connected">
            ${viewDashboardButton}
            <span>Connected Wallet: <span class="wallet-address">${formatAddress(s.addr)}</span></span>
            <button class="wallet-disconnect" onclick="disconnectWallet()">Disconnect</button>
          </div>
        `;
      } else {
        // Not connected state
        walletStatusEl.innerHTML = `
          <button id="connectWalletBtn" class="btn primary" onclick="connectWallet()">Connect Wallet</button>
        `;
      }
    }

    // Make functions globally available
    window.connectWallet = connect;
    window.disconnectWallet = disconnect;

    document.addEventListener('DOMContentLoaded', () => {
      // Handle onboarding progress bar
      const prog = document.getElementById('vw-progress');
      if (prog) {
        const step = parseInt(prog.dataset.step || '0', 10);
        const total = parseInt(prog.dataset.total || '1', 10);

        const fill = prog.querySelector('.progress-fill');
        const label = prog.querySelector('span');

        const pct = Math.max(0, Math.min(100, (step / total) * 100));

        if (fill) fill.style.width = pct + '%';
        if (label) label.textContent = `Step ${step} of ${total}`;

        // Basic ARIA for accessibility
        prog.setAttribute('role', 'progressbar');
        prog.setAttribute('aria-valuenow', String(step));
        prog.setAttribute('aria-valuemin', '0');
        prog.setAttribute('aria-valuemax', String(total));
      }

      // Initialize wallet status
      renderWalletStatus();

      // React to wallet changes
      if (hasMM) {
        ethereum.on?.("accountsChanged", (accs) => {
          const addr = accs && accs[0] ? accs[0] : "";
          setLocal(addr);
          renderWalletStatus();
        });
        ethereum.on?.("chainChanged", async (cid) => {
          // If user switched away, try to switch back silently
          if (cid?.toLowerCase() !== DOMA_PARAMS.chainId) {
            try { await ensureDoma(); } catch {}
          }
          renderWalletStatus();
        });
      }
    });
  })();
  