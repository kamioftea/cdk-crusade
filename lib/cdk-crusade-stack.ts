import * as cdk from 'aws-cdk-lib';
import {HttpApi} from 'aws-cdk-lib/aws-apigatewayv2';
import {Construct} from 'constructs';
import {AuthNestedStack} from "./cognito-stack";

const adminEmail = process.env.ADMIN_EMAIL ?? 'jeff@goblinoid.co.uk';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme1234';

export class CdkCrusadeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        let authStack = new AuthNestedStack(this, `${id}AuthStack`, {
            appName: 'Crusade management',
            adminEmail,
            adminPassword,
        });


        const httpApi = new HttpApi(this, `${id}HttpApi`);
        authStack.registerAuthApiRoutes(httpApi);

        new cdk.CfnOutput(this, 'apiUrl', {value: httpApi.url ?? 'no url'});
    }
}
