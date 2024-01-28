import {SES, SendEmailCommand} from "@aws-sdk/client-ses";
import {setupXRay} from "./utils/setupXRay";
import * as AWSXRay from "aws-xray-sdk";
import {Handler, PostConfirmationConfirmSignUpTriggerEvent} from "aws-lambda";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

const ses = new SES();

export const handler: Handler<PostConfirmationConfirmSignUpTriggerEvent, PostConfirmationConfirmSignUpTriggerEvent> = async (event) => {
    setupXRay(ses);
    const segment = AWSXRay.getSegment()?.addNewSubsegment("handler");
    try {
        await ses.send(new SendEmailCommand(
            {
                Destination: {
                    ToAddresses: [ADMIN_EMAIL],
                },
                Message: {
                    Subject: {
                        Data: "A new user has signed up to card builder."
                    },
                    Body: {
                        Text: {
                            Data: 'User attributes:\n\n' +
                                JSON.stringify(event.request.userAttributes, null, ' ')
                        },
                        Html: {
                            Data: `<p>User attributes:</p>
                                <dl>${Object.entries(event.request.userAttributes).map(
                                ([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`
                                )}</dl>`
                        }
                    },
                },
                Source: ADMIN_EMAIL
            }
        ));

        return event;
    }
    catch (err) {
        segment?.addError(err instanceof Error ? err : String(err));
        return event;
    }
    finally {
        if (!segment?.isClosed()) {
            segment?.close()
        }
    }
};
