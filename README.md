# Zoho Mail OAuth2 Integration for n8n

This integration enables the use of the Zoho Mail API through OAuth2 authentication in the n8n platform.

## Installation

### Using npm

```bash
npm install n8n-nodes-zoho-mail -g
```

### Locally

1. Clone this repository into the `~/.n8n/custom` directory:
   ```bash
   mkdir -p ~/.n8n/custom
   git clone https://github.com/YOUR_USERNAME/n8n-nodes-zoho-mail.git ~/.n8n/custom/
   ```

2. Install dependencies:
   ```bash
   cd ~/.n8n/custom/n8n-nodes-zoho-mail
   npm install
   ```

3. Build the code:
   ```bash
   npm run build
   ```

4. Restart n8n:
   ```bash
   n8n restart
   ```

### Using n8n CLI

```bash
n8n-node-dev install n8n-nodes-zoho-mail
```

## Configuration

Before using this node, you need to create an application in the Zoho Developer Console:

1. Go to [Zoho Developer Console](https://api-console.zoho.com/)
2. Create a new application (Server-based)
3. Add a redirect URL that matches your n8n installation (e.g., `https://your-n8n-url.com/rest/oauth2-credential/callback`)
4. Note down the Client ID and Client Secret

Then, in the n8n user interface:

1. Go to Settings → Credentials
2. Click "Add Credentials"
3. Select "Zoho Mail OAuth2"
4. Enter Client ID, Client Secret, and other details
5. Click "Generate Authorization URL" and follow the OAuth2 authentication process

## Usage

After setting up the credentials, you can use the Zoho Mail node in your workflow:

1. Add a "Zoho Mail" node to your workflow
2. Select the resource and operation (e.g., Message → Get Many)
3. Enter required parameters
4. Connect with other nodes

## Available Operations

### Message
- Get: Fetch a single message
- Get Many: Fetch multiple messages
- Send: Send a new message
- Save Draft: Save a message as draft

### Folder
- Get: Get folder information
- Get Many: Get list of folders

### Account
- Get: Get account information
- Get All: Get all user accounts

## Known Issues

### Token Refresh
Currently, there is a limitation with token refresh functionality. When the access token expires, you will need to manually reauthorize the connection through the n8n interface. The automatic token refresh is only triggered when receiving a 404 error with "INVALID_OAUTHTOKEN" status.

To reauthorize:
1. Go to Settings → Credentials
2. Find your Zoho Mail credentials
3. Click "Reauthorize"
4. Follow the OAuth2 authentication process

## Usage Examples

### Fetching Messages

```json
{
  "resource": "message",
  "operation": "getMany",
  "accountId": "your-account-id",
  "limit": 10
}
```

### Sending a Message

```json
{
  "resource": "message",
  "operation": "send",
  "accountId": "your-account-id",
  "subject": "Test Message",
  "content": "This is a test message",
  "toEmail": "recipient@example.com"
}
```

### Saving a Draft

```json
{
  "resource": "message",
  "operation": "saveDraft",
  "accountId": "your-account-id",
  "subject": "Draft Message",
  "content": "This is a draft message",
  "toEmail": "recipient@example.com"
}
```

## API Documentation

For more information about available API calls, parameters, and responses, please refer to the [Zoho Mail API documentation](https://www.zoho.com/mail/help/api/).

## License

[MIT](LICENSE) 