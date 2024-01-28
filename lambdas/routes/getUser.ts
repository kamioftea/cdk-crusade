import {AttributeType, GetUserCommand,} from "@aws-sdk/client-cognito-identity-provider";
import {Route} from "./route";
import {getAccessToken} from "../utils/tokenUtils";
import {Schema, z} from "zod";

interface GetUserResponse {
    name: string,
    email: string,
}

function validateGetUserResponse(input: any): GetUserResponse {
    const schema: Schema<GetUserResponse> = z.object(
        {
            name: z.string(),
            email: z.string(),
        }
    ).strict();

    return schema.parse(input);
}

const handler: Route<GetUserResponse>["handle"] =
    async (event, {client}) => {
        const accessToken = getAccessToken(event);

        const res = await client.send(
            new GetUserCommand({AccessToken: accessToken})
        );

        const attributesToEntries = ({Name, Value}: AttributeType) => Name && Value ? [[Name, Value]] : [];
        const attributes = Object.fromEntries((res.UserAttributes ?? []).flatMap(attributesToEntries))

        console.log({attributes, res});

        return validateGetUserResponse({
            name: attributes.nickname,
            email: attributes.email
        });
    }

export const getUserRoute: Route<GetUserResponse> = {
    handle: handler,
    method: "GET",
    action: "/",
}
