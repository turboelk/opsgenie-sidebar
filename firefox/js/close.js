(() => {
  const MAX_WAIT = 5000;
  const INTERV = 250;
  const start = Date.now();
  
  // wait until btn avail or MAX_WAIT
  // todo: possibly back off for x*tries*mult ms instead of waiting a static amount
  const timer = setInterval(() => {
    const btns = document.querySelectorAll(".alert-actions__button-group > button");
    const btn = [...btns].find(b => b.textContent.trim().toLowerCase() === "close");

    if (btn) {
      btn.click();
      console.log("[CLIENT] Button `click`", btn);
      browser.runtime.sendMessage({action:"notice", type:"success"});
      clearInterval(timer);
      return 0;
    }

    if (Date.now() - start > MAX_WAIT) {
      browser.runtime.sendMessage({action:"notice", type:"timeout"});
      clearInterval(timer);
      return 1;
    }
  }, INTERV);
})();