import {ChangePasswordCommand} from "@aws-sdk/client-cognito-identity-provider";
import {getAccessToken} from "../utils/tokenUtils";
import {parseBody, Route} from "./route";
import {Schema, z} from "zod";

interface ChangePasswordRequest {
    previousPassword: string,
    proposedPassword: string,
}

function validateChangePasswordRequest(input: any): ChangePasswordRequest {
    const schema: Schema<ChangePasswordRequest> = z.object(
        {
            previousPassword: z.string().min(12),
            proposedPassword: z.string().min(12),
        }
    )
    return schema.parse(input);
}

const handler: Route["handle"] =
    async (event, {client}) => {
        const {previousPassword, proposedPassword} = parseBody(event, validateChangePasswordRequest);

        await client.send(new ChangePasswordCommand(
            {
                AccessToken: getAccessToken(event),
                PreviousPassword: previousPassword,
                ProposedPassword: proposedPassword,
            }
        ));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(""),
        }

    }

export const changePasswordRoute: Route = {
    handle: handler,
    method: 'POST',
    action: 'change-password'
}
