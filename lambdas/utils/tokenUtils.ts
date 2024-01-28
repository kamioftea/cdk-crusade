import {parse} from "cookie";
import {ErrorResponse} from "./errorResponse";
import {APIGatewayProxyEventV2} from "aws-lambda";
import {CognitoJwtVerifier} from "aws-jwt-verify"

export function getAccessToken({cookies}: APIGatewayProxyEventV2, required = true) {
    console.log({cookies});
    const cookiesByName = (cookies??[]).reduce<Record<string, string>>((acc, cookie) => {
        return {
            ...acc,
            ...parse(cookie)
        }
    }, {});
    if (required && !cookiesByName.auth) {
        throw new ErrorResponse(401, "Please login to access this resource");
    }

    return cookiesByName.auth
}

const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? '';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';

const verifier = CognitoJwtVerifier.create(
    {
        userPoolId: COGNITO_USER_POOL_ID,
        tokenUse: "access",
        clientId: COGNITO_CLIENT_ID
    }
)

export async function assertUserGroup(event: APIGatewayProxyEventV2, groupName: string) {
    const accessToken = getAccessToken(event);
    const payload = await verifier.verify(accessToken);
    if (!payload["cognito:groups"]?.includes(groupName)) {
        console.warn("Failed to match group", {groupName, payload})
        throw new ErrorResponse(403, {error: "Not authorised to view this resource"})
    }
}

export const COOKIE_PATH = process.env.COOKIE_PATH ?? '/';
