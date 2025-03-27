import {
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class ZohoMailOAuth2Api implements ICredentialType {
    name = 'zohoMailOAuth2Api';
    extends = ['oAuth2Api'];
    displayName = 'Zoho Mail OAuth2';
    documentationUrl = 'https://www.zoho.com/mail/help/api/';

    properties: INodeProperties[] = [
        {
            displayName: 'Data Center',
            name: 'dataCenter',
            type: 'options',
            options: [
                { name: 'United States (.com)', value: 'com' },
                { name: 'Europe (.eu)', value: 'eu' },
                { name: 'India (.in)', value: 'in' },
                { name: 'Australia (.au)', value: 'au' },
                { name: 'Japan (.jp)', value: 'jp' },
            ],
            default: 'eu',
            required: true,
            description: 'Select the Zoho Data Center where your application is registered.',
        },
        {
            displayName: 'Authorization URL',
            name: 'authUrl',
            type: 'options',
            options: [
                {
                    name: 'https://accounts.zoho.com/oauth/v2/auth',
                    value: 'https://accounts.zoho.com/oauth/v2/auth',
                    description: 'For the EU, AU, and IN domains',
                },
                {
                    name: 'https://accounts.zoho.com.cn/oauth/v2/auth',
                    value: 'https://accounts.zoho.com.cn/oauth/v2/auth',
                    description: 'For the CN domain',
                },
            ],
            default: 'https://accounts.zoho.com/oauth/v2/auth',
            required: true,
        },
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'options',
            options: [
                {
                    name: 'AU - https://accounts.zoho.com.au/oauth/v2/token',
                    value: 'https://accounts.zoho.com.au/oauth/v2/token',
                },
                {
                    name: 'CN - https://accounts.zoho.com.cn/oauth/v2/token',
                    value: 'https://accounts.zoho.com.cn/oauth/v2/token',
                },
                {
                    name: 'EU - https://accounts.zoho.eu/oauth/v2/token',
                    value: 'https://accounts.zoho.eu/oauth/v2/token',
                },
                {
                    name: 'IN - https://accounts.zoho.in/oauth/v2/token',
                    value: 'https://accounts.zoho.in/oauth/v2/token',
                },
                {
                    name: 'US - https://accounts.zoho.com/oauth/v2/token',
                    value: 'https://accounts.zoho.com/oauth/v2/token',
                },
            ],
            default: 'https://accounts.zoho.com/oauth/v2/token',
            required: true,
        },
        {
            displayName: 'Scope',
            name: 'scope',
            type: 'hidden',
            default: 'ZohoMail.messages.ALL,ZohoMail.accounts.READ,ZohoMail.folders.ALL,ZohoMail.settings.ALL,ZohoContacts.userphoto.READ,ZohoContacts.contactapi.READ',
            required: true,
            description: 'Required API scopes',
        },
        {
            displayName: 'Auth URI Query Parameters',
            name: 'authQueryParameters',
            type: 'hidden',
            default: 'access_type=offline&prompt=consent',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'body',
        },
    ];
}