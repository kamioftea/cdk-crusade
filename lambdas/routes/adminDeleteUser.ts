import {AdminDeleteUserCommand} from "@aws-sdk/client-cognito-identity-provider";
import {Route} from "./route";
import {assertUserGroup} from "../utils/tokenUtils";
import {ErrorResponse} from "../utils/errorResponse";

const handler: Route["handle"] =
    async (event, {client, userPoolId}) => {
        await assertUserGroup(event, 'admin');

        const email = event.pathParameters?.email;
        if(!email) {
            throw new ErrorResponse(400, 'email required')
        }

        const res = await client.send(
            new AdminDeleteUserCommand({Username: email, UserPoolId: userPoolId})
        );

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(res)
        }
    }

export const adminDeleteUserRoute: Route = {
    handle: handler,
    method: "DELETE",
    action: "user",
}
