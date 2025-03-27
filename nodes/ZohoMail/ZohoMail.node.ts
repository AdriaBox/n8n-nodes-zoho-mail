import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IDataObject,
    INodePropertyOptions,
    ILoadOptionsFunctions,
    NodeConnectionType,
    IRequestOptions,
    IHttpRequestMethods,
    IHookFunctions,
} from 'n8n-workflow';

async function refreshZohoToken(
    this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
    credentials: IDataObject,
) {
    const dataCenter = credentials.dataCenter as string || 'com';
    const accessTokenUrl = `https://accounts.zoho.${dataCenter}/oauth/v2/token`;

    // Get refresh token from oauthTokenData
    const oauthTokenData = credentials.oauthTokenData as IDataObject;

    if (!oauthTokenData || !oauthTokenData.refresh_token) {
        throw new Error('Refresh token not found. Please reauthorize.');
    }

    // Construct URL with query parameters
    const queryParams = new URLSearchParams({
        refresh_token: String(oauthTokenData.refresh_token),
        grant_type: 'refresh_token',
        client_id: String(credentials.clientId),
        client_secret: String(credentials.clientSecret)
    });

    const fullUrl = `${accessTokenUrl}?${queryParams.toString()}`;

    const options: IRequestOptions = {
        method: 'POST',
        uri: fullUrl,
        json: true,
    };

    try {
        const response = await this.helpers.request(options);
        
        if (!response || !response.access_token) {
            throw new Error('Invalid response from Zoho API');
        }

        // Update oauthTokenData with new token
        const newTokenData = {
            access_token: response.access_token,
            expires_in: response.expires_in,
            expires_at: Date.now() + (response.expires_in * 1000),
            refresh_token: oauthTokenData.refresh_token // Keep existing refresh token
        };

        console.log('Zoho Mail Token Refresh!');

        // Update token in memory
        credentials.oauthTokenData = newTokenData;

        return response;
    } catch (error) {
        console.error('Error refreshing token:', error.message);
        throw error;
    }
}

async function zohoApiRequest(
    this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
    method: IHttpRequestMethods,
    endpoint: string,
    body: IDataObject = {},
    qs: IDataObject = {},
    uri?: string,
) {
    const credentials = await this.getCredentials('zohoMailOAuth2Api') as IDataObject;
    const dataCenter = credentials.dataCenter as string || 'com';
    const baseUrl = `https://mail.zoho.${dataCenter}`;

    const options: IRequestOptions = {
        method,
        uri: uri || `${baseUrl}${endpoint}`,
        qs,
        headers: {
            'Accept': 'application/json',
            'Authorization': `Zoho-oauthtoken ${(credentials.oauthTokenData as IDataObject).access_token}`,
        },
        json: true,
        ...(Object.keys(body).length > 0 && { body }),
    };

    try {
        const responseData = await this.helpers.request(options);
        return responseData;
    } catch (error) {
        // Provjeri je li greška 404 s INVALID_OAUTHTOKEN
        if (error.statusCode === 404 && 
            error.error.data.errorCode === 'INVALID_OAUTHTOKEN') {
            try {
                // Osvježi token
                const newTokenData = await refreshZohoToken.call(this, credentials);
                
                // Ažuriraj kredencijale s novim tokenom
                credentials.oauthTokenData = {
                    access_token: newTokenData.access_token,
                    expires_in: newTokenData.expires_in,
                    expires_at: Date.now() + (newTokenData.expires_in * 1000)
                };
                
                // Ponovi originalni zahtjev s novim tokenom
                options.headers = {
                    ...options.headers,
                    'Authorization': `Zoho-oauthtoken ${newTokenData.access_token}`,
                };
                
                return await this.helpers.request(options);
            } catch (refreshError) {
                console.error('Greška pri osvježavanju tokena:', refreshError);
                throw refreshError;
            }
        }

        throw error;
    }
}

export class ZohoMail implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Zoho Mail (OAuth2)',
        name: 'zohoMail',
        icon: 'file:zoho-mail.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Access Zoho Mail API using OAuth2 authentication with custom header support',
        defaults: {
            name: 'Zoho Mail',
            color: '#3d85c6',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'zohoMailOAuth2Api',
                required: true,
            },
        ],
        properties: [
            // ... (ostala svojstva ostaju ista kao u vašem originalnom kodu) ...
            // --- POČETAK SVOJSTAVA ---
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                options: [
                    { name: 'Message', value: 'message' },
                    { name: 'Folder', value: 'folder' },
                    { name: 'Account', value: 'account' }
                ],
                default: 'message',
                description: 'The resource to operate on',
                required: true,
            },
            { // Message Operations
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: { show: { resource: ['message'] } },
                options: [
                    { name: 'Get', value: 'get', description: 'Get a specific message', action: 'Get a specific message' },
                    { name: 'Get Many', value: 'getMany', description: 'Get many messages', action: 'Get many messages' },
                    { name: 'Send', value: 'send', description: 'Send a message', action: 'Send a message' },
                    { name: 'Save Draft', value: 'saveDraft', description: 'Save message as draft', action: 'Save message as draft' },
                ],
                default: 'get',
                description: 'The operation to perform',
                required: true,
            },
             { // Folder Operations
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: { show: { resource: ['folder'] } },
                options: [
                    { name: 'Get', value: 'get', description: 'Get a folder' },
                    { name: 'Get Many', value: 'getMany', description: 'Get many folders' },
                ],
                default: 'get',
                description: 'The operation to perform',
                required: true,
            },
            { // Account Operations
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                displayOptions: { show: { resource: ['account'] } },
                options: [
                    { name: 'Get', value: 'get', description: 'Get account details' },
                    { name: 'Get All', value: 'getAll', description: 'Get all user accounts' },
                ],
                default: 'get',
                description: 'The operation to perform',
                required: true,
            },
            { // Account ID (for Message/Folder)
                displayName: 'Account ID',
                name: 'accountId',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'getAccounts' },
                default: '',
                required: true,
                displayOptions: { show: { resource: ['message', 'folder'] } },
                description: 'The ID of the Zoho Mail account to use',
            },
            { // Account ID (for Account Get)
                displayName: 'Account ID',
                name: 'accountId',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'getAccounts' },
                default: '',
                required: true,
                displayOptions: { show: { resource: ['account'], operation: ['get'] } },
                description: 'The ID of the Zoho Mail account to get',
            },
            { // Message ID
                displayName: 'Message ID',
                name: 'messageId',
                type: 'string',
                displayOptions: { show: { resource: ['message'], operation: ['get'] } },
                default: '',
                required: true,
                description: 'The ID of the message to get',
            },
            { // Folder ID (for Folder/Message Get)
                displayName: 'Folder ID',
                name: 'folderId',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getFolders',
                    loadOptionsDependsOn: ['accountId'],
                },
                displayOptions: {
                    show: {
                        resource: ['folder', 'message'],
                        operation: ['get'], // Prikazuje se samo za 'Get' operaciju foldera ili poruke
                    },
                    // Možda ćete htjeti dodati i za 'getMany' poruka ako folderId dohvaćate ovdje
                    // show: {
                    //     resource: ['message'],
                    //     operation: ['getMany'],
                    // }
                 },
                default: '',
                // required: true, // Ovisno da li je uvijek obavezan ili opcionalan za getMany
                description: 'The ID of the folder',
            },
            { // Return All (for Message GetMany)
                displayName: 'Return All',
                name: 'returnAll',
                type: 'boolean',
                displayOptions: { show: { resource: ['message'], operation: ['getMany'] } },
                default: false,
                description: 'Whether to return all results or only up to a given limit',
            },
            { // Limit (for Message GetMany)
                displayName: 'Limit',
                name: 'limit',
                type: 'number',
                displayOptions: { show: { resource: ['message'], operation: ['getMany'], returnAll: [false] } },
                typeOptions: { minValue: 1, maxValue: 100 }, // Prilagodite maxValue prema API limitima
                default: 50,
                description: 'Max number of results to return',
            },
            { // From Address (for Send/SaveDraft)
                displayName: 'From Address',
                name: 'fromAddress',
                type: 'string',
                displayOptions: { show: { resource: ['message'], operation: ['send', 'saveDraft'] } },
                default: '',
                required: true,
                placeholder: 'sender@email.com',
                description: 'Email address of the sender',
            },
            { // To Email (for Send/SaveDraft)
                displayName: 'To Email',
                name: 'toEmail',
                type: 'string',
                displayOptions: { show: { resource: ['message'], operation: ['send', 'saveDraft'] } },
                default: '',
                required: true,
                placeholder: 'recipient@email.com',
                description: 'Email address of the recipient (comma-separated for multiple)',
            },
            { // Subject (for Send/SaveDraft)
                displayName: 'Subject',
                name: 'subject',
                type: 'string',
                displayOptions: { show: { resource: ['message'], operation: ['send', 'saveDraft'] } },
                default: '',
                required: true, // Ili false ako može biti prazan za draft
                description: 'Subject of the email',
            },
            { // Content (for Send/SaveDraft)
                displayName: 'Content',
                name: 'content',
                type: 'string',
                typeOptions: {rows: 5},
                displayOptions: { show: { resource: ['message'], operation: ['send', 'saveDraft'] } },
                default: '',
                required: true, // Ili false ako može biti prazan za draft
                description: 'Content of the email',
            },
            { // Additional Fields (for Send/SaveDraft)
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                displayOptions: { show: { resource: ['message'], operation: ['send', 'saveDraft'] } },
                default: {},
                options: [
                    { displayName: 'CC Email', name: 'ccEmail', type: 'string', default: '', placeholder: 'cc@email.com', description: 'Email address of CC recipient (comma-separated)' },
                    { displayName: 'BCC Email', name: 'bccEmail', type: 'string', default: '', placeholder: 'bcc@email.com', description: 'Email address of BCC recipient (comma-separated)' },
                    { displayName: 'From Name', name: 'fromName', type: 'string', default: '', description: 'Name of the sender' },
                    {
                        displayName: 'Mail Format',
                        name: 'mailFormat',
                        type: 'options',
                        options: [ { name: 'HTML', value: 'html' }, { name: 'Plain Text', value: 'plaintext' } ],
                        default: 'html',
                        description: 'Format of the email content',
                    },
                    // Dodajte ostala opcionalna polja po potrebi (npr. replyTo, inReplyTo, ...)
                ],
            },
            { // Additional Fields (for Message GetMany)
                displayName: 'Filters / Options',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Option',
                displayOptions: { show: { resource: ['message'], operation: ['getMany'] } },
                default: {},
                options: [
                    {
                        displayName: 'Folder ID',
                        name: 'folderId',
                        type: 'options', // Koristite 'options' ako želite dropdown
                        typeOptions: {
                            loadOptionsMethod: 'getFolders',
                            loadOptionsDependsOn: ['accountId'],
                         },
                        // Ili type: 'string' ako korisnik unosi ID ručno
                        // type: 'string',
                        default: '',
                        description: 'ID of the folder to get messages from (defaults to Inbox if not specified)',
                    },
                    { displayName: 'Status', name: 'status', type: 'string', default: 'unread', description: 'e.g., unread, read, starred, unstarred, draft, sent' },
                    { displayName: 'From Contains', name: 'from', type: 'string', default: '', description: 'Filter by sender email address' },
                    { displayName: 'To Contains', name: 'to', type: 'string', default: '', description: 'Filter by recipient email address' },
                    { displayName: 'Subject Contains', name: 'subject', type: 'string', default: '', description: 'Filter by subject' },
                    { displayName: 'Content Contains', name: 'content', type: 'string', default: '', description: 'Filter by email content' },
                    { displayName: 'Sort By', name: 'sortby', type: 'options', options:[{name:'Received Time', value:'receivedTime'}, {name:'Sent Time', value:'sentTime'}], default: 'receivedTime' },
                    { displayName: 'Sort Order', name: 'sortorder', type: 'options', options:[{name:'Ascending', value:'asc'}, {name:'Descending', value:'desc'}], default: 'desc' },
                    // { displayName: 'Threaded Mails', name: 'threadedMails', type: 'boolean', default: true, description: 'Group messages into threads' }, // Provjeriti API doc za točan query param
                    // { displayName: 'Include To', name: 'includeTo', type: 'boolean', default: true, description: 'Include recipients in the result' }, // Provjeriti API doc
                    // Dodajte ostale filtere prema Zoho API dokumentaciji (searchKey, query,...)
                ],
            },
            // --- KRAJ SVOJSTAVA ---
        ],
    };

    // Premještamo methods izvan description objekta
    methods = {
        loadOptions: {
            async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const returnData: INodePropertyOptions[] = [];
                try {
                    const credentials = await this.getCredentials('zohoMailOAuth2Api') as IDataObject;
                    // Check if token exists before fetching accounts
                    if (!credentials || !credentials.oauthTokenData || !(credentials.oauthTokenData as IDataObject).access_token) {
                         console.warn('Cannot fetch accounts, OAuth2 token is missing.');
                         return [{ name: 'Connect Account First', value: '' }];
                    }
                    const dataCenter = credentials.dataCenter as string || 'com';
                    const baseUrl = `https://mail.zoho.${dataCenter}`;

                    const options: IRequestOptions = {
                        method: 'GET',
                        uri: `${baseUrl}/api/accounts`,
                        headers: {
                            'Accept': 'application/json',
                            // Use access token directly from credentials object
                            'Authorization': `Zoho-oauthtoken ${(credentials.oauthTokenData as IDataObject).access_token}`,
                        },
                        json: true,
                    };

                    const response = await this.helpers.request!(options);

                    if (response?.data && Array.isArray(response.data)) {
                        for (const account of response.data) {
                            if (account.mailboxAddress && account.accountId) {
                                returnData.push({
                                    name: account.mailboxAddress as string,
                                    value: (account.accountId as number | string).toString(), // Ensure it's a string
                                });
                            }
                        }
                    } else {
                         console.warn('No accounts found or unexpected API response:', response);
                    }
                } catch (error) {
                    // Catch error if token expires or is invalid during options loading
                    console.error('Error fetching Zoho Mail accounts:', error.message);
                    // Return message to user in dropdown
                     return [{ name: 'Error fetching accounts - check credentials', value: '' }];
                }
                if (returnData.length === 0) {
                     returnData.push({ name: 'No accounts found', value: '' });
                }
                return returnData;
            },

            async getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const returnData: INodePropertyOptions[] = [];
                const accountId = this.getCurrentNodeParameter('accountId') as string;

                if (!accountId) {
                     // Don't return error, just empty array or message
                     // as user might not have selected account yet
                     return [{ name: 'Select Account ID First', value: '' }];
                }

                try {
                    const credentials = await this.getCredentials('zohoMailOAuth2Api') as IDataObject;
                     if (!credentials || !credentials.oauthTokenData || !(credentials.oauthTokenData as IDataObject).access_token) {
                         console.warn('Cannot fetch folders, OAuth2 token is missing.');
                         return [{ name: 'Connect Account First', value: '' }];
                    }
                    const dataCenter = credentials.dataCenter as string || 'com';
                    const baseUrl = `https://mail.zoho.${dataCenter}`;

                    const options: IRequestOptions = {
                        method: 'GET',
                        uri: `${baseUrl}/api/accounts/${accountId}/folders`,
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Zoho-oauthtoken ${(credentials.oauthTokenData as IDataObject).access_token}`,
                        },
                        json: true,
                    };

                    const response = await this.helpers.request!(options);

                    if (response?.data && Array.isArray(response.data)) {
                        for (const folder of response.data) {
                            if (folder.folderName && folder.folderId) {
                                returnData.push({
                                    name: `${folder.folderName}`, // Add unread count for easier navigation
                                    value: (folder.folderId as number | string).toString(),
                                });
                            }
                        }
                         // Sort folders alphabetically for better readability
                         returnData.sort((a, b) => a.name.localeCompare(b.name));
                    } else {
                         console.warn(`No folders found for account ${accountId} or unexpected API response:`, response);
                    }

                } catch (error) {
                    console.error(`Error fetching folders for account ${accountId}:`, error.message);
                    return [{ name: 'Error fetching folders', value: '' }];
                }

                if (returnData.length === 0) {
                    returnData.push({ name: 'No folders found', value: '' });
                }

                return returnData;
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const resource = this.getNodeParameter('resource', i) as string;
                const operation = this.getNodeParameter('operation', i) as string;

                let endpoint = '';
                let method = '';
                const body: IDataObject = {};
                const qs: IDataObject = {};

                let accountId = '';
                // Get accountId if needed for resource/operation
                if (['message', 'folder'].includes(resource) || (resource === 'account' && operation === 'get')) {
                    try {
                        accountId = this.getNodeParameter('accountId', i) as string;
                        if (!accountId) {
                             throw new Error(`Account ID is required for resource '${resource}' and operation '${operation}'.`);
                        }
                    } catch (error) {
                         // Error if Account ID is not found or not set
                         throw new Error(`Cannot get Account ID: ${error.message}`);
                    }
                }

                // --- Define Endpoints, Methods, Body and QS ---
                if (resource === 'message') {
                    if (operation === 'get') {
                        const folderId = this.getNodeParameter('folderId', i) as string;
                        const messageId = this.getNodeParameter('messageId', i) as string;
                        if (!folderId || !messageId) throw new Error('Folder ID and Message ID are required for fetching message.');
                        method = 'GET';
                        endpoint = `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`; // or just /messages/{messageId} depending on API
                    } else if (operation === 'getMany') {
                        endpoint = `/api/accounts/${accountId}/messages/view`; // Check exact endpoint for message view
                        method = 'GET';
                        const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

                        // Query parameters for filtering and pagination
                         qs.limit = returnAll ? 100 : (this.getNodeParameter('limit', i, 50) as number); // Set default limit, Zoho max is often 100
                         qs.start = 1; // Start from first page

                         // Apply filters from additionalFields
                         if (additionalFields.folderId) qs.folderId = additionalFields.folderId;
                         if (additionalFields.status) qs.status = additionalFields.status;
                         if (additionalFields.from) qs.from = additionalFields.from;
                         if (additionalFields.to) qs.to = additionalFields.to;
                         if (additionalFields.subject) qs.subject = additionalFields.subject;
                         if (additionalFields.content) qs.content = additionalFields.content;
                         if (additionalFields.sortby) qs.sortby = additionalFields.sortby;
                         if (additionalFields.sortorder) qs.sortorder = additionalFields.sortorder;
                         // Add other parameters...

                    } else if (operation === 'send' || operation === 'saveDraft') {
                        endpoint = `/api/accounts/${accountId}/messages`;
                        method = 'POST';
                        const fromAddress = this.getNodeParameter('fromAddress', i) as string;
                        const toEmail = this.getNodeParameter('toEmail', i) as string;
                        const subject = this.getNodeParameter('subject', i) as string;
                        const content = this.getNodeParameter('content', i) as string;
                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

                        if (!fromAddress || !toEmail) throw new Error('From and To addresses are required.');

                        body.fromAddress = fromAddress;
                        body.toAddress = toEmail; // Zoho API usually supports comma-separated addresses
                        body.subject = subject;
                        body.content = content;
                        body.mailFormat = additionalFields.mailFormat || 'html'; // Default to HTML

                        if (operation === 'saveDraft') body.mode = 'draft'; // Check exact parameter for saving draft
                        if (additionalFields.ccEmail) body.ccAddress = additionalFields.ccEmail;
                        if (additionalFields.bccEmail) body.bccAddress = additionalFields.bccEmail;
                        if (additionalFields.fromName) body.fromName = additionalFields.fromName; // Check if API supports 'fromName' or goes in fromAddress (e.g. "Name <email@domain.com>")
                    }
                } else if (resource === 'folder') {
                    if (operation === 'get') {
                        const folderId = this.getNodeParameter('folderId', i) as string;
                        if (!folderId) throw new Error('Folder ID is required for fetching folder.');
                        endpoint = `/api/accounts/${accountId}/folders/${folderId}`;
                        method = 'GET';
                    } else if (operation === 'getMany') {
                        endpoint = `/api/accounts/${accountId}/folders`;
                        method = 'GET';
                        // Add QS parameters for folders if they exist (e.g. parentFolderId)
                    }
                } else if (resource === 'account') {
                    if (operation === 'get') {
                        // accountId is already fetched at the start of the loop
                        endpoint = `/api/accounts/${accountId}`;
                        method = 'GET';
                    } else if (operation === 'getAll') {
                        endpoint = '/api/accounts';
                        method = 'GET';
                    }
                }
                 // --- End of definition ---

                if (!endpoint || !method) {
                    throw new Error(`Unsupported combination of resource '${resource}' and operation '${operation}'.`);
                }

                // Use zohoApiRequest instead of direct call
                const responseData = await zohoApiRequest.call(
                    this,
                    method as IHttpRequestMethods,
                    endpoint,
                    body,
                    qs,
                );

                // Structure return data
                const executionData = Array.isArray(responseData) ? responseData : [responseData];

                executionData.forEach(item => {
                    returnData.push({
                        json: item,
                        pairedItem: { item: i },
                    });
                });

            } catch (error) {
                console.error(`Error executing for item ${i}:`, error.message);
                 if (error.response) {
                      console.error('   - API Response Status:', error.response.statusCode);
                      console.error('   - API Response Body:', error.response.body);
                 }
                 // If error is related to authentication (e.g. 401), provide more specific message
                 if (error.statusCode === 401 || (error.message && error.message.toLowerCase().includes('token'))) {
                      error.message = `Authentication error: ${error.message}. Please check if token is valid or try to reauthorize.`;
                 }

                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message, details: error.response?.body },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}