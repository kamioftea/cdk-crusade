import {CfnOutput, NestedStack, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {
    AccountRecovery,
    CfnUserPool,
    CfnUserPoolGroup,
    ClientAttributes,
    UserPool,
    UserPoolClient,
    UserPoolClientIdentityProvider,
    UserVerificationConfig,
    VerificationEmailStyle
} from "aws-cdk-lib/aws-cognito";
import {Construct} from "constructs";
import {join} from "path";
import {NodejsFunction, NodejsFunctionProps} from "aws-cdk-lib/aws-lambda-nodejs";
import {Runtime, Tracing} from "aws-cdk-lib/aws-lambda";
import {HttpLambdaIntegration} from "aws-cdk-lib/aws-apigatewayv2-integrations";
import {HttpApi, HttpMethod} from "aws-cdk-lib/aws-apigatewayv2";
import {InvocationType, Trigger} from "aws-cdk-lib/triggers";

interface AuthNestedStackProps extends StackProps {
    appName: string;
    emailVerificationConfig?: UserVerificationConfig;
    adminEmail: string;
    adminPassword: string;
}

export class AuthNestedStack extends NestedStack {
    private readonly authApiIntegration: HttpLambdaIntegration;
    private readonly adminAuthApiIntegration: HttpLambdaIntegration;

    constructor(scope: Construct, id: string, props: AuthNestedStackProps) {
        super(scope, id, props);
        const appName = props?.appName ?? 'aws application';
        const appIdPart = appName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

        const {account, region} = Stack.of(this);

        const userPool = new UserPool(this, `${id}UserPool`, {
            userPoolName: `${appIdPart}-user-pool`,
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
            },
            autoVerify: {
                email: true,
            },
            userVerification: props?.emailVerificationConfig ?? {
                emailSubject: `Verify your email for ${appName}`,
                emailStyle: VerificationEmailStyle.CODE,
                emailBody: `\
<p>Hi,</p>
<p>
    You are receiving this email because this email address was used to set up a ${appName} account.
</p>
<p>
    If this was you, please use this code to verify your address: <strong>{####}</strong>.
</p>
<p>Thanks.</p>`,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                nickname: {
                    required: true,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 12,
                requireLowercase: false,
                requireDigits: false,
                requireUppercase: false,
                requireSymbols: false,
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        new CfnOutput(this, 'UserPoolId', {value: userPool.userPoolId});
        new CfnOutput(this, 'UserPoolProviderUrl', {value: userPool.userPoolProviderUrl});

        const cfnUserPool = userPool.node.defaultChild as CfnUserPool;
        cfnUserPool.emailConfiguration = {
            emailSendingAccount: 'DEVELOPER',
            replyToEmailAddress: props?.adminEmail ?? 'email@example.org',
            sourceArn: `arn:aws:ses:eu-west-2:${account}:identity/jeff@goblinoid.co.uk`,
        };

        new CfnUserPoolGroup(this, `${id}AuthorisedUsersGroup`, {
            userPoolId: userPool.userPoolId,
            groupName: 'authorised',
        });

        new CfnUserPoolGroup(this, `${id}AdminUsersGroup`, {
            userPoolId: userPool.userPoolId,
            groupName: 'admin',
        });

        const standardCognitoAttributes = {
            email: true,
            emailVerified: true,
            nickname: true,
        };
        const clientReadAttributes = new ClientAttributes()
            .withStandardAttributes(standardCognitoAttributes);

        const clientWriteAttributes = new ClientAttributes()
            .withStandardAttributes(
                {
                    ...standardCognitoAttributes,
                    emailVerified: false,
                }
            );

        // 👇 User Pool Client
        const userPoolClient = new UserPoolClient(this, `${id}UserPoolClient`, {
            userPool,
            authFlows: {
                userPassword: true,
            },
            supportedIdentityProviders: [
                UserPoolClientIdentityProvider.COGNITO,
            ],
            readAttributes: clientReadAttributes,
            writeAttributes: clientWriteAttributes,
            enableTokenRevocation: true,
        });

        new CfnOutput(this, 'UserPoolClient', {value: userPoolClient.userPoolClientId});

        const lambdaDefaults: NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
                    'aws-lambda',
                    //'aws-xray-sdk',  // Doesn't work
                    '@aws-sdk/client-cognito-identity-provider',
                    '@aws-sdk/client-s3',
                    '@aws-sdk/lib-dynamodb',
                    '@aws-sdk/client-dynamodb',
                ],
            },
            environment: {
                COGNITO_REGION: region,
                COGNITO_USER_POOL_ID: userPool.userPoolId,
                COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
            },
            depsLockFilePath: join(__dirname, '..', 'package-lock.json'),
            runtime: Runtime.NODEJS_20_X,
            tracing: Tracing.ACTIVE,
        }

        const authApiHandler = new NodejsFunction(this, `${id}AuthApiHandler`, {
            entry: join(__dirname, '..', 'lambdas', 'authHandler.ts'),
            ...lambdaDefaults,
        })

        this.authApiIntegration = new HttpLambdaIntegration(`${id}AuthApiIntegration`, authApiHandler);

        const adminAuthApiHandler = new NodejsFunction(this, `${id}AdminAuthApiHandler`, {
            entry: join(__dirname, '..', 'lambdas', 'adminAuthHandler.ts'),
            ...lambdaDefaults,
        })

        userPool.grant(
            adminAuthApiHandler,
            'cognito-idp:AdminGetUser',
            'cognito-idp:AdminDeleteUser',
            'cognito-idp:AdminUpdateUserAttributes',
            'cognito-idp:AdminConfirmSignUp',
            'cognito-idp:AdminAddUserToGroup',
        );

        this.adminAuthApiIntegration = new HttpLambdaIntegration(`${id}AdminAuthApiIntegration`, adminAuthApiHandler);

        const createAdminUserFunction = new NodejsFunction(this, `${id}CreateAdminUserFunction`, {
            entry: join(__dirname, '..', 'lambdas', 'deploy', 'createAdminUser.ts'),
            ...lambdaDefaults,
            environment: {
                ...lambdaDefaults.environment,
                ADMIN_EMAIL: props.adminEmail,
                ADMIN_PASSWORD: props.adminPassword,
            }
        });

        userPool.grant(
            createAdminUserFunction,
            'cognito-idp:AdminGetUser',
            'cognito-idp:AdminCreateUser',
            'cognito-idp:AdminSetUserPassword',
            'cognito-idp:AdminAddUserToGroup',
        );

        new Trigger(this, `${id}CreateAdminUserTrigger`, {
            handler: createAdminUserFunction,
            invocationType: InvocationType.EVENT,
            executeOnHandlerChange: true,
        });
    }

    public registerAuthApiRoutes(api: HttpApi) {
        api.addRoutes(
            {
                path: '/auth',
                methods: [HttpMethod.GET],
                integration: this.authApiIntegration,
            }
        );
        api.addRoutes(
            {
                path: '/auth/{action}',
                methods: [HttpMethod.POST],
                integration: this.authApiIntegration,
            }
        );
        api.addRoutes(
            {
                path: '/admin/auth/{action}/{email}',
                methods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.DELETE],
                integration: this.adminAuthApiIntegration,
            }
        );
    }
}
