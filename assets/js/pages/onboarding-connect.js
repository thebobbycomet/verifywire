// Real MetaMask connect for Doma Testnet (EIP-1193)
// - Adds or switches to Doma Testnet
// - Requests accounts
// - Updates UI and enables Continue

(() => {
    const backBtn = document.getElementById("backBtn");
    const connectBtn = document.getElementById("connectBtn");
    const continueBtn = document.getElementById("continueBtn");
    const statusEl = document.getElementById("walletStatus");
    const addrWrap = document.getElementById("walletAddr");
    const addrText = document.getElementById("addrText");
  
    // Prefill bank summary
    try {
      const draft = JSON.parse(localStorage.getItem("vw_claim_draft") || "{}");
      if (draft.legalName || draft.shortCode) {
        const bankSummary = document.getElementById("bankSummary");
        document.getElementById("bankName").textContent =
          draft.brandName || draft.legalName || "Your bank";
        document.getElementById("bankCode").textContent = draft.shortCode || "—";
        bankSummary.hidden = false;
      }
    } catch { /* ignore */ }
  
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
  
    function render() {
      const s = getLocal();
      if (!hasMM) {
        statusEl.textContent = "Status: MetaMask not detected";
        addrWrap.hidden = true;
        connectBtn.textContent = "Get MetaMask";
        continueBtn.disabled = true;
        return;
      }
      if (s.connected && s.addr) {
        statusEl.textContent = "Status: Connected";
        addrText.textContent = s.addr;
        addrWrap.hidden = false;
        connectBtn.textContent = "Disconnect (local)";
        continueBtn.disabled = false;
      } else {
        statusEl.textContent = "Status: Not connected";
        addrWrap.hidden = true;
        connectBtn.textContent = "Connect wallet";
        continueBtn.disabled = true;
      }
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
        render();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Failed to connect wallet.");
      }
    }
  
    function localDisconnect() {
      // You can’t programmatically disconnect MetaMask; we clear local state.
      setLocal("");
      render();
    }
  
    // Events
    backBtn.addEventListener("click", () => (window.location.href = "./claim.html"));
    connectBtn.addEventListener("click", () => {
      const s = getLocal();
      if (!hasMM) return connect();
      if (s.connected) return localDisconnect();
      connect();
    });
    continueBtn.addEventListener("click", () => {
      if (!getLocal().connected) return;
      window.location.href = "./add-rails.html";
    });
  
    // React to wallet changes
    if (hasMM) {
      ethereum.on?.("accountsChanged", (accs) => {
        const addr = accs && accs[0] ? accs[0] : "";
        setLocal(addr);
        render();
      });
      ethereum.on?.("chainChanged", async (cid) => {
        // If user switched away, try to switch back silently
        if (cid?.toLowerCase() !== DOMA_PARAMS.chainId) {
          try { await ensureDoma(); } catch {}
        }
        render();
      });
    }
  
    // Init
    render();
  })();
  