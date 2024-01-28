import {Route} from "./route";
import {RevokeTokenCommand} from "@aws-sdk/client-cognito-identity-provider";
import {getAccessToken} from "../utils/tokenUtils";
import {COOKIE_PATH} from "../utils/tokenUtils";

export const handler: Route["handle"] =
    async (event, {client, clientId}) => {
        const maybeToken = getAccessToken(event, false);
        if (maybeToken) {
            await client.send(new RevokeTokenCommand({Token: maybeToken, ClientId: clientId}));
        }

        return {
            statusCode: 200,
            cookies: [`auth=; HttpOnly; Path=${COOKIE_PATH}; Max-Age=0; SameSite=Strict`],
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(""),
        }
    }

export const logoutRoute: Route = {
    handle: handler,
    method: 'POST',
    action: 'logout'
}
