/**
 * Merges the provided data into the state under the specified key.
 * - Return type is dependent on typeof data[key] || data
 * - key in data? typeof data[key]: typeof data
 * - Or, in other words:
 * - If `data` is an array → shallow copy into `state[key]`.
 * - If `data` is an object with `key` → use `data[key]`.
 * - Otherwise → shallow copy `data` into `state[key]`.
 * - If `key === "_"` → return state unchanged.
 *
 * @example
 * dispatch(Spread("posts"), [{ title: "Hello" }])
 * @example
 * dispatch(Spread("config"), { config: { dark: true } })
 * @example
 * dispatch(Spread("config"), { msg: "Hello, world!" })
 *
 * @param {string} key
 * @returns {(state: object, data: object|Array) => object}
 */
const Spread = key => (state, data) => (
  "_" == key?
    state:
    ({
      ...state,
      [key]:
        Array.isArray(data)?
          [...data]:
            key in data?
              Array.isArray(data[key])?
                [...data[key]]:
                data[key]:
              Array.isArray(data)?
                [...data]:
              {...data}
    }));

/**
 * Appends or merges data into the state under the specified key.
 *
 * - A: `state[key]` is array, `data` is array → concat
 * - B: `state[key]` is array, `data` is object → append `data[key]`
 * - C: `state[key]` is object, `data` is array → overwrite
 * - D: `state[key]` is object, `data` is object → merge `data[key]`
 * - If `state[key]` doesn't exist → use `data` or `data[key]`
 *
 * @example
 * dispatch(Append("logs"), [{ msg: "Started" }])
 * @example
 * dispatch(Append("logs"), { logs: { msg: "Next" } })
 *
 * @param {string} key
 * @returns {(state: object, data: object|Array) => object}
 */
const Append = (key) => (state, data) => ({
	...state,
	[key]:
		// A: key := arr && data := arr := expand
		// B: key := arr && data := obj := append data[key]
		// C: key := obj && data := arr := overwrite
		// D: key := arr && data := obj := expand data[key]
		key in state?
			Array.isArray(state[key])?
				Array.isArray(data)?
					// A
					[...state[key], ...data]:
					// B
					[...state[key], data[key]]:
				Array.isArray(data)?
					// C
					[...data]:
					// D
					{...state[key], ...data[key]}:
			// state[key] doesn't exist
			Array.isArray(data)?
				[...data]:
				key in data?
					{...data[key]}:
					{...data}
});


/**
 * Creates an effect handler that resolves a Promise and dispatches an action.
 *
 * - If the first argument is a string, it is treated as a state key.
 * - If the first argument is a function, it is treated as the action.
 *
 * @example
 * [Promisable("posts"), fetch("/posts.json").then(r => r.json())]
 * @example
 * [Promisable("posts", Append("posts")), fetch("/posts.json").then(r => r.json())]
 * @example
 * [Promisable(Append("logs")), fetch("/log.json").then(r => r.json())]
 *
 * @param {string|Function} keyOrAction - A state key or an action function.
 * @param {Function} [action] - Optional action function if key is provided.
 * @returns {(dispatch: Function, payload: Promise<any>) => void}
 */
const Promisable = (keyOrAction, action) => {
	const isAction = typeof keyOrAction === "function";
	const resolvedAction = isAction ? keyOrAction : (action || Spread(keyOrAction));
	return (dispatch, payload) => {
		payload.then(d => dispatch(resolvedAction, d));
	};
};


export { Spread, Append, Promisable };