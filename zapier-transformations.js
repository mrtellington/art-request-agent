/**
 * Zapier JavaScript Transformations
 *
 * These are the key transformation functions extracted from the existing Zapier workflows.
 * Use these in n8n Function nodes to maintain compatibility with current Asana task formatting.
 */

/**
 * Format Website/Social Media Inspiration Table
 *
 * Creates a markdown table from types and URLs arrays.
 * Extracted from Zapier node #13: "Javascript - Website Table in Asana"
 *
 * Input: types (array), urls (array)
 * Output: tableRows (string) - markdown table rows
 */
function formatWebsiteTable(types, urls) {
  // Normalize both inputs to arrays
  if (typeof types === 'string') types = types.split(',');
  if (typeof urls === 'string') urls = urls.split(',');

  // Ensure both are arrays
  if (!Array.isArray(types)) types = [types];
  if (!Array.isArray(urls)) urls = [urls];

  const rows = [];

  for (let i = 0; i < types.length; i++) {
    const type = (types[i] || '').trim();
    const url = (urls[i] || '').trim();
    if (type && url) {
      rows.push(`| ${type} | ${url} |`);
    }
  }

  return rows.join('\n');
}

/**
 * Format Product Details
 *
 * Creates formatted product information blocks from parallel arrays.
 * Extracted from Zapier node #14: "Javascript - Product Info"
 *
 * Input: Parallel arrays for product attributes
 * Output: productDetails (string) - formatted product blocks
 */
function formatProductDetails(data) {
  // Utility to normalize inputs into arrays
  const toArray = v =>
    Array.isArray(v) ? v
    : typeof v === "string" ? v.split(",")
    : [];

  const names = toArray(data.product_names);
  const colors = toArray(data.product_colors);
  const links = toArray(data.product_links);
  const imprintMethods = toArray(data.imprint_methods);
  const imprintColors = toArray(data.imprint_colors);
  const locations = toArray(data.decoration_locations);
  const sizes = toArray(data.decoration_sizes);
  const infos = toArray(data.other_info);

  const result = [];

  for (let i = 0; i < names.length; i++) {
    const name = (names[i] || "").trim();
    if (!name) continue;

    const color = (colors[i] || "").trim();
    const link = (links[i] || "").trim();
    const method = (imprintMethods[i] || "").trim();
    const imprintColor = (imprintColors[i] || "").trim();
    const location = (locations[i] || "").trim();
    const size = (sizes[i] || "").trim();
    const info = (infos[i] || "").trim();

    result.push(
`**${name}**
• Color: ${color}
• Imprint Method: ${method}
• Imprint Color: ${imprintColor}
• Location: ${location}
• Size: ${size}
• Link: ${link}
• Notes: ${info}`
    );
  }

  // Join all with blank lines between each product
  return result.join("\n\n");
}

/**
 * Alternative: Format Product Details from Object Array
 *
 * This version takes an array of product objects (from Claude conversation)
 * instead of parallel arrays.
 */
function formatProductDetailsFromObjects(products) {
  if (!products || products.length === 0) return '';

  return products.map(p =>
`**${p.name}**
• Color: ${p.color || ''}
• Imprint Method: ${p.imprintMethod || ''}
• Imprint Color: ${p.imprintColor || ''}
• Location: ${p.location || ''}
• Size: ${p.size || ''}
• Link: ${p.link || ''}
• Notes: ${p.notes || ''}`
  ).join('\n\n');
}

/**
 * Normalize Client Name
 * Extracted from Zapier node #15: "JS Client Name"
 *
 * Logic: Use Client Label unless it's "Not Listed" or empty
 */
function normalizeClientName(clientLabel, clientName) {
  if (clientLabel && clientLabel.toLowerCase() !== "not listed") {
    return clientLabel;
  }
  return clientName || "Unknown Client";
}

/**
 * Determine Google Drive Root Folder
 *
 * Based on first letter of client name:
 * A-L → 0ADaZpFm7TUV5Uk9PVA
 * M-Z → 0AJgvSmlJR1-tUk9PVA
 */
function getRootFolderID(clientName) {
  const firstLetter = clientName.charAt(0).toUpperCase();

  if (firstLetter >= 'A' && firstLetter <= 'L') {
    return '0ADaZpFm7TUV5Uk9PVA'; // A-L folder
  } else {
    return '0AJgvSmlJR1-tUk9PVA'; // M-Z folder
  }
}

/**
 * Build Complete Asana Task Description
 *
 * Combines all formatted sections into final description
 */
function buildAsanaDescription(data) {
  let description = '';

  // Client Type
  if (data.clientType) {
    description += `**Client Type**\n${data.clientType}\n\n`;
  }

  // Request-specific type
  if (data.mockupType) {
    description += `**Mockup Type**\n${data.mockupType}\n\n`;
  } else if (data.pptxType) {
    description += `**PPTX Type**\n${data.pptxType}\n\n`;
  } else if (data.proofType) {
    description += `**Proof Type**\n${data.proofType}\n\n`;
  }

  // Pertinent Information
  if (data.pertinentInformation) {
    description += `**Pertinent Information:**\n${data.pertinentInformation}\n\n`;
  }

  // Website & Social Media Inspiration
  if (data.websiteLinks && data.websiteLinks.length > 0) {
    const types = data.websiteLinks.map(l => l.type);
    const urls = data.websiteLinks.map(l => l.url);
    const tableRows = formatWebsiteTable(types, urls);

    description += `**Website & Social Media Inspiration:**\n| Type | URL |\n|------|-----|\n${tableRows}\n\n`;
  }

  // Product Info
  if (data.products && data.products.length > 0) {
    const productDetails = formatProductDetailsFromObjects(data.products);
    description += `**Product Info:**\n${productDetails}`;
  }

  return description;
}

/**
 * Asana Custom Field GID Lookups
 *
 * These are the exact GIDs from the Zapier workflow
 */
const ASANA_GIDS = {
  // Custom Field IDs
  customFields: {
    request: '1211551541910237',
    client: '1211551542058961',
    billable: '1211551542058970',
    value: '1211551542058988',
    estimatedTime: '1209588204727028',
    googleFolder: '1211701715737841',
    projectNumber: '1210695790941177',
    region: '1212310605793914'
  },

  // Request Type Enum Values
  requestTypes: {
    "Creative Design Services": "1211551541910239",
    "Mockup": "1211551541910241",
    "PPTX": "1211551541910242",
    "Proofs": "1211551541910243",
    "Sneak Peek": "1211551541910244"
  },

  // Value Range Enum Values
  valueRanges: {
    "<$50k": "1211551542058989",
    "$50k-$250k": "1211551542058990",
    ">$250k": "1211551542058991"
  },

  // Billable Enum Values
  billable: {
    "Yes": "1211551542058971",
    "No": "1211551542058972"
  },

  // Region Enum Values (extrapolated from Asana JSON)
  regions: {
    "US": "1212310605793915",
    "CAD": "1212310605793916",
    "EU": "1212310605793917",
    "UK": "1212310605793918",
    "APAC": "1212310605793919"
  }
};

/**
 * Get Enum GID for a field value
 */
function getEnumGID(field, value) {
  return ASANA_GIDS[field]?.[value] || null;
}

// ==============================
// n8n Function Node Examples
// ==============================

/**
 * Example n8n Function Node: Format Products
 *
 * Use in n8n as a Function node before creating Asana task
 */
/*
const products = $json.products || [];
const formattedProducts = formatProductDetailsFromObjects(products);

return {
  ...json,
  formattedProducts
};
*/

/**
 * Example n8n Function Node: Format Website Links
 */
/*
const websiteLinks = $json.websiteLinks || [];
const types = websiteLinks.map(l => l.type);
const urls = websiteLinks.map(l => l.url);
const formattedWebsites = formatWebsiteTable(types, urls);

return {
  ...$json,
  formattedWebsites
};
*/

/**
 * Example n8n Function Node: Build Complete Description
 */
/*
const description = buildAsanaDescription($json);

return {
  ...$json,
  asanaDescription: description
};
*/

/**
 * Example n8n Function Node: Lookup Asana GIDs
 */
/*
const requestTypeGID = ASANA_GIDS.requestTypes[$json.requestType];
const valueGID = ASANA_GIDS.valueRanges[$json.projectValue];
const billableGID = ASANA_GIDS.billable[$json.billable];
const regionGID = ASANA_GIDS.regions[$json.region];

return {
  ...$json,
  customFields: {
    [ASANA_GIDS.customFields.request]: requestTypeGID,
    [ASANA_GIDS.customFields.client]: $json.clientName,
    [ASANA_GIDS.customFields.billable]: billableGID,
    [ASANA_GIDS.customFields.value]: valueGID,
    [ASANA_GIDS.customFields.googleFolder]: $json.googleFolderURL,
    [ASANA_GIDS.customFields.projectNumber]: $json.projectNumber || '',
    [ASANA_GIDS.customFields.region]: regionGID
  }
};
*/

// Export for use in n8n
module.exports = {
  formatWebsiteTable,
  formatProductDetails,
  formatProductDetailsFromObjects,
  normalizeClientName,
  getRootFolderID,
  buildAsanaDescription,
  getEnumGID,
  ASANA_GIDS
};
