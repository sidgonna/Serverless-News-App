---

# Serverless News Aggregator (Updated)

This project implements a serverless news aggregator using AWS services. It fetches news articles from RSS feeds, stores them in DynamoDB, exposes them via a secured API Gateway endpoint, and displays them on a static website hosted on S3 and delivered via CloudFront with HTTPS. User authentication is handled by Amazon Cognito using a manual OAuth 2.0 PKCE flow implemented in the frontend JavaScript.

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
    *   [Step 9: Build and Deploy Frontend (Manual Cognito Integration)](#step-9-build-and-deploy-frontend-manual-cognito-integration)
*   [Testing and Monitoring](#testing-and-monitoring)
*   [Cleanup (Optional)](#cleanup-optional)
*   [Resources](#resources)

## Prerequisites

*   AWS account with access to Lambda, DynamoDB, API Gateway, S3, CloudFront, Cognito, and CloudWatch.
*   Basic knowledge of Python, HTML, CSS, JavaScript, and AWS console usage.
*   Basic understanding of OAuth 2.0 Authorization Code Grant with PKCE.
*   AWS CLI installed and configured (`aws configure`).
*   Node.js and npm installed (optional, useful for managing dependencies like Axios or using bundlers).
*   A registered domain name (optional, but recommended for CloudFront with a custom SSL certificate).
*   `axios` library (can be included via CDN or installed via npm).

## Architecture

The architecture consists of the following components:

*   **AWS Lambda (`FetchNews`)**: Periodically fetches news from configured RSS feeds.
*   **AWS DynamoDB (`NewsArticles`)**: Stores the fetched news articles.
*   **AWS CloudWatch Events**: Triggers the `FetchNews` Lambda function on a schedule.
*   **AWS Lambda (`GetNews`)**: Retrieves news articles from DynamoDB.
*   **AWS Cognito User Pool**: Manages user sign-up, sign-in, and token issuance.
*   **AWS API Gateway (HTTP API)**: Exposes the `GetNews` Lambda function and secures it using a Cognito Authorizer.
*   **AWS S3**: Hosts the static frontend website files (HTML, CSS, JS).
*   **AWS CloudFront**: Distributes the S3 content, provides HTTPS, and improves performance.
*   **Frontend (HTML/CSS/JS)**: A static single-page application that manually implements the OAuth 2.0 PKCE flow with Cognito for authentication and calls the secured API Gateway endpoint using fetched tokens to display news.

```mermaid
graph LR
    CloudWatchEvents[CloudWatch Events] --> LambdaFetch[Lambda (FetchNews)]
    LambdaFetch --> DynamoDB[DynamoDB (NewsArticles)]
    API_Gateway[API Gateway] --> LambdaGet[Lambda (GetNews)]
    LambdaGet --> DynamoDB
    Cognito[Cognito User Pool] --> API_Gateway
    Frontend[Frontend (HTML/CSS/JS)] -->|Login Redirect| Cognito
    Cognito -->|Redirect w/ Code| Frontend
    Frontend -->|Token Request| Cognito
    Cognito -->|Tokens| Frontend
    Frontend -->|API Call w/ Token| API_Gateway
    S3[S3 Bucket] --> CloudFront[CloudFront Distribution]
    CloudFront --> Frontend
    User[User] --> CloudFront
```

## Implementation Steps

Follow these steps to set up the serverless news aggregator.

*(Steps 1-8 remain identical to the previous plan, focusing on setting up the backend infrastructure: DynamoDB, Lambdas, CloudWatch, Cognito Pool, API Gateway, S3 Bucket, and CloudFront Distribution. Ensure Cognito App Client is configured for Authorization Code Grant and as a Public Client, and API Gateway uses the Cognito Authorizer and has correct CORS settings.)*

---

**(Step 1: Set Up DynamoDB Table)** - *Same as before*
**(Step 2: Create Lambda Function for News Fetching)** - *Same as before*
**(Step 3: Schedule News Fetching with CloudWatch Events)** - *Same as before*
**(Step 4: Create Lambda Function for API)** - *Same as before*
**(Step 5: Set Up Cognito User Pool)** - *Same as before - Ensure App Client has **Authorization Code Grant** enabled, is a **Public Client**, and **Callback/Logout URLs** match your CloudFront domain.*
**(Step 6: Set Up API Gateway with Cognito Authorizer)** - *Same as before - Ensure **Authorizer** uses correct User Pool/Client ID, is attached to `/articles`, and **CORS** allows CloudFront origin + `Authorization` header.*
**(Step 7: Set Up S3 for Website Hosting)** - *Same as before*
**(Step 8: Set Up CloudFront Distribution for HTTPS)** - *Same as before*

---

### Step 9: Build and Deploy Frontend (Manual Cognito Integration)

Create a static frontend (HTML, CSS, JavaScript) that manually handles the Cognito authentication flow (OAuth 2.0 PKCE) and fetches articles from the secured API Gateway endpoint.

1.  **Create Project Files:**
    *   Create a directory, e.g., `news-aggregator-frontend-manual`.
    *   Inside, create:
        *   `index.html` (Main page structure)
        *   `style.css` (Styling)
        *   `config.js` (Cognito and API configuration)
        *   `app.js` (Authentication logic and API calls)

2.  **Configure Frontend (`config.js`):**
    *   Create `config.js` and populate it with your specific AWS resource details. **Replace ALL placeholders.**

    ```javascript
    // config.js
    const config = {
        cognito: {
            userPoolId: 'YOUR_USER_POOL_ID', // From Step 5
            clientId: 'YOUR_APP_CLIENT_ID', // From Step 5
            // Domain looks like: your-prefix.auth.your-region.amazoncognito.com
            domain: 'YOUR_COGNITO_DOMAIN', // From Step 5 (App Integration -> Domain)
            // Your CloudFront HTTPS URL - must match exactly what's in Cognito App Client settings
            redirectUri: 'https://YOUR_CLOUDFRONT_DOMAIN_NAME/', // From Step 8
             // Your CloudFront HTTPS URL - must match Cognito App Client logout URL(s)
            logoutUri: 'https://YOUR_CLOUDFRONT_DOMAIN_NAME/',
            region: 'YOUR_REGION' // e.g., 'us-east-1'
        },
        api: {
            // Full Invoke URL for your API stage (e.g., ...execute-api.us-east-1.amazonaws.com/prod)
            invokeUrl: 'https://YOUR_API_GATEWAY_INVOKE_URL/prod' // From Step 6
        }
    };
    ```

3.  **Create HTML (`index.html`):**
    *   Set up the basic structure for login/logout buttons, user info display, and the news article section.

    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Serverless News Aggregator</title>
        <link rel="stylesheet" href="style.css">
    </head>
    <body>
        <div class="container">
            <h1>Serverless News Aggregator</h1>

            <div id="auth-section">
                <p id="auth-message">Please log in to see the news.</p>
                <button id="login-button">Log In</button>
                <button id="logout-button" style="display: none;">Log Out</button>
            </div>

            <div id="user-info" style="display: none;">
                <p>Welcome, <span id="user-email"></span>!</p>
            </div>

            <hr>

            <div id="news-section" style="display: none;">
                <h2>Latest News</h2>
                <div id="articles-container">
                    <!-- Articles will be loaded here by app.js -->
                </div>
                <p id="loading-message" style="display: none;">Loading articles...</p>
                <p id="error-message" style="display: none; color: red;"></p>
            </div>
        </div>

        <!-- Include Axios via CDN (simplest) -->
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        <!-- Include your config first, then the app logic -->
        <script src="config.js"></script>
        <script src="app.js"></script>
    </body>
    </html>
    ```

4.  **Add Styling (`style.css`):**
    *   Add basic CSS rules for layout and appearance.

    ```css
    /* style.css */
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        background-color: #f8f9fa;
        line-height: 1.6;
        color: #212529;
    }
    .container {
        max-width: 800px;
        margin: 30px auto;
        padding: 25px;
        background-color: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
    }
    h1, h2 {
        text-align: center;
        color: #343a40;
        margin-bottom: 1.5rem;
    }
    #auth-section, #user-info {
        text-align: center;
        margin-bottom: 25px;
        padding: 15px;
        background-color: #e9ecef;
        border-radius: 4px;
    }
    button {
        padding: 10px 20px;
        background-color: #0d6efd;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        margin: 5px;
        transition: background-color 0.2s ease-in-out;
    }
    button:hover {
        background-color: #0b5ed7;
    }
    #logout-button {
        background-color: #dc3545;
    }
    #logout-button:hover {
        background-color: #bb2d3b;
    }
    hr {
        margin: 25px 0;
        border: 0;
        border-top: 1px solid #dee2e6;
    }
    #news-section {
        margin-top: 25px;
    }
    .article {
        border: 1px solid #dee2e6;
        padding: 20px;
        margin-bottom: 20px;
        border-radius: 5px;
        background-color: #ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .article h3 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        color: #0d6efd;
        font-size: 1.25rem;
    }
    .article p {
        margin-bottom: 0.5rem;
        color: #495057;
    }
    .article a {
        color: #0d6efd;
        text-decoration: none;
        font-weight: 500;
    }
    .article a:hover {
        text-decoration: underline;
    }
    .article-meta {
        font-size: 0.875em;
        color: #6c757d;
    }
     #loading-message, #error-message {
        text-align: center;
        padding: 10px;
        margin-top: 15px;
        border-radius: 4px;
    }
    #loading-message {
        color: #0dcaf0;
        background-color: #cff4fc;
        border: 1px solid #b6effb;
    }
    #error-message {
        color: #dc3545;
        background-color: #f8d7da;
        border: 1px solid #f5c2c7;
    }
    ```

5.  **Implement JavaScript Logic (`app.js`):**
    *   Add the code to handle the OAuth 2.0 PKCE flow and API interactions.

    ```javascript
    // app.js

    // --- Configuration (Ensure config.js is loaded first) ---
    const cognitoConfig = config.cognito;
    const apiConfig = config.api;

    // --- DOM Elements ---
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const authMessage = document.getElementById('auth-message');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const newsSection = document.getElementById('news-section');
    const articlesContainer = document.getElementById('articles-container');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');

    // --- PKCE Helper Functions ---
    function generateCodeVerifier() {
        const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
        return base64UrlEncode(randomBytes);
    }

    async function generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return base64UrlEncode(new Uint8Array(hashBuffer));
    }

    function base64UrlEncode(byteArray) {
        let base64 = btoa(String.fromCharCode.apply(null, byteArray));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    // --- Authentication Functions ---
    async function redirectToCognito() {
        try {
            const codeVerifier = generateCodeVerifier();
            sessionStorage.setItem('pkce_code_verifier', codeVerifier);
            const codeChallenge = await generateCodeChallenge(codeVerifier);

            const params = new URLSearchParams({
                response_type: 'code',
                client_id: cognitoConfig.clientId,
                redirect_uri: cognitoConfig.redirectUri,
                scope: 'openid email profile', // Ensure these scopes are enabled in Cognito App Client
                code_challenge: codeChallenge,
                code_challenge_method: 'S256'
            });

            const authorizeUrl = `https://${cognitoConfig.domain}/oauth2/authorize?${params.toString()}`;
            window.location.assign(authorizeUrl);
        } catch (error) {
            console.error("Error preparing for Cognito redirect:", error);
            setError("Could not initiate login. Please try again.");
        }
    }

    async function handleAuthentication() {
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');

        // Clean params from URL
        window.history.replaceState({}, document.title, window.location.pathname);

        if (authCode) {
            setLoading(true); // Show loading while exchanging code
            authMessage.style.display = 'none'; // Hide initial message
            loginButton.style.display = 'none'; // Hide login button

            try {
                const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
                if (!codeVerifier) throw new Error("PKCE code verifier missing from session storage.");
                sessionStorage.removeItem('pkce_code_verifier');

                const tokenEndpoint = `https://${cognitoConfig.domain}/oauth2/token`;
                const tokenParams = new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: cognitoConfig.clientId,
                    code: authCode,
                    redirect_uri: cognitoConfig.redirectUri,
                    code_verifier: codeVerifier
                });

                const response = await fetch(tokenEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: tokenParams.toString()
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Token exchange failed: ${errorData.error_description || response.statusText}`);
                }

                const tokens = await response.json();
                sessionStorage.setItem('id_token', tokens.id_token);
                sessionStorage.setItem('access_token', tokens.access_token);
                // Optional: Store refresh_token for automatic refresh logic

                updateUI(true);
                await fetchArticles(); // Fetch articles *after* successful login

            } catch (error) {
                console.error("Authentication error:", error);
                setError(`Authentication failed: ${error.message}. Please try logging in again.`);
                updateUI(false); // Show login button again
            } finally {
                setLoading(false);
            }
        } else {
            // Check if already logged in (tokens in storage)
            const idToken = sessionStorage.getItem('id_token');
            if (idToken && isTokenValid(idToken)) { // Add token validation
                updateUI(true);
                await fetchArticles(); // Fetch articles if already logged in
            } else {
                // Clear potentially expired tokens
                sessionStorage.removeItem('id_token');
                sessionStorage.removeItem('access_token');
                updateUI(false); // Not logged in or token expired
            }
        }
    }

    function isTokenValid(token) {
        if (!token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            return Date.now() < expiry;
        } catch (e) {
            console.error("Error decoding or validating token:", e);
            return false;
        }
    }

    function logout() {
        sessionStorage.removeItem('id_token');
        sessionStorage.removeItem('access_token');

        const params = new URLSearchParams({
            client_id: cognitoConfig.clientId,
            logout_uri: cognitoConfig.logoutUri
        });
        const logoutUrl = `https://${cognitoConfig.domain}/logout?${params.toString()}`;
        window.location.assign(logoutUrl);
    }

    // --- API Call Function ---
    async function fetchArticles() {
        const idToken = sessionStorage.getItem('id_token');
        if (!idToken || !isTokenValid(idToken)) {
             setError("Your session has expired or is invalid. Please log in again.");
             updateUI(false); // Force re-login state
             setLoading(false);
             return;
        }

        setLoading(true);
        setError(null);
        articlesContainer.innerHTML = '';

        try {
            // Use axios if included, otherwise use fetch
            const response = await axios.get(`${apiConfig.invokeUrl}/articles`, {
                headers: {
                    Authorization: `Bearer ${idToken}` // Send ID token
                }
            });
             // Check if response.data exists and is an array
             if (Array.isArray(response.data)) {
                displayArticles(response.data);
             } else {
                 console.error("API response is not an array:", response.data);
                 setError("Received unexpected data format from the server.");
             }
        } catch (error) {
            console.error("Error fetching articles:", error);
            if (error.response) {
                 // The request was made and the server responded with a status code
                 // that falls out of the range of 2xx
                 if (error.response.status === 401 || error.response.status === 403) {
                     setError("Authentication failed or session expired. Please log in again.");
                     updateUI(false); // Force re-login state
                 } else {
                      setError(`Failed to fetch articles: Server responded with status ${error.response.status}.`);
                 }
            } else if (error.request) {
                // The request was made but no response was received
                 setError("Failed to fetch articles: No response from server. Check network connection.");
            } else {
                // Something happened in setting up the request that triggered an Error
                setError(`Failed to fetch articles: ${error.message}.`);
            }
        } finally {
            setLoading(false);
        }
    }

    // --- UI Update Functions ---
    function updateUI(isLoggedIn) {
        if (isLoggedIn) {
            authMessage.style.display = 'none';
            loginButton.style.display = 'none';
            logoutButton.style.display = 'inline-block'; // Use inline-block for buttons
            newsSection.style.display = 'block';
            userInfo.style.display = 'block';

            try {
                const idToken = sessionStorage.getItem('id_token');
                const payload = JSON.parse(atob(idToken.split('.')[1]));
                userEmail.textContent = payload.email || 'user';
            } catch (e) {
                console.error("Error decoding token for display:", e);
                userEmail.textContent = 'user';
            }
        } else {
            authMessage.style.display = 'block';
            loginButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            newsSection.style.display = 'none';
            articlesContainer.innerHTML = '';
            userInfo.style.display = 'none';
            userEmail.textContent = '';
        }
         // Clear loading/error messages when UI state changes significantly
        setLoading(false);
        setError(null);
    }

    function displayArticles(articles) {
        articlesContainer.innerHTML = ''; // Clear previous
        if (!articles || articles.length === 0) {
            articlesContainer.innerHTML = '<p>No articles available right now.</p>';
            return;
        }

        articles.forEach(article => {
            const articleDiv = document.createElement('div');
            articleDiv.className = 'article';
            // Sanitize content minimally - consider a proper sanitization library for production
            const title = article.Title ? article.Title.replace(/<[^>]*>/g, '') : 'No Title';
            const description = article.Description ? article.Description.replace(/<[^>]*>/g, '') : 'No Description';
            const source = article.Source ? article.Source.replace(/<[^>]*>/g, '') : 'Unknown';
            const pubDate = article.PubDate ? new Date(article.PubDate).toLocaleString() : 'N/A';
            const link = article.Link || '#';

            articleDiv.innerHTML = `
                <h3>${title}</h3>
                <p>${description}</p>
                <p class="article-meta">
                    <strong>Source:</strong> ${source} |
                    <strong>Published:</strong> ${pubDate}
                </p>
                <a href="${link}" target="_blank" rel="noopener noreferrer">Read More</a>
            `;
            articlesContainer.appendChild(articleDiv);
        });
    }

    function setLoading(isLoading) {
        loadingMessage.style.display = isLoading ? 'block' : 'none';
        if (isLoading) errorMessage.style.display = 'none';
    }

    function setError(message) {
        errorMessage.textContent = message || '';
        errorMessage.style.display = message ? 'block' : 'none';
        if (message) loadingMessage.style.display = 'none';
    }

    // --- Initialization ---
    loginButton.addEventListener('click', redirectToCognito);
    logoutButton.addEventListener('click', logout);

    // Handle authentication state when the page loads
    document.addEventListener('DOMContentLoaded', handleAuthentication);
    ```

6.  **Deploy Frontend Files:**
    *   Copy the four files (`index.html`, `style.css`, `config.js`, `app.js`) to your S3 bucket configured for static website hosting (Step 7). Use the AWS CLI `sync` command for efficiency.
        ```bash
        # Navigate to your frontend project directory in the terminal
        cd news-aggregator-frontend-manual

        # Sync files to S3 (replace BUCKET_NAME)
        aws s3 sync . s3://YOUR_S3_BUCKET_NAME/ --delete
        ```
    *   The `--delete` flag ensures files removed locally are also removed from the bucket.

7.  **Invalidate CloudFront Cache:**
    *   After deploying new frontend code, invalidate the CloudFront cache (Step 8) to ensure users get the latest version.
    *   Create an invalidation for `/index.html`, `/style.css`, `/config.js`, `/app.js` (or simply `/*`).

## Testing and Monitoring

1.  **Test Cognito Authentication:** Access your CloudFront HTTPS URL.
    *   Click the "Log In" button. You should be redirected to the Cognito Hosted UI.
    *   Sign up for a new account (if enabled) or sign in with existing credentials.
    *   You should be redirected back to your CloudFront URL.
2.  **Test News Display:** After successful login and redirect, the `app.js` script should:
    *   Exchange the authorization code for tokens.
    *   Update the UI to show "Welcome, [email]!" and the "Log Out" button.
    *   Call the API Gateway endpoint `/articles` with the ID token.
    *   Display the fetched articles or an appropriate message ("No articles found.", "Loading...", error message).
    *   Check the browser's developer console (F12) for any JavaScript errors or network request failures.
3.  **Test Logout:** Click the "Log Out" button. You should be redirected to Cognito's logout endpoint and then back to your site's configured logout URL (your CloudFront URL), appearing logged out.
4.  **Test API Security:** Use `curl` or a tool like Postman to directly call your API Gateway `/articles` endpoint *without* a valid `Authorization: Bearer <ID_TOKEN>` header. Verify you receive a `401 Unauthorized` or `403 Forbidden` response.
5.  **Test News Fetching:** Trigger the `FetchNews` Lambda manually or wait for the schedule. Check DynamoDB and CloudWatch Logs for the `FetchNews` function.
6.  **Monitor:** Use CloudWatch Logs (for Lambdas), API Gateway Logs/Metrics, and CloudFront Metrics as described previously.

## Cleanup (Optional)

*(Same as before)* - Follow the steps to delete CloudFront, S3, API Gateway, Lambdas, CloudWatch Rule, DynamoDB table, Cognito User Pool, IAM Roles/Policies, and OAI to avoid costs.

## Resources

*   [AWS Lambda Documentation](https://aws.amazon.com/lambda/getting-started/)
*   [Amazon DynamoDB Documentation](https://aws.amazon.com/dynamodb/getting-started/)
*   [Amazon API Gateway Documentation](https://aws.amazon.com/api-gateway/getting-started/)
*   [Amazon S3 Documentation](https://aws.amazon.com/s3/getting-started/)
*   [Amazon CloudFront Documentation](https://aws.amazon.com/cloudfront/getting-started/)
*   [Amazon Cognito Documentation](https://aws.amazon.com/cognito/getting-started/)
*   [OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
*   [Proof Key for Code Exchange (PKCE)](https://tools.ietf.org/html/rfc7636)
*   [feedparser Documentation](https://feedparser.readthedocs.io/en/latest/)

---
