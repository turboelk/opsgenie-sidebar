export default class Messaging {
	static Log = (msg, expiry=7.5) =>
		browser.runtime.sendMessage({ action: "log-item", value: msg, expiry});
		
	static Send = (key, log, payload={}, extra={}) => (state) => (
		browser.runtime.sendMessage({ action: key, ...payload }),
		log && Messaging.Log(log),
		{...state, ...extra}
	);
}