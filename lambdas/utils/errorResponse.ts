import {APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";

export class ErrorResponse extends Error {
    constructor(readonly statusCode: number, readonly body: any, readonly headers?: { [key: string]: string }) {
        super(`Error response: status ${statusCode}`);
    }

    asResponse(): APIGatewayProxyResult {
        return {
            // Errors are swallowed by cloud front or the redirect when S3 fails doesn't work
            statusCode: 200,
            headers: {
                ...(this.headers ?? {}),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(
                {
                    body: this.body,
                    statusCode: this.statusCode,
                }
            )
        }
    }
}

export function handleError(err: any): APIGatewayProxyResult {
    if (err instanceof ErrorResponse) {
        console.log('returning', err.asResponse())
        return err.asResponse()
    }
    console.error(err);
    // Errors are swallowed by cloud front or the redirect when S3 fails doesn't work
    return {
        statusCode: 200,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(
            {
                error: err.message ?? 'Unknown error',
                statusCode: 500
            }
        )
    }
}
