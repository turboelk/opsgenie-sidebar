import {ack} from "./lib/shared.js";

export async function mock() {
	const json = JSON.parse('{"data":[{"seen":true,"id":"38634ffa-6286-4d02-8ee1-56a2da83e837-1746989262194","tinyId":"23200","alias":"109659-124","message":"[Solarwinds] [Infra] : Serious : bma-alapp01 : Fixed Disk Space Usage Over 95% Alert","status":"open","acknowledged":false,"isSeen":true,"tags":[],"snoozed":false,"count":1,"lastOccurredAt":"2025-05-11T18:47:42.194Z","createdAt":"2025-05-11T18:47:42.194Z","updatedAt":"2025-05-11T18:48:29.186Z","source":"Solarwinds","owner":"amilcar.chacinblanco@betssongroup.com","priority":"P2","teams":[{"id":"33d0bb2c-2784-414b-8302-5063547ce31e"}],"responders":[{"type":"team","id":"33d0bb2c-2784-414b-8302-5063547ce31e"}],"integration":{"id":"4ae17e2d-93c5-45d3-9599-94cc4eae70dd","name":"LiveOPS - Solarwinds Orion","type":"Solarwinds"},"report":{"ackTime":46991,"acknowledgedBy":"amilcar.chacinblanco@betssongroup.com"},"ownerTeamId":"33d0bb2c-2784-414b-8302-5063547ce31e"},{"seen":true,"id":"efbbb812-5c6c-44e0-bf66-0af08a72819a-1746972020438","tinyId":"23186","alias":"109777-124","message":"[Solarwinds] [Infra] : Serious : bma-gi-gla-01 : Fixed Disk Space Usage Over 95% Alert","status":"open","acknowledged":true,"isSeen":true,"tags":[],"snoozed":false,"count":10,"lastOccurredAt":"2025-05-11T14:00:20.438Z","createdAt":"2025-05-11T14:00:20.438Z","updatedAt":"2025-05-11T14:01:00.173Z","source":"Solarwinds","owner":"jonathan.mizzi@betssongroup.com","priority":"P1","teams":[{"id":"33d0bb2c-2784-414b-8302-5063547ce31e"}],"responders":[{"type":"team","id":"33d0bb2c-2784-414b-8302-5063547ce31e"}],"integration":{"id":"4ae17e2d-93c5-45d3-9599-94cc4eae70dd","name":"LiveOPS - Solarwinds Orion","type":"Solarwinds"},"report":{"ackTime":39734,"acknowledgedBy":"jonathan.mizzi@betssongroup.com"},"ownerTeamId":"33d0bb2c-2784-414b-8302-5063547ce31e"},{"seen":true,"id":"a108f0a4-ed99-425d-86d3-4ffb6c8074db-1746972020414","tinyId":"23185","alias":"109778-124","message":"[Solarwinds] [Infra] : Serious : bma-gi-gla-01 : Fixed Disk Space Usage Over 95% Alert","status":"open","acknowledged":true,"isSeen":true,"tags":[],"snoozed":false,"count":1,"lastOccurredAt":"2025-05-11T14:00:20.414Z","createdAt":"2025-05-11T14:00:20.414Z","updatedAt":"2025-05-11T14:01:03.889Z","source":"Solarwinds","owner":"jonathan.mizzi@betssongroup.com","priority":"P3","teams":[{"id":"33d0bb2c-2784-414b-8302-5063547ce31e"}],"responders":[{"type":"team","id":"33d0bb2c-2784-414b-8302-5063547ce31e"}],"integration":{"id":"4ae17e2d-93c5-45d3-9599-94cc4eae70dd","name":"LiveOPS - Solarwinds Orion","type":"Solarwinds"},"report":{"ackTime":43475,"acknowledgedBy":"jonathan.mizzi@betssongroup.com"},"ownerTeamId":"33d0bb2c-2784-414b-8302-5063547ce31e"}],"paging":{"first":"https://api.eu.opsgenie.com/v2/alerts?limit=100&sort=createdAt&offset=0&order=desc&query=NOT+%28details.key%3A+%22incident-alert-type%22+and+%28details.value%3A+%22Owner%22+or+details.value%3A+%22Responder%22%29+or+%22%5BPRTG%5D%22+or+%22BDE%22+or+%22TEST%22+or+%22%5BTAPS%5D%22+or+%22DTO%22%29+and+status%3A+open","last":"https://api.eu.opsgenie.com/v2/alerts?limit=100&sort=createdAt&offset=0&order=desc&query=NOT+%28details.key%3A+%22incident-alert-type%22+and+%28details.value%3A+%22Owner%22+or+details.value%3A+%22Responder%22%29+or+%22%5BPRTG%5D%22+or+%22BDE%22+or+%22TEST%22+or+%22%5BTAPS%5D%22+or+%22DTO%22%29+and+status%3A+open"},"took":0.09,"requestId":"583baa89-d25c-4c57-b17b-d55d7bc15fa5"}');

    return {
        ok: true,
        status: 200,
        json: async () => json,
        text: async () => JSON.stringify(json)
    };
};

export async function mock_ack(settings, id, note) {
    const url = ack(settings, id);
    const body = {
        method: "POST",
        body: JSON.stringify({
            user: `${settings.username}`,
            source: `User actions`,
            note
        }),
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",

        headers: {
            "Content-Type": "application/json",
            "Authorization": `GenieKey ${settings.apiKey}`
        }
    };

    console.log("[POST][MOCK]", url, body);
};

export async function mock_ui() {
    const response = await mock();
    const json = await response.json();
    
    return {
        api: {
            error: null,
            time: new Date(),
            query: {
                took: parseFloat(json.took),
                data: json.data.map(alert => ({
                    ...alert,
                    lastOccuredAt: new Date(alert.lastOccuredAt),
                    createdAt: new Date(alert.createdAt),
                    updatedAt: new Date(alert.updatedAt)
                }))
            }
        }
    };
};
