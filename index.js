module.exports = {
	// Nodes
	nodeTypes: [
		require('./dist/nodes/ZohoMail/ZohoMail.node').ZohoMail,
	],
	// Credentials
	credentialTypes: [
		require('./dist/credentials/ZohoMailOAuth2Api.credentials').ZohoMailOAuth2Api,
	],
}; 