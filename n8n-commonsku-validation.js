/**
 * CommonSKU Client Validation Function for n8n
 *
 * This function validates whether a client exists in the CommonSKU system.
 * Use this as an n8n Function node.
 *
 * Environment Variables Required:
 * - COMMONSKU_API_KEY: Your CommonSKU API key
 */

// API Configuration
const COMMONSKU_API_BASE = 'https://fws09sh894.execute-api.us-east-1.amazonaws.com/beta';
const COMMONSKU_API_KEY = '6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52';

/**
 * Validates if a client exists in CommonSKU by searching for the client name
 *
 * @param {string} clientName - The client name to search for
 * @returns {Object} - Validation result with client information
 */
async function validateClient(clientName) {
  try {
    // Encode the client name for URL
    const encodedName = encodeURIComponent(clientName);

    // Make API request to search for client
    const response = await fetch(
      `${COMMONSKU_API_BASE}/clients?client_name=${encodedName}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': COMMONSKU_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CommonSKU API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check if we found any clients
    if (data.data && data.data.length > 0) {
      // Client found - return the first exact match
      const client = data.data[0];

      return {
        exists: true,
        clientId: client.client_id,
        clientName: client.client_name,
        primaryContactEmail: client.primary_contact_email || null,
        industryName: client.industry_name || null,
        customerNumber: client.customer_number || null
      };
    } else {
      // No client found
      return {
        exists: false,
        clientName: "Not Listed"
      };
    }

  } catch (error) {
    console.error('Error validating client in CommonSKU:', error);

    // Return error state
    return {
      exists: false,
      clientName: "Not Listed",
      error: error.message
    };
  }
}

// For n8n Function node - execute the validation
const clientName = $input.item.json.clientName || $json.clientName;

if (!clientName) {
  return {
    error: 'No client name provided'
  };
}

// Execute validation
const result = await validateClient(clientName);

// Return result for n8n to use
return result;
