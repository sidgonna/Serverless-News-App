# Serverless News Aggregator

This project implements a serverless news aggregator using AWS services. It fetches news articles from configurable RSS feeds, stores them in DynamoDB, exposes them via a secured API Gateway endpoint, and displays them on a static website hosted on S3 and delivered via CloudFront with HTTPS. User authentication is handled by Amazon Cognito.

## Table of Contents

*   [Prerequisites](#prerequisites)
*   [Architecture](#architecture)
*   [Implementation Details](#implementation-details)
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



## Implementation Details

For detailed step-by-step instructions on setting up each component of this project, please refer to the [Implementation Guide](./implementation.md).

## Testing and Monitoring

1.  **Test Cognito Authentication:** Access your CloudFront HTTPS URL. You should be prompted to sign up or sign in by the Amplify Authenticator UI. Create an account and log in.
2.  **Test News Display:** After signing in, the `AppContent` component should load. Verify that news articles fetched from your API are displayed. Check the browser's developer console for any errors.
3.  **Test API Security:** Try accessing the API Gateway Invoke URL for `/articles` directly *without* an `Authorization` header. It should return a `401 Unauthorized` or similar error.
4.  **Test News Fetching:** Trigger the `FetchNews` Lambda function manually or wait for the CloudWatch schedule. Check the `NewsArticles` table in DynamoDB and the CloudWatch Logs for the `FetchNews` Lambda function.
5.  **Monitor:** Use **CloudWatch Logs** for Lambda functions, **API Gateway** metrics/logs, and **CloudFront** metrics for ongoing monitoring and debugging.

## Cleanup (Optional)

To avoid ongoing AWS charges after you are finished with the project, delete the resources you created. Delete them in roughly the reverse order of creation:

1.  CloudFront Distribution
2.  S3 Bucket (empty first)
3.  API Gateway
4.  Lambda Functions (`FetchNews`, `GetNews`)
5.  CloudWatch Event Rule
6.  DynamoDB Table (`NewsArticles`)
7.  Cognito User Pool
8.  Associated IAM Roles and Policies
9.  CloudWatch Log Groups
10. CloudFront Origin Access Identity (OAI)

Refer to the [Implementation Guide](./implementation.md) for more specific pointers on resource names if needed during cleanup.

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
