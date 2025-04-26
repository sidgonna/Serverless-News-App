# Serverless News Aggregator

This project implements a serverless news aggregator using AWS services. It fetches news articles from RSS feeds, stores them in DynamoDB, exposes them via a secured API Gateway endpoint, and displays them on a static website hosted on S3 and delivered via CloudFront with HTTPS. User authentication is handled by Amazon Cognito.

## Table of Contents

*   [Prerequisites](#prerequisites)
*   [Architecture](#architecture)
*   [Implementation Steps](#implementation-steps)
    *   [Step 1: Set Up DynamoDB Table](#step-1-set-up-dynamodb-table)
    *   [Step 2: Create Lambda Function for News Fetching](#step-2-create-lambda-function-for-news-fetching)
    *   [Step 3: Schedule News Fetching with CloudWatch Events](#step-3-schedule-news-fetching-with-cloudwatch-events)
    *   [Step 4: Create Lambda Function for API](#step-4-create-lambda-function-for-api)
    *   [Step 5: Set Up Cognito User Pool](#step-5-set-up-cognito-user-pool)
    *   [Step 6: Set Up API Gateway with Cognito Authorizer](#step-6-set-up-api-gateway-with-cognito-authorizer)
    *   [Step 7: Set Up S3 for Website Hosting](#step-7-set-up-s3-for-website-hosting)
    *   [Step 8: Set Up CloudFront Distribution for HTTPS](#step-8-set-up-cloudfront-distribution-for-https)
    *   [Step 9: Build and Deploy Frontend](#step-9-build-and-deploy-frontend)
*   [Testing and Monitoring](#testing-and-monitoring)
*   [Cleanup (Optional)](#cleanup-optional)
*   [Resources](#resources)

## Prerequisites

*   AWS account with access to Lambda, DynamoDB, API Gateway, S3, CloudFront, Cognito, and CloudWatch.
*   Basic knowledge of Python, JavaScript, and AWS console usage.
*   AWS CLI installed and configured (`aws configure`).
*   Node.js and npm installed for local frontend development.
*   A registered domain name (optional, but recommended for CloudFront with a custom SSL certificate).

## Architecture

The architecture consists of the following components:

*   **AWS Lambda (`FetchNews`)**: Periodically fetches news from configured RSS feeds.
*   **AWS DynamoDB (`NewsArticles`)**: Stores the fetched news articles.
*   **AWS CloudWatch Events**: Triggers the `FetchNews` Lambda function on a schedule.
*   **AWS Lambda (`GetNews`)**: Retrieves news articles from DynamoDB.
*   **AWS Cognito User Pool**: Manages user sign-up, sign-in, and authentication.
*   **AWS API Gateway (HTTP API)**: Exposes the `GetNews` Lambda function and secures it using a Cognito Authorizer.
*   **AWS S3**: Hosts the static frontend website files.
*   **AWS CloudFront**: Distributes the S3 content, provides HTTPS, and improves performance.
*   **Frontend (React)**: A single-page application that interacts with Cognito for authentication and the secured API Gateway endpoint to display news.

```mermaid
graph LR
    CloudWatchEvents[CloudWatch Events] --> LambdaFetch[Lambda (FetchNews)]
    LambdaFetch --> DynamoDB[DynamoDB (NewsArticles)]
    API_Gateway[API Gateway] --> LambdaGet[Lambda (GetNews)]
    LambdaGet --> DynamoDB
    Cognito[Cognito User Pool] --> API_Gateway
    Frontend[Frontend (React)] --> Cognito
    Frontend --> API_Gateway
    S3[S3 Bucket] --> CloudFront[CloudFront Distribution]
    CloudFront --> Frontend
    User[User] --> CloudFront
```

## Implementation Steps

Follow these steps to set up the serverless news aggregator.

### Step 1: Set Up DynamoDB Table

Create a DynamoDB table to store news articles.

1.  Navigate to **DynamoDB** in the AWS Console.
2.  Click **Create Table**.
    *   **Name:** `NewsArticles`
    *   **Partition Key:** `articleId` (String)
    *   **Attributes (Example):** `Title` (String), `Description` (String), `PubDate` (String), `Source` (String), `Link` (String). *(Note: Only the partition key is strictly required at table creation)*.
    *   **Settings:** Use default settings (on-demand capacity is simpler for this example).
3.  Click **Create table**.
4.  Note the table **ARN** (Amazon Resource Name) for later use in IAM policies.

### Step 2: Create Lambda Function for News Fetching

Set up a Lambda function to fetch RSS feeds and store articles in DynamoDB.

1.  Navigate to **Lambda** in the AWS Console.
2.  Click **Create Function**.
    *   **Function name:** `FetchNews`
    *   **Runtime:** Python 3.9 (or a later supported version)
    *   **Architecture:** `x86_64`
    *   **Permissions:** Choose **Create a new role with basic Lambda permissions**. We will add DynamoDB permissions later.
3.  Click **Create function**.
4.  **Add Code:**
    *   Replace the default `lambda_function.py` content with the following:
5.  **Install Dependencies:**
    *   The `feedparser` library is not included in the standard Lambda runtime. Create a deployment package.
    ```bash
    # On your local machine
    mkdir lambda_package_fetch
    pip install feedparser -t lambda_package_fetch/
    # Copy your lambda function code into the directory
    cp lambda_function.py lambda_package_fetch/
    cd lambda_package_fetch
    zip -r ../fetch_news_deployment.zip .
    cd ..
    ```
6.  **Upload Deployment Package:**
    *   In the Lambda console for `FetchNews`, under **Code source**, click **Upload from** and select **.zip file**.
    *   Upload the `fetch_news_deployment.zip` file.
7.  **Configure Runtime Settings:**
    *   Ensure the **Handler** is set to `lambda_function.lambda_handler`.
8.  **Set Environment Variables:**
    *   Under **Configuration** > **Environment variables**, add:
        *   Key: `DYNAMODB_TABLE`, Value: `NewsArticles`
9.  **Increase Timeout:**
    *   Under **Configuration** > **General configuration**, edit the **Timeout**. Set it to `1` minute or higher (e.g., `5` min `0` sec) as fetching multiple feeds can take time.
10. **Add Permissions:**
    *   Go to **Configuration** > **Permissions**. Click the **Role name**.
    *   In the IAM console, click **Add permissions** > **Attach policies**.
    *   Click **Create policy**.
    *   Go to the **JSON** tab and paste the following policy (replace `region` and `account-id` with your specific values, or use the ARN copied in Step 1):
        ```json
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "dynamodb:PutItem",
                        "dynamodb:UpdateItem"
                    ],
                    "Resource": "arn:aws:dynamodb:YOUR_REGION:YOUR_ACCOUNT_ID:table/NewsArticles"
                }
            ]
        }
        ```
    *   Click **Next: Tags**, **Next: Review**.
    *   Give the policy a name (e.g., `LambdaFetchNewsDynamoDBWritePolicy`). Click **Create policy**.
    *   Go back to the IAM role tab and attach the newly created policy (`LambdaFetchNewsDynamoDBWritePolicy`) to the Lambda's execution role.

### Step 3: Schedule News Fetching with CloudWatch Events

Trigger the `FetchNews` Lambda function periodically.

1.  Navigate to **CloudWatch** in the AWS Console.
2.  In the left navigation, under **Events**, click **Rules**.
3.  Click **Create rule**.
    *   **Event Source:** Select **Schedule**.
    *   Configure the schedule (e.g., **Fixed rate of** `1` **Hour**).
    *   **Targets:**
        *   Select **Lambda function**.
        *   Function: Choose `FetchNews`.
    *   Click **Configure details**.
    *   **Name:** `FetchNewsSchedule`
    *   **Description:** (Optional) Trigger FetchNews Lambda every hour.
    *   Ensure **State** is **Enabled**.
    *   Click **Create rule**. (CloudWatch will automatically add the necessary permissions to the rule to invoke the Lambda function).

### Step 4: Create Lambda Function for API

Set up a Lambda function to query DynamoDB and serve articles via API Gateway.

1.  Navigate to **Lambda** in the AWS Console.
2.  Click **Create Function**.
    *   **Function name:** `GetNews`
    *   **Runtime:** Python 3.9 (or later)
    *   **Architecture:** `x86_64`
    *   **Permissions:** Choose **Create a new role with basic Lambda permissions**.
3.  Click **Create function**.
4.  **Add Code:**
    *   Replace the default `lambda_function.py` content:
5.  **Set Environment Variables:**
    *   Under **Configuration** > **Environment variables**, add:
        *   Key: `DYNAMODB_TABLE`, Value: `NewsArticles`
6.  **Add Permissions:**
    *   Go to **Configuration** > **Permissions**. Click the **Role name**.
    *   In the IAM console, click **Add permissions** > **Attach policies**.
    *   Click **Create policy**.
    *   Go to the **JSON** tab and paste the following policy (replace `region` and `account-id` or use the ARN):
        ```json
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "dynamodb:Scan"
                        // If using Query later, add "dynamodb:Query"
                    ],
                    "Resource": "arn:aws:dynamodb:YOUR_REGION:YOUR_ACCOUNT_ID:table/NewsArticles"
                    // If using a Global Secondary Index (GSI) later, add its ARN here too
                    // "arn:aws:dynamodb:YOUR_REGION:YOUR_ACCOUNT_ID:table/NewsArticles/index/YourIndexName"
                }
            ]
        }
        ```
    *   Click **Next: Tags**, **Next: Review**.
    *   Give the policy a name (e.g., `LambdaGetNewsDynamoDBReadPolicy`). Click **Create policy**.
    *   Attach the newly created policy (`LambdaGetNewsDynamoDBReadPolicy`) to the Lambda's execution role.

### Step 5: Set Up Cognito User Pool

Create a Cognito User Pool for managing users and authentication.

1.  Navigate to **Cognito** in the AWS Console.
2.  Click **Create user pool**.
3.  **Configure sign-in experience:**
    *   Select **User name** and/or **Email** as Cognito user pool sign-in options.
    *   Click **Next**.
4.  **Configure security requirements:**
    *   Choose password policy, MFA options (e.g., Off or Optional), user account recovery options. Use defaults or adjust as needed.
    *   Click **Next**.
5.  **Configure sign-up experience:**
    *   Configure self-service sign-up, attribute verification, required attributes (e.g., `email`).
    *   Click **Next**.
6.  **Configure message delivery:**
    *   Choose SES or Cognito for sending emails. Cognito is simpler for testing.
    *   Click **Next**.
7.  **Integrate your app:**
    *   **User pool name:** `NewsAggregatorUserPool`
    *   **App client name:** `NewsAggregatorWebAppClient`
    *   **App type:** `Public client` (important for web apps, implies no client secret).
    *   **Allowed callback URLs:** Add the HTTPS URL of your future CloudFront distribution (e.g., `https://your-cloudfront-id.cloudfront.net/`). You can add `http://localhost:3000/` for local testing. **These must be HTTPS unless localhost.**
    *   **Allowed sign-out URLs:** Add the same CloudFront/localhost URLs.
    *   **Identity providers:** Select `Cognito User Pool`.
    *   **OAuth 2.0 grant types:** Select `Authorization code grant`.
    *   **OpenID Connect scopes:** Select `openid`, `email`, `profile`.
    *   Click **Next**.
8.  **Review and create:**
    *   Review all settings.
    *   Click **Create user pool**.
9.  **Note Pool details:**
    *   After creation, go to the **User pool overview** tab and note the **User pool ID**.
    *   Go to the **App integration** tab, scroll down to **App clients**, and click your app client (`NewsAggregatorWebAppClient`). Note the **Client ID**.
    *   On the **App integration** tab, under **Domain**, create a Cognito domain prefix (e.g., `your-unique-news-aggregator-auth`) or configure a custom domain. Note the full domain name.

### Step 6: Set Up API Gateway with Cognito Authorizer

Expose the `GetNews` Lambda function via an HTTP API and secure it using the Cognito User Pool.

1.  Navigate to **API Gateway** in the AWS Console.
2.  Find **HTTP API** and click **Build**.
3.  Click **Add integration**.
    *   **Integration type:** `Lambda`
    *   **AWS Region:** Select your region.
    *   **Lambda function:** Choose `GetNews`.
    *   **API name:** `NewsAPI`
    *   Click **Next**.
4.  **Configure routes:**
    *   **Method:** `GET`
    *   **Resource path:** `/articles`
    *   **Integration target:** Select the `GetNews` integration created previously.
    *   Click **Next**.
5.  **Configure stages:**
    *   **Stage name:** `prod` (or your preferred name)
    *   **Auto-deploy:** Enable this for simplicity.
    *   Click **Next**.
6.  **Review and create:** Click **Create**.
7.  **Configure Authorization:**
    *   In the left navigation for your `NewsAPI`, click **Authorization**.
    *   Under **Manage authorizers**, click **Create**.
        *   **Authorizer type:** `JWT`
        *   **Name:** `CognitoAuthorizer`
        *   **Identity source:** `$request.header.Authorization`
        *   **Issuer URL:** `https://cognito-idp.YOUR_REGION.amazonaws.com/YOUR_USER_POOL_ID` (Replace placeholders with your Cognito User Pool region and ID).
        *   **Audience:** Enter your Cognito **App client ID** noted in Step 5.
        *   Click **Create**.
    *   Go back to **Routes**. Select the `GET /articles` route.
    *   Click **Attach authorizer**. Select `CognitoAuthorizer`. Click **Attach authorizer**.
8.  **Configure CORS:**
    *   In the left navigation, click **CORS**.
    *   Click **Configure**.
        *   **Access-Control-Allow-Origin:** Enter your CloudFront distribution URL (e.g., `https://your-cloudfront-id.cloudfront.net`). You can also add `http://localhost:3000` for local testing. **Avoid using `*` in production.**
        *   **Access-Control-Allow-Headers:** Add `authorization` to the default list (e.g., `content-type,x-amz-date,authorization,x-api-key,x-amz-security-token`).
        *   **Access-Control-Allow-Methods:** Ensure `GET` and `OPTIONS` are included.
        *   Leave other settings as default or adjust as needed.
    *   Click **Save**. CORS configuration is automatically deployed if auto-deploy is enabled.
9.  **Note Invoke URL:**
    *   Go to **Stages**, select the `prod` stage. Note the **Invoke URL** (e.g., `https://api-id.execute-api.region.amazonaws.com/prod`).

### Step 7: Set Up S3 for Website Hosting

Host the static frontend website files on S3.

1.  Navigate to **S3** in the AWS Console.
2.  Click **Create bucket**.
    *   **Bucket name:** `news-aggregator-web-your-unique-suffix` (Must be globally unique).
    *   **AWS Region:** Choose your preferred region.
    *   **Block Public Access settings:** Uncheck **Block *all* public access**. Check the box acknowledging that the bucket will become public. This is necessary for *static website hosting only*. Access will later be restricted via CloudFront OAI.
    *   Click **Create bucket**.
3.  **Enable Static Website Hosting:**
    *   Select the newly created bucket.
    *   Go to the **Properties** tab.
    *   Scroll down to **Static website hosting** and click **Edit**.
    *   Select **Enable**.
    *   **Hosting type:** `Host a static website`.
    *   **Index document:** `index.html`
    *   **Error document:** `index.html` (Important for Single Page Application routing).
    *   Click **Save changes**.
4.  **Set Bucket Policy (Temporary - will be replaced by CloudFront):**
    *   Go to the **Permissions** tab.
    *   Under **Bucket policy**, click **Edit**.
    *   Paste the following policy, replacing `news-aggregator-web-your-unique-suffix` with your actual bucket name:
        ```json
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": "s3:GetObject",
                    "Resource": "arn:aws:s3:::news-aggregator-web-your-unique-suffix/*"
                }
            ]
        }
        ```
    *   Click **Save changes**. *Note: This policy allows direct public access. We will tighten this in the CloudFront step.*

### Step 8: Set Up CloudFront Distribution for HTTPS

Distribute S3 content via CloudFront for HTTPS, performance, and security.

1.  Navigate to **CloudFront** in the AWS Console.
2.  Click **Create distribution**.
3.  **Origin:**
    *   **Origin domain:** Select your S3 bucket from the dropdown list (e.g., `news-aggregator-web-your-unique-suffix.s3.your-region.amazonaws.com`). **Do NOT select the S3 website endpoint URL.**
    *   **S3 bucket access:** Select **Yes, use OAI (Origin Access Identity)**.
        *   **Origin access identity:** Click **Create new OAI**. Accept the default name or provide one.
        *   **Bucket policy:** Select **Yes, update the bucket policy**. This is crucial – CloudFront will automatically update your S3 bucket policy to *only* allow access from this CloudFront distribution via the OAI, removing the public access policy set earlier.
4.  **Default cache behavior:**
    *   **Viewer protocol policy:** Select **Redirect HTTP to HTTPS**.
    *   **Allowed HTTP methods:** Select **GET, HEAD, OPTIONS**. (OPTIONS is needed for CORS preflight requests).
    *   **Cache policy:** Choose `CachingOptimized` (or `CachingDisabled` for development if needed, but `CachingOptimized` is generally good).
    *   **Origin request policy:** Choose `Managed-CORS-S3Origin` (or create a custom one if needed).
5.  **Settings:**
    *   **Price class:** Select based on your needs (e.g., `Use all edge locations`).
    *   **Alternate domain names (CNAMEs):** (Optional) Add your custom domain name if you have one and have configured a corresponding SSL certificate in AWS Certificate Manager (ACM).
    *   **Custom SSL certificate:** (Optional) If using a CNAME, select your ACM certificate. Otherwise, CloudFront provides a default certificate for its `*.cloudfront.net` domain.
    *   **Default root object:** Enter `index.html`.
6.  Click **Create distribution**.
7.  Wait for the distribution to deploy (Status changes from "Deploying" to the last modified date/time).
8.  **Note Distribution Details:** Note the **Distribution domain name** (e.g., `d111111abcdef8.cloudfront.net`). This is your primary HTTPS website URL. If using a custom domain, use that instead after DNS configuration.
9.  **Verify S3 Bucket Policy:** Go back to your S3 bucket -> Permissions -> Bucket Policy. Confirm CloudFront updated it to grant access only to your OAI.

### Step 9: Build and Deploy Frontend

Create a React frontend using AWS Amplify for Cognito integration and Axios for API calls.

1.  **Set Up React Project:**
    ```bash
    npx create-react-app news-aggregator-frontend
    cd news-aggregator-frontend
    ```
2.  **Install Dependencies:**
    ```bash
    npm install axios aws-amplify @aws-amplify/ui-react
    ```
3.  **Configure AWS Amplify:**
    *   Create a configuration file `src/aws-exports.js`. **Replace ALL placeholder values** with your actual resource details from previous steps.

    ```javascript
    // src/aws-exports.js
    const awsmobile = {
        "aws_project_region": "YOUR_REGION", // e.g., "us-east-1"
        "aws_cognito_region": "YOUR_REGION", // Should match aws_project_region
        "aws_user_pools_id": "YOUR_USER_POOL_ID", // From Step 5
        "aws_user_pools_web_client_id": "YOUR_APP_CLIENT_ID", // From Step 5
        "oauth": {
            // Domain looks like: your-prefix.auth.your-region.amazoncognito.com
            "domain": "YOUR_COGNITO_DOMAIN", // From Step 5 (App Integration -> Domain)
            "scope": [
                "email",
                "openid",
                "profile"
                // Add "aws.cognito.signin.user.admin" if needed, but usually not required for basic auth
            ],
            // Use your CloudFront HTTPS URL (or localhost for testing)
            "redirectSignIn": "https://YOUR_CLOUDFRONT_DOMAIN_NAME/", // From Step 8
            "redirectSignOut": "https://YOUR_CLOUDFRONT_DOMAIN_NAME/", // From Step 8
            "responseType": "code" // Use 'code' for Authorization Code Grant
        },
        "federationTarget": "COGNITO_USER_POOLS",
        "aws_cloud_logic_custom": [
            {
                "name": "NewsAPI", // A friendly name for your API
                "endpoint": "https://YOUR_API_GATEWAY_INVOKE_URL/prod", // From Step 6 (Invoke URL, includes stage)
                "region": "YOUR_REGION" // Region where API Gateway is deployed
            }
        ]
    };

    export default awsmobile;
    ```

4.  **Integrate Amplify in `src/index.js`:**
    ```javascript
    // src/index.js
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import './index.css';
    import App from './App';
    import reportWebVitals from './reportWebVitals';

    import { Amplify } from 'aws-amplify';
    import awsExports from './aws-exports'; // Import the config

    Amplify.configure(awsExports); // Configure Amplify

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    reportWebVitals();
    ```

5.  **Create App Component (`src/App.js`):**  

7.  **Add Basic Styling (`src/App.css`):**
    ```css
    /* src/App.css (Example basic styling) */
    body {
      font-family: sans-serif;
      margin: 0;
      background-color: #f4f4f4;
    }

    /* You might need to target Amplify components specifically if default styles aren't enough */
    /* Example: Targeting the sign-out button if needed */
    /* [data-amplify-authenticator] button[type="submit"] { ... } */

    /* Let Amplify UI handle most layout, add custom styles for your components */
    ```

8.  **Build and Deploy:**
    *   Build the React app:
        ```bash
        npm run build
        ```
    *   Sync the `build` directory contents to your S3 bucket using AWS CLI. Replace `news-aggregator-web-your-unique-suffix` with your bucket name.
        ```bash
        aws s3 sync build/ s3://news-aggregator-web-your-unique-suffix/ --delete
        ```
        The `--delete` flag removes files from the S3 bucket that are no longer in the local `build` folder.

9.  **Update CloudFront Cache (Optional but Recommended):**
    *   After deploying new frontend code, you should invalidate the CloudFront cache to ensure users see the latest version immediately.
    *   Navigate to **CloudFront** > **Distributions**. Select your distribution.
    *   Go to the **Invalidations** tab. Click **Create invalidation**.
    *   Enter `/index.html` and `/`\* (or specific paths like `/static/*`) to invalidate the necessary files.
    *   Click **Create invalidation**.

## Testing and Monitoring

1.  **Test Cognito Authentication:** Access your CloudFront HTTPS URL (e.g., `https://d111111abcdef8.cloudfront.net`). You should be prompted to sign up or sign in by the Amplify Authenticator UI. Create an account and log in.
2.  **Test News Display:** After signing in, the `AppContent` component should load. Verify that news articles fetched from your API are displayed. Check the browser's developer console for any errors.
3.  **Test API Security:** Try accessing the API Gateway Invoke URL for `/articles` directly in your browser or using `curl` *without* an `Authorization` header. It should return a `401 Unauthorized` or similar error. Then try with a valid `Authorization: Bearer <ID_TOKEN>` header.
4.  **Test News Fetching:** Trigger the `FetchNews` Lambda function manually from the AWS Lambda console or wait for the CloudWatch scheduled event. Check the `NewsArticles` table in DynamoDB to confirm new articles are being added (and duplicates skipped). Check the CloudWatch Logs for the `FetchNews` Lambda function for detailed execution logs.
5.  **Monitor:** Use **CloudWatch Logs** for both `FetchNews` and `GetNews` Lambda functions to debug issues. Monitor **API Gateway** metrics and logs for API usage and errors. Check **CloudFront** metrics for website traffic and cache performance.

## Cleanup (Optional)

To avoid ongoing AWS charges after you are finished with the project, delete the resources you created. Delete them in roughly the reverse order of creation:

1.  **CloudFront Distribution:** Disable and then delete the distribution.
2.  **S3 Bucket:** Empty the bucket first, then delete it. CloudFront OAI might prevent deletion until the distribution is fully deleted.
3.  **API Gateway:** Delete the `NewsAPI`.
4.  **Lambda Functions:** Delete the `FetchNews` and `GetNews` functions.
5.  **CloudWatch Event Rule:** Delete the `FetchNewsSchedule` rule.
6.  **DynamoDB Table:** Delete the `NewsArticles` table.
7.  **Cognito User Pool:** Delete the `NewsAggregatorUserPool`.
8.  **IAM Roles and Policies:** Delete the execution roles created for the Lambda functions and the custom policies (`LambdaFetchNewsDynamoDBWritePolicy`, `LambdaGetNewsDynamoDBReadPolicy`) if they are no longer needed.
9.  **CloudWatch Log Groups:** Associated log groups can also be deleted.
10. **CloudFront Origin Access Identity (OAI):** Delete the OAI if it's not used by other distributions.

## Resources

*   [AWS Lambda Documentation](https://aws.amazon.com/lambda/getting-started/)
*   [Amazon DynamoDB Documentation](https://aws.amazon.com/dynamodb/getting-started/)
*   [Amazon API Gateway Documentation](https://aws.amazon.com/api-gateway/getting-started/)
*   [Amazon S3 Documentation](https://aws.amazon.com/s3/getting-started/)
*   [Amazon CloudFront Documentation](https://aws.amazon.com/cloudfront/getting-started/)
*   [Amazon Cognito Documentation](https://aws.amazon.com/cognito/getting-started/)
*   [AWS Amplify Documentation (v6+)](https://docs.amplify.aws/)
*   [feedparser Documentation](https://feedparser.readthedocs.io/en/latest/)
*   [Axios Documentation](https://axios-http.com/docs/intro)
