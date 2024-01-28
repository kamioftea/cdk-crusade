import {SignUpCommand,} from "@aws-sdk/client-cognito-identity-provider";
import {parseBody, Route} from "./route";
import {Schema, z} from "zod";

interface SignUpRequest {
    name: string,
    email: string,
    password: string
}

function validateSignUpRequest(input: any): SignUpRequest {
    const schema: Schema<SignUpRequest> = z.object(
        {
            name: z.string(),
            email: z.string().email(),
            password: z.string().min(12, 'Password must be at least 12 characters')
        }
    ).strict();

    return schema.parse(input);
}

const handler: Route["handle"] =
    async (event, {client, clientId}) => {
        const {email, name, password} = parseBody(event, validateSignUpRequest);

        await client.send(
            new SignUpCommand(
                {
                    ClientId: clientId,
                    Username: email,
                    Password: password,
                    UserAttributes: [
                        {Name: "email", Value: email},
                        {Name: "nickname", Value: name},
                    ],
                }
            )
        );

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
                {
                    email: email,
                    name: name
                }
            ),
        }
    }

export const signUpRoute: Route = {
    handle: handler,
    method: 'POST',
    action: 'sign-up'
}
