import {defaultSettings} from "./lib/shared.js";

document.querySelector("title").textContent = browser.i18n.getMessage("optionsTitle");
document.querySelector("label[for=enabled]").textContent = browser.i18n.getMessage("optionsEnabled");
document.querySelector("label[for=token]").textContent = browser.i18n.getMessage("optionsApiKey");
document.querySelector("label[for=time-interval]").textContent = browser.i18n.getMessage("optionsTimeInterval");
document.querySelector("button").textContent = browser.i18n.getMessage("optionsButtonSave");
// TODO: Localise
document.querySelector("label[for=email]").textContent = "User e-mail address"

const helpApiKey = document.createElement("a");
helpApiKey.setAttribute("href", "https://developer.pagerduty.com/");
helpApiKey.setAttribute("target", "_blank");
helpApiKey.textContent = browser.i18n.getMessage("optionsApiKeyHelp");
document.querySelector("label[for=token]").appendChild(helpApiKey);

document.addEventListener("DOMContentLoaded", async () => {
    const settings = await browser.storage.sync.get(defaultSettings);

    document.getElementById("enabled").checked = settings.enabled;
    document.getElementById("region").value = settings.base_url;
    document.getElementById("token").value = settings.apiKey;
	document.getElementById("email").value = settings.email;
    document.getElementById("time-interval").value = parseInt(settings.timeInterval);
});

document
	.querySelector("form")
	.addEventListener("submit", async e => {
		e.preventDefault();

		const t = document.getElementById("error");
		t.value = "";

		await browser.storage.sync.set({
			enabled: document.getElementById("enabled").checked,
			apiKey: document.getElementById("token").value,
			email: document.getElementById("email").value,
			base_url: document.getElementById("region").value,
			timeInterval: parseInt(document.getElementById("time-interval").value)
		});

		t.textContent = browser.i18n.getMessage("optionsSaved");
	});
