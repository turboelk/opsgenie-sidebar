const csrf = {
  csrf: undefined,
  tab: undefined,
  set({tab, value}) {
    this.csrf = value;
    this.tab = tab;
  },
  get() {
    console.log("csrf.get", this, this.csrf);
    return {csrf: this.csrf, tab: this.tab};
  }
};

const parseSetCookies = (cs) =>
	parseCookies(
		cs.split(/\r?\n/)
	);

function parseCookies([c, ...r], col={}) {
	c = c
		.split(";")
		.reduce((acc, pair) => {
			const [k, v] = pair.split("=");
			const d = decodeURIComponent(v);
			
			if (d !== "" && d !== '""')
				acc[k] = d;

			return acc;
		}, col);

	if (r.length)
		return parseCookies([...r], col);
	return col;
}

/*
  install()
  -> addListener(interceptCookies)
  -> load tab
  -> interceptCookies()
    -> csrf.set()
    
  csrf now available from getCSRF
*/

const interceptCookies =
	details => {
		const setCookies = details.responseHeaders.filter(
			h => h.name.toLowerCase() === "set-cookie"
		);

		for (const h of setCookies) {
			if (h.value.includes("csrf-token")) {
        const cookies = parseSetCookies(h.value);
        const tab = details.tabId;
        const token = cookies["csrf-token"];
        
				console.group("[Bootstrap] CSRF cookie intercepted");
				console.log("tab", tab);
        console.log("URL", details.url);
        console.log("CSRF", token);
				console.groupEnd();
        
        csrf.set({tab, csrf: token});
			}
		}
	};

export const getCSRF = async () => csrf.get().csrf;
    
export const install = (() => {
  let tab;
  
  // we'll keep it here to allow the client code to choose when to install
  // set it up only once, please
  browser.webRequest.onHeadersReceived.addListener(
    interceptCookies, {
      urls: ["https://betssongroup.app.eu.opsgenie.com/*"]
    }, 
    ["responseHeaders"]
  );
  
  return async () => {
    if (tab !== undefined)
      await browser.tabs.remove(tab);
    
    tab = await browser.tabs.create({
      url: "https://betssongroup.app.eu.opsgenie.com/alert/list",
      active: false
    });
    
    if (browser.tab.hide)
      browser.tab.hide(tab);
  };
})();