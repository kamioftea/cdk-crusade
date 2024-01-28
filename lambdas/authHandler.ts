import {APIGatewayProxyHandlerV2} from "aws-lambda/trigger/api-gateway-proxy";
import {setupXRay} from "./utils/setupXRay";
import {CognitoIdentityProviderClient} from "@aws-sdk/client-cognito-identity-provider";
import * as AWSXRay from "aws-xray-sdk";
import {handleError} from "./utils/errorResponse";
import {Route, routeEvent} from "./routes/route";
import invariant from "tiny-invariant";

import {getUserRoute} from "./routes/getUser";
import {signUpRoute} from "./routes/signUp";
import {verifyRoute} from "./routes/verify";
import {loginRoute} from "./routes/login";
import {logoutRoute} from "./routes/logout";
import {forgotPasswordRoute} from "./routes/forgotPassword";
import {resetPasswordRoute} from "./routes/resetPassword";
import {changePasswordRoute} from "./routes/changePassword";

const clientId = process.env.COGNITO_CLIENT_ID
const userPoolId = process.env.COGNITO_USER_POOL_ID
const region = process.env.COGNITO_REGION
const client = new CognitoIdentityProviderClient({region});

const routes: { [key: string]: Route<any> } = {
    getUserRoute,
    signUpRoute,
    verifyRoute,
    loginRoute,
    logoutRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    changePasswordRoute,
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    setupXRay(client);
    const segment = AWSXRay.getSegment()?.addNewSubsegment("handler");
    invariant(clientId, 'clientId provided by deployment');
    invariant(userPoolId, 'userPoolId provided by deployment');

    try {
        return routeEvent(event, routes, {client, clientId, userPoolId, segment});
    }
    catch (err) {
        return handleError(err)
    }
    finally {
        if (!segment?.isClosed()) {
            segment?.close()
        }
    }
}
