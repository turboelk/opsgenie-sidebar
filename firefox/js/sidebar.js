import { defaultSettings } from "./lib/shared.js";
import {h, app, text} from "./lib/hyperapp.js";
import {
    body, main, article, section, aside,
    table, thead, tbody, tfoot, tr, th, td,
    ul, li, nav, form, h1, h2, p, a, span, img, input, fieldset, label, legend, details, summary,
	progress
} from "./lib/hyperapp.html.js";
import { Promisable, Spread } from "./lib/promisable.js";
import Selection from "./Selection.js";
import Messaging from "./Messaging.js";

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
const time = () => browser.storage.session.get("time");
const elapsed = (then) => {
	const now = new Date();
	return (now - then);
};

const onUpdate = (state) => [
  {...state},
  [Promisable("log"), log()],
  [Promisable("settings"), settings()],
  [Promisable("api"), api().then(transform)],
  [Promisable("heartbeat"), heartbeat()],
  [Promisable("time"), time()]
];

const append = (key) => (state, e) => ({
	_: console.log("append", state, e.target.value),
	...state,
	[key]: e.target.value
});

const noop = (...args) => (state) => ({...state});

const onConfigChg = (key) => ({settings, ...state}, value) => (
  settings = {...settings, [key]: value},
  browser.storage.sync.set(settings),
  {
    ...state,
    settings
  }
);

const logs = ({log, selection, settings}) =>
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
									onclick: Messaging.Send("log-clear-item", null, {id: item.id}),
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

const messages = ({api, selection, note, settings}) =>
	section({class: "messages"}, [
		h2([text("Alerts" + (selection.active? ` (selected ${Selection.Count(selection)}...)`: ""))]),

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
								selection.active &&
								a({
									onclick: Selection.Add(item.id),
									class: {
										badge:true,
										action:true,
										yes:Selection.Selected(item.id, selection)
									}
								}, [
									text("SELECT")
								]),
											
								item.acknowledged &&
								a({
								  "data-tooltip": `Close #${item.tinyId}`,
								  "data-flow": "right",
								  onclick:Messaging.Send("close", `Close ${item.id}`, {id: item.id}),
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
								  onclick:Messaging.Send("ack", `Ack ${item.id}`, {id: item.id}),
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
	
const tasks = ({api, selection, settings}) =>
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
								selection.active &&
								a({
									onclick: Selection.Target(item),
									class: {
										badge:true,
										action:true,
										yes:Selection.Selected(item.id, selection),
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
									"data-tooltip": `#${item.tinyId} ${item.message}`,
									"data-flow": "top"
								}, [
									text(item.message)
								])
							])
						])
				)
		])
	]);

const controls = ({selection, note, settings}) =>
	section({class: "tasks note"}, [
		h2([text("Actions")]),
		p({class:"control"}, [
			input({
				type:"text",
				placeholder:"Bets placed ok, AR stable, no spike on error, etc.",
				class:"text",
				oninput:append("note")
			}),
			input({
				type:"button",
				value:"Note",
				class: {
					badge: true, 
					action: true, 
					mono: true, 
					yes: !note || !note.length,
					disabled: !note || !note.length
				},
				onclick:Selection.Submit(
					"note", 
					true, 
					"Note sent",
					{value: note}
				)
			}),
			input({
				type:"button",
				value:"Merge",
				class: {
					badge: true, 
					action: true, 
					mono: true, 
					yes: !selection.target,
					disabled: !selection.target
				},
				onclick:Selection.Submit("merge:submit", true, "Merge requested")
			})
		])
	]);

const error = ({api}) =>
    ul([
        li([text(api.error)])
    ]);

const render = ({time, api, log, note, heartbeat, selection, settings, ...r}) =>
    !settings && main([gt("loading")]) ||
    main([
      section({class: "controls"}, [
        section([
          api && api.time &&
          span({class: "tiny"}, [
            span([
              text(api.time.toLocaleString())
            ]),
			
			progress({max: settings.timeInterval, value:elapsed(api.time), class: {ok:(elapsed(api.time)/settings.timeInterval)<1.05}})
          ]),

		  input({type:"button", value:selection.active? "Done": "Select", onclick:Selection.Toggle()}),
          input({type:"button", value:g("options"), onclick:Messaging.Send("options", "Opened options page...")}),
          
          heartbeat === true &&
          input({type:"button", value:g("stop"), onclick:Messaging.Send("stop", "Service stopped", {}, {heartbeat: false})}),
          
          heartbeat === true ||
          input({type:"button", value:g("start"), onclick:Messaging.Send("start", "Service started", {}, {heartbeat: true})})
        ]),
      ]),

      h1([
        span([text("Pager Duty")]),
        span({class: { status: true, on:!(!heartbeat) }}, [
          text(Status[heartbeat === true])
        ])
      ]),
		
      api && !api.error && api.messages && 
      messages({api, selection, note, settings}),
	  
	  api && api.error &&
	  error({api}),
        
      log && log.length &&
      logs({log, selection, settings}),

	  selection.active &&
	  controls({note, selection, note, settings}),
        
      api && api.tasks &&
      tasks({api, selection, settings})
    ]);

const dispatch = app({
    init: [
        { time: undefined, heartbeat: false, note: "", selection: Selection.Default(), api: { messages: [], tasks: [], time: new Date() } },
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
