import Messaging from "./Messaging.js";

export default class Selection {
	static Toggle = () => ({selection, ...state}) => ({
		...state,
		selection: {
			active: !selection.active,
			members: {},
			target: null
		}
	});
	
	static Default = () => ({
		active: false,
		members: {},
		target: null
	});
	
	static Target = ({id}) => ({selection, ...state}) => (
		{...state, selection: {
			...selection,
			target: id
		}}
	);
	
	static Add = (id) => ({selection, ...state}) => ({
		...state,
		selection: {
			...selection,
			members: {
				...selection.members,
				[id]: !selection.members[id]
			}
		}
	});
	
	static Verify = (target_required, selection) => (
		target_required && !selection.target && Messaging.Log("Target incident required") ||
		!selectionCount(selection) && Messaging.Log("No selection") || true
	);
	
	static Submit = (action, target_required, log, payload={}) => ({selection, ...state}) => (
		Selection.verify(target_required, selection) &&
		Messaging.Send(
			action, 
			log, 
			{selection, ...payload},
			{selection: selectionDefault()}
		)
		|| {selection, ...state}
	);
	
	static Selected = (id, {members}) =>
		members.hasOwnProperty(id) && members[id];
		
	static Contains = ({members}) =>
		Object.values(members).some(Boolean);
		
	static Count = ({members}) =>
		Object.values(members).filter(Boolean).length;
}