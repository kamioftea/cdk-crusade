import {ConfirmForgotPasswordCommand} from "@aws-sdk/client-cognito-identity-provider";
import {parseBody, Route} from "./route";
import {Schema, z} from "zod";

interface ResetPasswordRequest {
    email: string,
    verification_code: string,
    password: string,
}

function validateResetPasswordRequest(input: any): ResetPasswordRequest {
    const schema: Schema<ResetPasswordRequest> = z.object(
        {
            email: z.string().email(),
            verification_code: z.string(),
            password: z.string().min(12),
        }
    )
    return schema.parse(input);
}

const handler: Route["handle"] =
    async (event, {client, clientId}) => {
        const {email, verification_code, password} = parseBody(event, validateResetPasswordRequest);
        await client.send(new ConfirmForgotPasswordCommand(
            {
                ClientId: clientId,
                Username: email,
                ConfirmationCode: verification_code,
                Password: password,
            }
        ));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({email: email}),
        }
    }

export const resetPasswordRoute: Route = {
    handle: handler,
    method: 'POST',
    action: 'reset-password'
}
