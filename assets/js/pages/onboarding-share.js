// Step 5: Show publish receipt; provide copy/download; graceful fallback if missing
(() => {
    const rjson = localStorage.getItem("vw_publish_receipt");
    let receipt = null;
    try { receipt = JSON.parse(rjson || "null"); } catch {}
  
    const bankName = document.getElementById("bankName");
    const bankCode = document.getElementById("bankCode");
    const schemaId = document.getElementById("schemaId");
    const hashHex  = document.getElementById("hashHex");
    const sigVal   = document.getElementById("sigVal");
    const signer   = document.getElementById("signer");
    const signedMsg= document.getElementById("signedMsg");
    const payloadPreview = document.getElementById("payloadPreview");
  
    const copyHashBtn = document.getElementById("copyHashBtn");
    const copySigBtn  = document.getElementById("copySigBtn");
    const downloadReceiptBtn = document.getElementById("downloadReceiptBtn");
    const downloadJsonBtn    = document.getElementById("downloadJsonBtn");
    const txLink = document.getElementById("txLink");

    // Handle transaction link
    const txHash = localStorage.getItem("vw_publish_tx");
    if (txHash && txLink) {
      txLink.href = `https://explorer-testnet.doma.xyz/tx/${txHash}`;
      txLink.textContent = "View on Doma Explorer";
    } else if (txLink) {
      txLink.textContent = "No transaction found";
      txLink.style.opacity = "0.5";
      txLink.style.pointerEvents = "none";
    }

    if (!receipt) {
      // Fallback UI if user lands here directly
      bankName.textContent = "—";
      bankCode.textContent = "—";
      schemaId.textContent = "vwire-rails-v1";
      hashHex.textContent  = "—";
      sigVal.textContent   = "—";
      signer.textContent   = "—";
      signedMsg.textContent= "No receipt found. Please go back and sign.";
      payloadPreview.textContent = "No payload available.";
      alert("No publish receipt found. Please go back to Review & sign.");
      return;
    }
  
    // Populate
    bankName.textContent = receipt?.payload?.organization?.brandName ||
                           receipt?.payload?.organization?.legalName || "—";
    bankCode.textContent = receipt?.orgShortCode || "—";
    schemaId.textContent = receipt?.schema || "vwire-rails-v1";
    hashHex.textContent  = receipt?.hash || "—";
    sigVal.textContent   = receipt?.signature || "—";
    signer.textContent   = receipt?.signer || "—";
    signedMsg.textContent= receipt?.signedMessage || "";
  
    // Show canonical JSON we actually signed
    try {
      payloadPreview.textContent = JSON.stringify(receipt.payload, null, 2);
    } catch {
      payloadPreview.textContent = "Unable to display payload.";
    }
  
    // Copy helpers
    const copy = (t) => navigator.clipboard?.writeText(t).catch(()=>{});
    copyHashBtn.addEventListener("click", () => copy(hashHex.textContent));
    copySigBtn.addEventListener("click", () => copy(sigVal.textContent));
  
    // Downloads
    downloadReceiptBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `${receipt.orgShortCode || "verifywire"}-receipt.json`
      });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
  
    downloadJsonBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(receipt.payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `${receipt.orgShortCode || "rails"}-v1.json`
      });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
  })();
  