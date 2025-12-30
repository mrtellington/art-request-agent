# n8n Workflow Structure for Art Request Agent

## Overview

This document outlines the n8n workflows required to implement the Art Request conversational agent.

## Required Workflows

### 1. Main Conversation Handler (`art-request-conversation`)

**Purpose**: Orchestrates the conversation with Claude API and manages state.

**Trigger**: Webhook (POST)
- Path: `/webhook/art-request`
- Authentication: Header token
- Accepts: `application/json`

**Input Parameters**:
```json
{
  "conversationId": "uuid-v4",
  "message": "User message text",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

**Workflow Nodes**:

1. **Webhook Trigger**
   - Receives conversation message from web UI
   - Extracts: conversationId, message, history

2. **Load Conversation State** (Function)
   ```javascript
   const conversationId = $json.conversationId;
   const state = await $db.get(`conversation:${conversationId}`);

   return {
     conversationId,
     userMessage: $json.message,
     conversationState: state || {
       data: {},
       messages: [],
       status: 'in_progress'
     }
   };
   ```

3. **Build Claude API Request** (Function)
   ```javascript
   const systemPrompt = `[Load from claude-system-prompt.md]`;
   const conversationState = $json.conversationState;

   return {
     model: "claude-sonnet-4-5-20250929",
     max_tokens: 4096,
     system: systemPrompt + `\n\nCurrent collected data: ${JSON.stringify(conversationState.data)}`,
     messages: [
       ...$json.history || [],
       { role: "user", content: $json.userMessage }
     ],
     tools: [
       {
         name: "validate_client",
         description: "Check if client exists in CommonSKU",
         input_schema: {
           type: "object",
           properties: {
             clientName: { type: "string" }
           },
           required: ["clientName"]
         }
       },
       {
         name: "validate_url",
         description: "Check if URL is accessible",
         input_schema: {
           type: "object",
           properties: {
             url: { type: "string" }
           },
           required: ["url"]
         }
       },
       {
         name: "submit_art_request",
         description: "Final submission when all data collected",
         input_schema: {
           type: "object",
           properties: {
             requestType: { type: "string" },
             clientName: { type: "string" },
             requestorName: { type: "string" },
             requestorEmail: { type: "string" },
             // ... all other fields
           },
           required: ["requestType", "clientName", "requestorName", "requestorEmail", "region", "dueDate", "projectValue", "billable"]
         }
       }
     ]
   };
   ```

4. **Call Claude API** (HTTP Request)
   - Method: POST
   - URL: `https://api.anthropic.com/v1/messages`
   - Headers:
     - `x-api-key`: `{{$env.ANTHROPIC_API_KEY}}`
     - `anthropic-version`: `2023-06-01`
     - `content-type`: `application/json`
   - Body: From previous node

5. **Branch: Handle Tool Calls** (IF node)
   - Condition: `{{$json.content[0].type === 'tool_use'}}`
   - TRUE branch → Process Tool Call
   - FALSE branch → Return Response

6. **Process Tool Call** (Function)
   ```javascript
   const toolCall = $json.content.find(c => c.type === 'tool_use');

   if (toolCall.name === 'validate_client') {
     // Call CommonSKU validation workflow
     return {
       tool: 'validate_client',
       input: toolCall.input
     };
   } else if (toolCall.name === 'validate_url') {
     // Validate URL
     return {
       tool: 'validate_url',
       input: toolCall.input
     };
   } else if (toolCall.name === 'submit_art_request') {
     // Call submission workflow
     return {
       tool: 'submit_art_request',
       input: toolCall.input
     };
   }
   ```

7. **Execute Tool** (HTTP Request to sub-workflows)
   - Calls appropriate workflow based on tool name
   - Waits for response
   - Returns tool result to Claude

8. **Continue Conversation with Tool Result** (HTTP Request to Claude)
   - Adds tool result to message history
   - Calls Claude API again with tool result
   - Gets next assistant message

9. **Extract Response** (Function)
   ```javascript
   const assistantMessage = $json.content.find(c => c.type === 'text').text;
   const isComplete = $json.stop_reason === 'end_turn';

   return {
     response: assistantMessage,
     isComplete: isComplete,
     conversationId: $('Webhook Trigger').item.json.conversationId
   };
   ```

10. **Update Conversation State** (Function)
    ```javascript
    const conversationId = $json.conversationId;
    const newMessage = {
      role: 'assistant',
      content: $json.response,
      timestamp: new Date().toISOString()
    };

    const state = $('Load Conversation State').item.json.conversationState;
    state.messages.push(newMessage);

    // Extract structured data from Claude's response if available
    // (This requires parsing or Claude returning structured data)

    await $db.set(`conversation:${conversationId}`, state);

    return {
      conversationId,
      response: $json.response,
      isComplete: $json.isComplete
    };
    ```

11. **Return to Web UI** (Respond to Webhook)
    ```json
    {
      "response": "{{$json.response}}",
      "isComplete": false,
      "conversationId": "{{$json.conversationId}}"
    }
    ```

---

### 2. CommonSKU Client Validation (`validate-client`)

**Purpose**: Validates if a client exists in CommonSKU.

**Trigger**: Webhook (POST)
- Path: `/webhook/validate-client`
- Input: `{ clientName: string }`

**Workflow Nodes**:

1. **Webhook Trigger**

2. **Call CommonSKU API** (HTTP Request)
   - Method: GET
   - URL: `https://fws09sh894.execute-api.us-east-1.amazonaws.com/beta/clients?client_name={{encodeURIComponent($json.clientName)}}`
   - Headers:
     - `Accept`: `application/json`
     - `X-API-KEY`: `6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52`

3. **Process Response** (Function)
   ```javascript
   const data = $json;

   if (data.data && data.data.length > 0) {
     const client = data.data[0];
     return {
       exists: true,
       clientId: client.client_id,
       clientName: client.client_name,
       primaryContactEmail: client.primary_contact_email || null,
       industryName: client.industry_name || null
     };
   } else {
     return {
       exists: false,
       clientName: "Not Listed"
     };
   }
   ```

4. **Return Result**

---

### 3. URL Validation (`validate-url`)

**Purpose**: Checks if a URL is accessible.

**Trigger**: Webhook (POST)
- Input: `{ url: string }`

**Workflow Nodes**:

1. **Webhook Trigger**

2. **HTTP HEAD Request** (HTTP Request)
   - Method: HEAD
   - URL: `{{$json.url}}`
   - Ignore SSL issues: false
   - Timeout: 10000ms

3. **Process Response** (Function)
   ```javascript
   return {
     valid: $json.$statusCode >= 200 && $json.$statusCode < 400,
     url: $('Webhook Trigger').item.json.url,
     statusCode: $json.$statusCode
   };
   ```

4. **Return Result**

---

### 4. File Upload Handler (`upload-attachment`)

**Purpose**: Handles file uploads from web UI.

**Trigger**: Webhook (POST, Binary Data)
- Path: `/webhook/upload-attachment`
- Accepts: `multipart/form-data`

**Workflow Nodes**:

1. **Webhook Trigger** (Binary Data)
   - Receives uploaded files

2. **Process Files** (Function)
   ```javascript
   const files = [];
   const conversationId = $json.conversationId;

   for (const [key, value] of Object.entries($input.item.binary)) {
     const tempPath = `/tmp/${Date.now()}_${value.fileName}`;

     files.push({
       originalName: value.fileName,
       mimeType: value.mimeType,
       size: value.fileSize,
       tempPath: tempPath,
       binaryPropertyName: key
     });
   }

   return {
     conversationId,
     uploadedFiles: files
   };
   ```

3. **Store File References** (Function)
   ```javascript
   const conversationId = $json.conversationId;
   const state = await $db.get(`conversation:${conversationId}`);

   if (!state.data.uploadedFiles) {
     state.data.uploadedFiles = [];
   }

   state.data.uploadedFiles.push(...$json.uploadedFiles);

   await $db.set(`conversation:${conversationId}`, state);

   return {
     success: true,
     uploadedFiles: $json.uploadedFiles
   };
   ```

4. **Return Success**

---

### 5. Art Request Submission (`submit-art-request`)

**Purpose**: Creates Asana task and Google Drive folders.

**Trigger**: Webhook (POST)
- Path: `/webhook/submit-art-request`
- Input: Complete art request data

**Workflow Nodes**:

1. **Webhook Trigger**

2. **Determine Google Drive Path** (Function)
   ```javascript
   const clientName = $json.clientName;
   const clientExists = $json.clientExists;
   const requestTitle = $json.requestTitle;

   // Determine root folder (A-L vs M-Z)
   const firstLetter = clientExists
     ? clientName.charAt(0).toUpperCase()
     : "N"; // "Not Listed" goes under N (M-Z folder)

   const rootFolderID = (firstLetter >= 'A' && firstLetter <= 'L')
     ? '0ADaZpFm7TUV5Uk9PVA'  // A-L
     : '0AJgvSmlJR1-tUk9PVA'; // M-Z

   return {
     rootFolderID,
     clientExists,
     clientName: clientExists ? clientName : "Not Listed",
     requestTitle
   };
   ```

3. **Find/Create Client Folder** (Google Drive)
   - Action: Search for folder
   - Folder name: `{{$json.clientName}}`
   - Parent folder: `{{$json.rootFolderID}}`
   - If not found: Create folder

4. **IF: Client Exists** (Branch)
   - TRUE: Find/Create Year Folder
   - FALSE: Skip to Project Folder

5. **Find/Create Year Folder** (Google Drive)
   - Action: Search for folder
   - Folder name: `2025`
   - Parent: `{{$json.clientFolderId}}`
   - If not found: Create folder

6. **Create Project Folder** (Google Drive)
   - Action: Create folder
   - Folder name: `{{$json.requestTitle}}`
   - Parent: Year folder ID or Client folder ID (depending on branch)

7. **Create Attachments Folder** (Google Drive)
   - Action: Create folder
   - Folder name: `Attachments`
   - Parent: `{{$json.projectFolderId}}`

8. **Process Attachments** (Loop)
   - Loop through: URL attachments + uploaded files
   - For URL attachments: Download → Upload to Google Drive
   - For uploaded files: Direct upload to Google Drive

9. **Format Product Details** (Function)
   ```javascript
   function formatProductDetails(products) {
     if (!products || products.length === 0) return '';

     return products.map(p =>
       `**${p.name}**
   • Color: ${p.color}
   • Imprint Method: ${p.imprintMethod}
   • Imprint Color: ${p.imprintColor}
   • Location: ${p.location}
   • Size: ${p.size}
   • Link: ${p.link}
   • Notes: ${p.notes}`
     ).join('\n\n');
   }

   return { formattedProducts: formatProductDetails($json.products) };
   ```

10. **Format Website Table** (Function)
    ```javascript
    function formatWebsiteTable(links) {
      if (!links || links.length === 0) return '';

      const rows = links.map(l => `| ${l.type} | ${l.url} |`).join('\n');
      return `| Type | URL |\n|------|-----|\n${rows}`;
    }

    return { formattedWebsites: formatWebsiteTable($json.websiteLinks) };
    ```

11. **Build Asana Task Description** (Function)
    ```javascript
    const data = $json;

    let description = `**Client Type**\n${data.clientType}\n\n`;
    description += `**${data.requestType} Type**\n${data.specificTypeFields.mockupType || data.specificTypeFields.pptxType || 'N/A'}\n\n`;
    description += `**Pertinent Information:**\n${data.pertinentInformation || 'None provided'}\n\n`;

    if (data.formattedWebsites) {
      description += `**Website & Social Media Inspiration:**\n${data.formattedWebsites}\n\n`;
    }

    if (data.formattedProducts) {
      description += `**Product Info:**\n${data.formattedProducts}`;
    }

    return { taskDescription: description };
    ```

12. **Lookup Asana GIDs** (Function)
    ```javascript
    const ASANA_GIDS = {
      requestTypes: {
        "Creative Design Services": "1211551541910239",
        "Mockup": "1211551541910241",
        "PPTX": "1211551541910242",
        "Proofs": "1211551541910243",
        "Sneak Peek": "1211551541910244"
      },
      valueRanges: {
        "<$50k": "1211551542058989",
        "$50k-$250k": "1211551542058990",
        ">$250k": "1211551542058991"
      },
      billable: {
        "Yes": "1211551542058971",
        "No": "1211551542058972"
      },
      regions: {
        "US": "1212310605793915",
        "CAD": "1212310605793916",
        "EU": "1212310605793917",
        "UK": "1212310605793918",
        "APAC": "1212310605793919"
      }
    };

    return {
      requestTypeGID: ASANA_GIDS.requestTypes[$json.requestType],
      valueGID: ASANA_GIDS.valueRanges[$json.projectValue],
      billableGID: ASANA_GIDS.billable[$json.billable],
      regionGID: ASANA_GIDS.regions[$json.region]
    };
    ```

13. **Create Asana Task** (Asana)
    - Action: Create Task
    - Project: `1211223909834951` (Art Requests)
    - Name: `{{$json.requestType}} | {{$json.clientName}} | {{$json.requestTitle}}`
    - Description: `{{$json.taskDescription}}`
    - Due Date: `{{$json.dueDate}}`
    - Custom Fields:
      - `1211551541910237`: `{{$json.requestTypeGID}}`
      - `1211551542058961`: `{{$json.clientName}}`
      - `1211551542058970`: `{{$json.billableGID}}`
      - `1211551542058988`: `{{$json.valueGID}}`
      - `1211701715737841`: `{{$json.googleFolderURL}}`
      - `1210695790941177`: `{{$json.projectNumber || ''}}`
      - `1212310605793914`: `{{$json.regionGID}}`

14. **Return Success** (Respond to Webhook)
    ```json
    {
      "success": true,
      "asanaTaskURL": "{{$json.permalink_url}}",
      "googleDriveFolderURL": "{{$json.projectFolderURL}}"
    }
    ```

---

## Environment Variables Required

```bash
ANTHROPIC_API_KEY=<your_claude_api_key>
COMMONSKU_API_KEY=6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52
ASANA_ACCESS_TOKEN=<your_asana_token>
GOOGLE_DRIVE_CREDENTIALS=<service_account_json>
```

## Database/State Storage

Use n8n internal storage or Redis for conversation state:

**Key Format**: `conversation:{conversationId}`

**Value Structure**:
```json
{
  "conversationId": "uuid",
  "startedAt": "2025-01-01T12:00:00Z",
  "lastUpdated": "2025-01-01T12:05:00Z",
  "status": "in_progress",
  "data": {
    "requestType": "Mockup",
    "clientName": "Inkey",
    "clientExists": true,
    "products": [...]
  },
  "messages": [...]
}
```

## Testing Checklist

- [ ] Conversation handler receives messages and responds
- [ ] Client validation returns correct results
- [ ] URL validation works for valid/invalid URLs
- [ ] File uploads store files correctly
- [ ] Google Drive folder creation follows hierarchy
- [ ] Asana task creation populates all custom fields
- [ ] Product/website formatting matches expected output
- [ ] Conversation state persists across messages
- [ ] Error handling works for failed API calls
