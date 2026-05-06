import {defaultSettings} from "./lib/shared.js";
import { Promisable, Spread } from "./lib/promisable.js";
import {h, app, text} from "./lib/hyperapp.js";
import {
    body, main, article, section, aside,
    table, thead, tbody, tfoot, tr, th, td,
    ul, li, nav, form, h1, h2, p, a, span, img, input, fieldset, label, legend, details, summary,
	progress
} from "./lib/hyperapp.html.js";

/*
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
*/
	
const settings = () => browser.storage.sync.get(defaultSettings);
const onUpdate = (state) => [
  {...state},
  [Promisable("current"), settings()],
];

const control = (type) => (name, descr="", opts={}) =>
	label({}, [
		text(descr),
		input({name, type, ...opts})
	]);
	
const Controls = {
	Submit:(name, descr="", opts={}) =>
		input({name, value:descr, type:"submit", ...opts}),
	
	...Object.fromEntries(
		["checkbox", "password", "number", "email", "text"]
			.map(type => [
				type && type.charAt(0).toUpperCase() + type.slice(1), 
				control(type)
			])
	)
};

const Submit = () => ({current, log}, event) => {
	event.preventDefault();
	
	const data = new FormData(event.target);
	current = {
		...defaultSettings,
		...current,
		...Object.fromEntries(data.entries())
	}
	
	browser.storage.sync.get(current);
	
	return {
		current,
		log: [...log, "Options saved"]
	};
};

const render = ({current, log}) =>
	form({onsubmit: Submit()}, [
		Controls.Checkbox("enabled", "Enable the extension?", {checked:current.enabled}),
		Controls.Text("base_url", "The base URL of your backend", {required: true, value:current.base_url}),
		Controls.Password("token", "Your API token", {required: true, value:current.token}),
		Controls.Email("email", "Your e-mail", {required: true, value:current.email}),
		Controls.Number("interval", "Milliseconds between updates", {required: true, min: 1000, max: 60000, value: current.timeInterval}),
		Controls.Submit("submit", "Save", {value:"Save"}),
		
		log && log.length && details({open:true}, 
			log.map(
				l => p([ text(l) ])
			)
		)
	]);

const dispatch = app({
	init: [
		{current:defaultSettings, log: []},
		[Promisable("current"), settings()]
	],
	view: render,
	node: document.getElementsByTagName("main")[0]
});

browser.storage.sync.onChanged.addListener(
    async () => {
        dispatch(onUpdate)
    }
);

browser.storage.session.onChanged.addListener(
    async (changes) => {
        dispatch(onUpdate);
    }
);