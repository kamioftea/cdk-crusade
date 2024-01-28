import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from "aws-lambda";
import {CognitoIdentityProviderClient} from "@aws-sdk/client-cognito-identity-provider";
import {Subsegment} from "aws-xray-sdk";
import invariant from "tiny-invariant";
import {ErrorResponse, handleError} from "../utils/errorResponse";

export interface RouteContext {
    client: CognitoIdentityProviderClient
    clientId: string
    userPoolId: string
    segment?: Subsegment
}

export interface Route<T = never> {
    handle: (event: APIGatewayProxyEventV2, context: RouteContext) => Promise<APIGatewayProxyResultV2<T>>;
    method: "GET" | "POST" | "PUT" | "DELETE";
    action: string;
}

export function parseBody<T>(event: APIGatewayProxyEventV2, validator: (body: any) => T): T {
    const body = event.isBase64Encoded
                 ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
                 : event.body;

    const json = JSON.parse(body ?? '');
    return validator(json);
}

export async function routeEvent(
    event: APIGatewayProxyEventV2,
    routes: {[key: string]: Route<any>},
    context: RouteContext
): Promise<APIGatewayProxyResultV2> {
    const action = event.pathParameters?.action ?? '/';
    const method = event.requestContext.http.method;

    const [name, route] =
    Object.entries(routes)
          .find(([,r]) => r.action === action && r.method === method)
    ?? [];

    if (!route) {
        return handleError(new ErrorResponse(404, 'Not found'));
    }

    invariant(name, 'route name defined if route is')
    context?.segment?.addAnnotation('route', name);

    return await route.handle(event, context);
}
