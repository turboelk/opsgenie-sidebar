let
	defaultSettings,
	url, 
	alert, 
	alerts, 
	incidents, 
	ack_url;

// Settings
(async () => {
	const shared = await import(browser.runtime.getURL("js/lib/shared.js"));
	defaultSettings    = shared.defaultSettings;
})();

const
	API = {
		Config: null,
		Request: null,
		Submit: null
	};
	
const QueryMap = {
	priority: d => d.priority?.name,
	acknowledged: d => d.status !== "triggered",
	id: d => d.id,
	tinyId: d => d.incident_number,
	count: d => d.alert_counts?.all,
	message: d => d.title,
	url: d => d.html_url
};
	
(async () => {
	const module = await import(browser.runtime.getURL("js/api.js"));
	API.Config = module.Config;
	API.Request = module.Request;
	API.Submit = module.Submit;

	API.Config.SetResponseMap(QueryMap);
})();

const reinstall = (() => {
  return async details => {
    if (details.reason === 'install') {
        await browser.runtime.openOptionsPage();
    }
  }
})();

class IO {
  static Levels = [
    (...args) => console.info(...args),
    (...args) => console.warn(...args),
    (...args) => console.error(...args),
    (...args) => console.debug(...args)
  ];
  
  static log = (level, ...args) => IO.Levels[Number(level)](...args);
  static info = (...args) => IO.Levels[0](...args);
  static warn = (...args) => IO.Levels[1](...args);
  static error = (...args) => IO.Levels[2](...args);
  static debug = (...args) => IO.Levels[3](...args);

  static group = (level, label, ...args) => {
    const g = (v, ...args) => {
      IO.Levels[Number(level)](v);
      if (args.length)
        g(...args);
    };
    
    console.group(label);
    g(...args);
    console.groupEnd();
  };
}

browser.runtime.onInstalled.addListener(reinstall);

browser.runtime.onMessage.addListener((msg, sender, respond) => {
    (async () => {
        const settings = await browser.storage.sync.get(defaultSettings);
		switch(msg.action) {
		  case "options":
			browser.runtime.openOptionsPage();
			return;
			
		  case "log-item":
			return await log_item(settings, msg.value, msg.expiry || 5);
			
		  case "log-clear-item":
			return await log_clear_item(settings, msg.id);

		  case "reload":
			  return reload(settings);

		  case "start":
			  return start(settings);
			
		  case "stop":
			return stop(settings);
			
		  case "clear":
			return clear(settings);

		  case "update":
			  return respond(
				  update(settings)
			  );
			  
		  case "merge:submit":
			const selection = msg.selection.members;
			const target = msg.selection.target;
			const payload = {
				source_incidents: [
					...Object.entries(selection).map(([id, _]) => ({
						id,
						type: "incident"
					}))
				]
			};
			
			IO.debug("Received merge submit", `/incidents/${target}/merge`, payload);
			return await put(settings, `/incidents/${target}/merge`, payload);
			  
		  case "ack":
			return await put(settings, "/incidents", { incidents: [{id: msg.id, status: "acknowledged", type: "incident"}]});
			
		  case "close":
			return await put(settings, "/incidents", { incidents: [{id: msg.id, status: "resolved", type: "incident"}]});
			
		  case "note":
			return await Promise.all([
				msg.selection.target 
					&& post(settings, `/incidents/${msg.selection.target}/notes`, {note: {content: msg.value}}),

				...Object
					.entries(msg.selection.members)
					.filter(([k, v]) => v)
					.map(
						([id, _]) =>
							post(settings, `/incidents/${id}/notes`, {note: {content: msg.value}})
					)
			]);

		  default:
			  // handle errors...
			  return null;
        }
    })();
});

browser.storage.sync.onChanged.addListener(
    async (changes) => {
      if (changes.settings && changes.settings.newValue) {
        browser.runtime.sendMessage({
          action: "reload"
        });
      }
    }
);

const stop = async (settings) => {
	const ids = await browser.storage.session.get({ intervalID: 0, heartbeatID: 0 });
  
  IO.group(3, 
    "Stopping heartbeat", 
    `intervalID=${ids.intervalID}`,
    `heartbeatID=${ids.heartbeatID}`
   );
	
	if (ids.intervalID)
		clearInterval(ids.intervalID);
	
	if (ids.heartbeatID)
		clearInterval(ids.heartbeatID);

	browser.storage.session.set({intervalID: 0, heartbeatID: 0, heartbeat: false});
};

const start = async (settings) => {
	const ids = await browser.storage.session.get({ intervalID: 0, heartbeatID: 0 });
	
	if (ids.intervalID)
		clearInterval(ids.intervalID);
	
	if (ids.heartbeatID)
		clearInterval(ids.heartbeatID);

	ids.intervalID = setInterval(
		update,
		settings.timeInterval,
		settings
	);
	
	ids.heartbeatID = setInterval(
		heartbeat,
		1000,
		settings
	);

  IO.group(3, 
    "Started heartbeat", 
    `intervalID=${ids.intervalID}`,
    `heartbeatID=${ids.heartbeatID}`
   );

  update(settings);
  browser.storage.session.set({ ...ids, heartbeat: true });
};

const reload = async (settings) => {
	update(settings);
};

const query = json => {
    const data = json.data;

    return {
        took: parseFloat(json.took),
        data: json.data.map(alert => ({
            ...alert,
            count: parseInt(alert.count),
            lastOccurredAt: new Date(alert.lastOccuredAt),
            createdAt: new Date(alert.createdAt),
            updatedAt: new Date(alert.updatedAt)
        }))
    };
};

const clear = async (settings) => {
	await browser.storage.session.set({
		log: [],
		api: {
			message: [],
			tasks: [],
			time: new Date()
		}
	});
};

const Parameters = {
	date_range: "all",
	statuses: ["acknowledged", "triggered"],
	team_ids: ["PELEXW9"]
};

// Hack!
const GetJiraTicket = (entries) => (
	entries.map(
		e => e.message?.match(/https:\/\/betssongroup\.atlassian\.net\/browse\/[A-Z]+2-\d+/)
		//m => m.message?.match(/https:\/\/betssongroup\.atlassian\.net\/browse\/[A-Z]+-\d+/)
	)
	.filter(e => e !== undefined && e !== null)[0][0]
);

const api = async (settings) => {
    const data = {
      api: {
        messages: await get(settings, "/incidents", Parameters),
		tasks: [],
        time: new Date()
      }
    };
	
	IO.debug("api", data);
	await browser.storage.session.set(data);
};

const error = (settings, message, placeholders) => {
	IO.group(2, "i18n error",
		`message=${message}`, 
		`placeholders=${JSON.stringify(placeholders)}`,
		`placeholders=${browser.i18n.getMessage(message, placeholders)}`
	);
  
	return {
		data: [{
			id: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
			ocurredAt: new Date(),
			priority: "P1",
			message: browser.i18n.getMessage(message, placeholders)
		}]
	};
};

const log_item = async (settings, value, expiry=5) => {
	const o = await browser.storage.session.get("log");	
	const date = new Date();

  IO.group(0, "Log item", `Expiry = ${expiry}`, value);
	o.log = o.log || [];
	date.setSeconds(date.getSeconds() + expiry);
	browser.storage.session.set({log: [...o.log, {
		id: crypto.randomUUID(),
		key: o.log.length,
		expiry: date,
		value
	}]});
};

const log_clear_item = async (settings, id) => {
	const o = await browser.storage.session.get("log");
	o.log = o.log || [];
	
  IO.info("Clearing log;", `${o.length} items cleared`);
	browser.storage.session.set({
		log: o.log.filter(
			item => item.id != id
		)
	});
};

const heartbeat = async (settings) => {
	IO.debug("Heartbeat");
	browser.storage.session.set({heartbeat: true, time: new Date()});
};

const mutate = (method) => 
	async (settings, endpoint, body) => {
		const url = `${settings.base_url}${endpoint}`;
		
		try {
			const response = await API.Submit(method, settings.apiKey, url, body);
			
			if (!response.ok) {
				const _body = await response.json();
				return error(settings, "clientFailure", [settings.timeInterval, _body.message]);
			}
			
			IO.debug(`${method}:Request`, response);
			return response;
		}
		
		catch(exc) {
			return error(settings, "networkFailure", [settings.timeInterval, exc]);
		}
	};

const put = mutate("PUT");
const post = mutate("POST");

const get = async (settings, endpoint, params) => {
	const url = `${settings.base_url}${endpoint}`;
	
	try {
		const response = await API.Request(settings.apiKey, url, params);
		
		if (!response.ok) {
            const body = await response.json();
            return error(settings, "clientFailure", [settings.timeInterval, body.message]);
        }
		
		IO.debug("GET:Request", response);
		return (await response).incidents;
	}
	
	catch(exc) {
		return error(settings, "networkFailure", [settings.timeInterval, exc]);
	}
};

const update = async (settings) => {
    if (!settings.enabled)
        return;
	
	IO.debug("Update", settings);
	const o = await browser.storage.session.get("log");
	const date = new Date();
	
	o.log = o.log || [];
	const filter = o.log.filter(
		item => new Date(item.expiry) > date
	);
	
	browser.storage.session.set({log: filter});
	return api(settings);
};
