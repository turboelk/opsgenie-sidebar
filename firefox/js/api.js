const Internal = {
	Accept: () => ({"Accept": "application/vnd.pagerduty+json;version=2"}),
	ContentType: () => ({"Content-Type": "application/json"}),
	Authorization: (key) => ({"Authorization": `Token token=${key}`}),
	Request: async (key, url) =>
		fetch(url, {
			cache: "no-store",
			headers: {
				...Internal.Accept(),
				...Internal.ContentType(),
				...Internal.Authorization(key)
			}
		}),
	
	Submit: async (key, method, url, body) =>
		fetch(url, {
			method: method,
			cache: "no-store",
			body: JSON.stringify(body),
			headers: {
				...Internal.Accept(),
				...Internal.ContentType(),
				...Internal.Authorization(key)
			}
		})
};
	
export const Config = {
	Query: (url, search) => {
		url = new URL(url);
		
		Object.entries(search).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				// PagerDuty expects key[]=a&key[]=b
				value.forEach(
					v => url.searchParams.append(`${key}[]`, v)
				);
			}

			else if (value !== undefined && value !== null) {
				url.searchParams.append(key, value);
			}
		});
		
		return url.toString();
	},
	
	SetResponseMap: (map) => {
		const _f = Internal.Request;

		Internal.Request = async (key, url) => {
			const response = await _f(key, url);
			
			if (!response.ok)
				return response;
			
			const json = await response.json();
			const incidents = json.incidents.map(
				e => {
					const r = {};
					Object.entries(map).forEach(([key, transform]) => {
						const value = transform(e);
						if (value !== undefined && value !== null)
							r[key] = value;
					});
					
					return r;
				}
			);

			return {ok: true, incidents};
		};
			
		return _f;
	}
};

export const Request = async (key, url, search) => 
	await Internal.Request(key, Config.Query(url, search));
export const Submit = async (method, key, url, body) =>
	await Internal.Submit(key, method, Config.Query(url, {}), body);