import * as AWSXRay from "aws-xray-sdk";

type Client = { middlewareStack: { remove: any, use: any }, config: any }

export function setupXRay(...clients: Client[]) {
    AWSXRay.captureHTTPsGlobal(require("http"), true);
    AWSXRay.captureHTTPsGlobal(require("https"), true);
    AWSXRay.capturePromise();
    clients.forEach(c => AWSXRay.captureAWSv3Client(c))
}
