import {ForgotPasswordCommand} from "@aws-sdk/client-cognito-identity-provider";
import {parseBody, Route} from "./route";
import {Schema, z} from "zod";

interface ForgotPasswordRequest {
    email: string
}

function validateForgotPasswordRequest(input: any): ForgotPasswordRequest {
    const schema: Schema<ForgotPasswordRequest> = z.object(
        {
            email: z.string().email(),
        }
    )
    return schema.parse(input);
}

const handler: Route["handle"] =
    async (event, {client, clientId}) => {
        const {email} = parseBody(event, validateForgotPasswordRequest);

        await client.send(
            new ForgotPasswordCommand(
                {
                    ClientId: clientId,
                    Username: email,
                }
            )
        );

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({email: email}),
        }
    }

export const forgotPasswordRoute: Route = {
    handle: handler,
    method: 'POST',
    action: 'forgot-password'
}
