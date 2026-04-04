import { defaultSettings } from "./lib/shared.js";
import {h, app, text} from "./lib/hyperapp.js";
import {
    body, main, article, section, aside,
    table, thead, tbody, tfoot, tr, th, td,
    ul, li, nav, form, h1, h2, p, a, span, img, input, fieldset, label, legend, details, summary
} from "./lib/hyperapp.html.js";
import { Promisable, Spread } from "./lib/promisable.js";

const Priority = {
    P1: 1,
    P2: 2,
    P3: 3,
    P4: 4,
    P5: 5,
	ALERT: 0
};

const Highlights = {
    2: "red",
    1: "yellow",
    0: "green"
};

const Status = {
	true: "RUNNING",
	false: "STOPPED"
}

const g = (m) => browser.i18n.getMessage(m);
const gt = (m) => text(g(m));

const api = () => browser.storage.session.get("api");
const transform = ({ api }) =>
	api.messages &&
	api.messages.reduce(
		(acc, item) => {
			const p = Priority[item.priority] > 0? "tasks": "messages";
			return {
				...acc,
				[p]: [
					...acc[p],
					item
				]
			};
		}, { messages: [], tasks: [], time: api.time }
	) || { messages: [], tasks: [], time: api.time };

const heartbeat = () => browser.storage.session.get("heartbeat");
const settings = () => browser.storage.sync.get(defaultSettings);
const log = () => browser.storage.session.get("log");

const description = (message) => message;

const onUpdate = (state) => [
  {...state},
  [Promisable("log"), log()],
  [Promisable("settings"), settings()],
  [Promisable("api"), api().then(transform)],
  [Promisable("heartbeat"), heartbeat()]
];

const append = (key) => (state, e) => ({
	_: console.log("append", state, e.target.value),
	...state,
	[key]: e.target.value
});

const log_message = (msg, expiry=7.5) =>
	browser.runtime.sendMessage({ action: "log-item", value: msg, expiry});

const log_clear_item = (id) => (state, event) => (
	event.preventDefault(),
	browser.runtime.sendMessage({ action: "log-clear-item", id }),
	{...state}
);

const onOptions = (state) => (
  browser.runtime.sendMessage({ action: "options" }),
  log_message("Opened options page"),
  {...state}
);

const start = () => (state) => (
  browser.runtime.sendMessage({ action: "start" }),
	log_message("Service started"),
  {...state, heartbeat:true}
);

const stop = () => (state) => (
	browser.runtime.sendMessage({ action: "stop" }),
	log_message("Service stopped"),
	{...state, heartbeat:false}
);

const sendMessage = (key, log, payload={}, extra={}) => (state) => (
	browser.runtime.sendMessage({ action: key, ...payload }),
	log_message(log),
	{...state, ...extra}
);

const mergeSubmit = ({id, tinyId}) => {
	return (({merge, ...state}) => {
		if (!mergeSelectionCount(merge)) {
			log_message("Select an alert to submit.");
			return {...state, merge};
		}
		
		merge.target = id;
		browser.runtime.sendMessage({ action: "merge:submit", merge });
		log_message(`Sent merge request; ${mergeSelectionCount(merge)} to #${tinyId}`);
		return {...state, merge: mergeDefault()};
	});
};

const mergeToggle = () => ({merge, ...state}) => ({
	...state,
	merge: {
		active: !merge.active,
		selection: {},
		target: null
	}
});

const mergeDefault = () => ({
	active: false,
	selection: {},
	target: null
});

const mergeAdd = (id) => ({merge, ...state}) => {
	const selected = merge.selection[id];
	
	return {
		...state,
		merge: {
			...merge,
			selection: {
				...merge.selection,
				[id]: !selected
			}
		}
	};
};

const mergeSelected = (id, {selection}) =>
	selection.hasOwnProperty(id) && selection[id];
	
const mergeHasSelection = ({selection}) =>
	Object.values(selection).some(Boolean);
	
const mergeSelectionCount = ({selection}) =>
	Object.values(selection).filter(Boolean).length;

const noop = (...args) => (state) => ({...state});

const onConfigChg = (key) => ({settings, ...state}, value) => (
  settings = {...settings, [key]: value},
  browser.storage.sync.set(settings),
  {
    ...state,
    settings
  }
);

const event = fn => (state, e) => [fn, e.target.value];

const logs = ({log, merge, settings}) =>
	section({class: "log"}, [
		log && log.length && 
		h2([text("Log")]),
		
		log && log.length && 
		ul([
			...log
				.sort((a, b) => a.expiry > b.expiry)
				.map(
					item =>
						li({class: "message"}, [
							p({}, [
								span({class: {badge: true}}, [
									text(item.key)
								]),
								
								a({
									class: {text: true},
									onclick: log_clear_item(item.id),
									target: "_blank",
									"data-tooltip": "Clear log item",
									"data-flow": "top"
								}, [
									text(item.value)
								])
							])
						])
				)
		])
	]);

const messages = ({api, merge, note, settings}) =>
	section({class: "messages"}, [
		h2([text("Alerts" + (merge.active? `(merging ${mergeSelectionCount(merge)}...)`: ""))]),

		!api.messages.length &&
		ul([
			li({class: "message"}, [
				p({}, [
					gt("noData")
				])
			]),
		]),
		
		api.messages.length &&
		ul([
			...api.messages
				.map(
					item =>
						li({class: "message"}, [
							p({}, [
								merge.active &&
								a({
									onclick: mergeAdd(item.id),
									class: {
										badge:true,
										action:true,
										yes:mergeSelected(item.id, merge)
									}
								}, [
									text("SELECT")
								]),
								
								!merge.active &&
								a({
								  onclick:note.length?
									sendMessage("note", `Add note to ${item.id}`, {id: item.id, value: note}, {note:""}):
									noop,
								  class: {
									badge:true, 
									action: true, 
									mono: true, 
									yes: !note.length,
									disabled:!note.length
								  }
								}, [
								  text("NOTE")
								]),
											
								item.acknowledged &&
								a({
								  "data-tooltip": `Close #${item.tinyId}`,
								  "data-flow": "right",
								  onclick:sendMessage("close", `Close ${item.id}`, {id: item.id}),
								  class: {
									badge:true, 
									action: true, 
									mono: true, 
									yes: item.acknowledged
								  }
								}, [
								  text("CLO")
								]),
								
								item.acknowledged ||
								a({
								  "data-tooltip": `Ack #${item.tinyId}`,
								  "data-flow": "right",
								  onclick:sendMessage("ack", `Ack ${item.id}`, {id: item.id}),
								  class: {
									badge:true, 
									red:true, 
									action: true, 
									mono: true, 
									yes: item.acknowledged
								  }
								}, [
								  text("ACK")
								]),

								a({
									class: "text",
									href: item.url,
									target: "_blank",
									"data-tooltip": `[${item.tiny || item.id}] ${item.message}`,
									"data-flow": "bottom"
								}, [
									text(item.message)
								])
							])
						])
				)
		])
    ]);
	
const tasks = ({api, merge, settings}) =>
	section({class: "tasks"}, [
		h2([text("Incidents")]),
		ul([
			!api.tasks.length &&
			li({class: "task"}, [
				p({}, [
					gt("noData")
				])
			]),
		
			...api.tasks
				.sort((l, r) => Priority[l.priority] > Priority[r.priority])
				.map(
					item =>
						li({class: "message"}, [
							p({}, [
								merge.active &&
								a({
									onclick: mergeSubmit(item),
									class: {
										badge:true,
										action:true,
										yes:mergeSelected(item.id, merge),
									}
								}, [
									text("Target")
								]),
							
								span({class:{badge:true, yes: true}}, [
									text("#"), text(item.tinyId)
								]),
								span({class:{badge: true, mono: true, [Highlights[Priority[item.priority]]]: true}}, [
									text(item.priority)
								]),
								a({
									class: "text", 
									href: item.url, 
									target: "_blank",
									"data-tooltip": `#${item.tinyId} ${description(item.message)}`,
									"data-flow": "top"
								}, [
									text(item.message)
								])
							])
						])
				)
		])
	]);

const error = ({api}) =>
    ul([
        li([text(api.error)])
    ]);

const render = ({api, log, heartbeat, note, merge, settings, ...r}) =>
    !settings && main([gt("loading")]) ||
    main([
      section({class: "controls"}, [
        section([
          api && api.time &&
          span({class: "tiny"}, [
            span([
              text(api.time.toLocaleString())
            ])
          ]),

		  input({type:"button", value:merge.active? "Done": "Merge", onclick:mergeToggle()}),
          input({type:"button", value:g("options"), onclick:sendMessage("options", "Opened options page...")}),
          
          heartbeat === true &&
          input({type:"button", value:g("stop"), onclick:sendMessage("stop", "Service stopped", {}, {heartbeat: false})}),
          
          heartbeat === true ||
          input({type:"button", value:g("start"), onclick:sendMessage("start", "Service started", {}, {heartbeat: true})})
        ]),
      ]),

      h1([
        span([text("Pager Duty")]),
        span({class: { status: true, on:!(!heartbeat) }}, [
          text(Status[heartbeat === true])
        ])
      ]),
		
      api && api.messages && 
      messages({api, merge, note, settings}),
        
      log && log.length &&
      logs({log, merge, settings}),

	  input({
		  type:"text",
		  oninput:append("note"),
		  placeholder:"Bets placed ok, AR stable, no spike on error"
	  }),
        
      api && api.tasks &&
      tasks({api, merge, settings})
    ]);

const dispatch = app({
    init: [
        { heartbeat: false, note: "", merge: mergeDefault(), api: { messages: [], tasks: [], time: new Date() } },
        [Promisable("log"), log()],
        [Promisable("settings"), settings()],
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
