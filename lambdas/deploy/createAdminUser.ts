import {
    AdminAddUserToGroupCommand,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
    CognitoIdentityProviderClient, UsernameExistsException
} from "@aws-sdk/client-cognito-identity-provider";
import {setupXRay} from "../utils/setupXRay";
import * as AWSXRay from "aws-xray-sdk";

const region = process.env.COGNITO_REGION
const client = new CognitoIdentityProviderClient({region});

export const handler = async () => {
    setupXRay(client);
    const segment = AWSXRay.getSegment()?.addNewSubsegment("adminHandler");
    try {
        try {
            await client.send(
                new AdminCreateUserCommand(
                    {
                        UserPoolId: process.env.COGNITO_USER_POOL_ID,
                        Username: process.env.ADMIN_EMAIL,
                        DesiredDeliveryMediums: [],
                        UserAttributes: [
                            {Name: "email", Value: process.env.ADMIN_EMAIL},
                            {Name: "nickname", Value: 'Administrator'},
                            {Name: "email_verified", Value: 'true'}
                        ],
                    }
                )
            );
        }
        catch (err: any) {
            console.log(err);
            // If the user already exists, we can ignore the error
            if (!(err instanceof UsernameExistsException)) {
                throw err;
            }
        }

        await client.send(
            new AdminSetUserPasswordCommand(
                {
                    UserPoolId: process.env.COGNITO_USER_POOL_ID,
                    Username: process.env.ADMIN_EMAIL,
                    Password: process.env.ADMIN_PASSWORD,
                    Permanent: true
                }
            )
        );

        await client.send(
            new AdminAddUserToGroupCommand(
                {
                    UserPoolId: process.env.COGNITO_USER_POOL_ID,
                    Username: process.env.ADMIN_EMAIL,
                    GroupName: 'admin'
                }
            )
        );
    }
    finally {
        if (!segment?.isClosed()) {
            segment?.close()
        }
    }
}
