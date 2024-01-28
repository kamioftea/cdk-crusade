import {ConfirmSignUpCommand,} from "@aws-sdk/client-cognito-identity-provider";
import {parseBody, Route} from "./route";
import {Schema, z} from "zod";

interface VerificationRequest {
    email: string,
    verification_code: string
}

function validateVerificationRequest(input: any): VerificationRequest {
    const schema: Schema<VerificationRequest> = z.object(
        {
            email: z.string().email(),
            verification_code: z.string(),
        }
    ).strict();

    return schema.parse(input);
}

const handler: Route["handle"] =
    async (event, {client, clientId}) => {
        const {email, verification_code} = parseBody(event, validateVerificationRequest);

        await client.send(new ConfirmSignUpCommand(
            {
                ClientId: clientId,
                Username: email,
                ConfirmationCode: verification_code,
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

export const verifyRoute: Route = {
    handle: handler,
    method: 'POST',
    action: 'verify'
}
