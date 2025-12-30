# n8n Workflow Import Guide

This guide will walk you through importing and configuring the 5 n8n workflows for the Art Request Agent.

---

## Overview

You'll be importing 5 workflows in this order:

1. **Validate Client** - CommonSKU API client validation
2. **Validate URL** - URL accessibility checker
3. **Upload Attachment** - File upload handler
4. **Submit Request** - Complete submission workflow (Google Drive + Asana)
5. **Main Agent** - Conversational agent with Claude (uses workflows #1-4 as tools)

---

## Prerequisites

Before importing, ensure you have:

- [ ] n8n cloud instance access: https://whitestone.app.n8n.cloud
- [ ] **Anthropic API Key** (Claude API)
- [ ] **CommonSKU API Key**: `6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52`
- [ ] **Asana Personal Access Token**
- [ ] **Google Drive Service Account** credentials (JSON file)

---

## Step 1: Configure Credentials in n8n

### 1.1 Anthropic API Credentials

1. Go to **Settings** → **Credentials** → **New Credential**
2. Search for "Anthropic" or "Claude"
3. Add credential:
   - **Name**: `Anthropic - Claude API`
   - **API Key**: `[Your Anthropic API Key]`
4. **Save**

### 1.2 Asana API Credentials

1. Go to **Settings** → **Credentials** → **New Credential**
2. Search for "Asana API"
3. Add credential:
   - **Name**: `Asana - Whitestone`
   - **Access Token**: `[Your Asana Personal Access Token]`
4. **Save**

### 1.3 Google Drive Service Account

1. Go to **Settings** → **Credentials** → **New Credential**
2. Search for "Google Drive OAuth2 API" or "Google Service Account"
3. Add credential:
   - **Name**: `Google Drive - Art Requests`
   - **Service Account Email**: `[from your JSON file]`
   - **Private Key**: `[from your JSON file]`
4. **Save**

**Note:** The Google Drive service account must have **Editor** access to:
- A-L folder: `0ADaZpFm7TUV5Uk9PVA`
- M-Z folder: `0AJgvSmlJR1-tUk9PVA`

---

## Step 2: Import Workflows (In Order)

### 2.1 Import Workflow #1: Validate Client

1. In n8n, click **Workflows** → **Add Workflow** → **Import from File**
2. Select file: `n8n-workflows/1-validate-client.json`
3. Workflow imported: **"Art Request - Validate Client"**
4. **No credentials needed** (API key is hardcoded in the HTTP Request node)
5. **Activate** the workflow (toggle switch in top-right)
6. **Copy the webhook URL** (click on the Webhook node to see it)
   - Example: `https://whitestone.app.n8n.cloud/webhook/validate-client`
   - **Save this URL** - you'll need it for workflow #5

### 2.2 Import Workflow #2: Validate URL

1. Click **Workflows** → **Add Workflow** → **Import from File**
2. Select file: `n8n-workflows/5-validate-url.json`
3. Workflow imported: **"Art Request - Validate URL"**
4. **No credentials needed**
5. **Activate** the workflow
6. **Copy the webhook URL**
   - **Save this URL** - you'll need it for workflow #5

### 2.3 Import Workflow #3: Upload Attachment

1. Click **Workflows** → **Add Workflow** → **Import from File**
2. Select file: `n8n-workflows/4-upload-attachment.json`
3. Workflow imported: **"Art Request - Upload Attachment"**
4. **No credentials needed**
5. **Activate** the workflow
6. **Copy the webhook URL**
   - **Save this URL** - you'll need it for workflow #5

### 2.4 Import Workflow #4: Submit Request

1. Click **Workflows** → **Add Workflow** → **Import from File**
2. Select file: `n8n-workflows/3-submit-request.json`
3. Workflow imported: **"Art Request - Submit Request"**
4. **Configure credentials:**
   - Click on **"Create Asana Task"** node → Select credential: `Asana - Whitestone`
   - Click on **"Search/Create Client Folder"** node → Select credential: `Google Drive - Art Requests`
   - Click on **"Search/Create Year Folder"** node → Select credential: `Google Drive - Art Requests`
   - Click on **"Create Project Folder"** node → Select credential: `Google Drive - Art Requests`
   - Click on **"Create Attachments Folder"** node → Select credential: `Google Drive - Art Requests`
5. **Activate** the workflow
6. **Copy the webhook URL**
   - **Save this URL** - you'll need it for workflow #5

### 2.5 Import Workflow #5: Main Agent (Conversational Interface)

1. Click **Workflows** → **Add Workflow** → **Import from File**
2. Select file: `n8n-workflows/2-main-agent.json`
3. Workflow imported: **"Art Request - Main Agent"**
4. **Configure credentials:**
   - Click on **"Anthropic Chat Model"** node → Select credential: `Anthropic - Claude API`
5. **Configure Validate Client Tool** (IMPORTANT):
   - Click on **"Validate Client Tool"** node
   - In the **Workflow** dropdown, select: `Art Request - Validate Client`
   - This connects the tool to workflow #1
6. **Add missing tools** for workflows #2, #3, #4:
   - Click **"+"** → Search for **"Execute Workflow"** or **"Workflow Tool"**
   - Add 3 more tool nodes:

   **Tool 2: Validate URL**
   - Name: `validate_url`
   - Description: `Check if a URL is accessible and valid`
   - Workflow: `Art Request - Validate URL`
   - Fields:
     - Name: `url`
     - Description: `The URL to validate`
   - Input Schema:
     ```json
     {
       "type": "object",
       "properties": {
         "url": {
           "type": "string",
           "description": "URL to validate"
         }
       },
       "required": ["url"]
     }
     ```

   **Tool 3: Upload Attachment**
   - Name: `upload_attachment`
   - Description: `Upload file attachments from the conversation`
   - Workflow: `Art Request - Upload Attachment`
   - Fields:
     - Name: `conversationId`
     - Description: `Conversation session ID`
   - Input Schema:
     ```json
     {
       "type": "object",
       "properties": {
         "conversationId": {
           "type": "string",
           "description": "Session ID"
         }
       },
       "required": ["conversationId"]
     }
     ```

   **Tool 4: Submit Art Request**
   - Name: `submit_art_request`
   - Description: `Submit complete art request to Asana and Google Drive`
   - Workflow: `Art Request - Submit Request`
   - Fields: (See workflow #3 for complete list of fields)
     - requestType, clientName, clientExists, requestorName, requestorEmail, region, requestTitle, dueDate, projectValue, billable, clientType, products, websites, attachments, pertinentInformation
   - Input Schema: (Copy from `conversation-state-schema.json` data section)

7. **Connect all tools to AI Agent:**
   - Drag connection from each tool's `ai_tool` output to the **AI Agent** node's tool input
8. **Save** and **Activate** the workflow
9. **Test the workflow:**
   - Click **"Test Workflow"** → **"Execute Workflow"**
   - In the Chat interface, type: "I need to submit an art request"

---

## Step 3: Verify Workflow Configuration

### 3.1 Test Client Validation

1. Go to workflow **"Art Request - Validate Client"**
2. Click **"Test Workflow"**
3. In the Webhook node, click **"Listen for Test Event"**
4. Use curl to test:
   ```bash
   curl -X POST https://whitestone.app.n8n.cloud/webhook/validate-client \
     -H "Content-Type: application/json" \
     -d '{"clientName": "Inkey"}'
   ```
5. **Expected response:**
   ```json
   {
     "exists": true,
     "clientId": "...",
     "clientName": "Inkey",
     "primaryContactEmail": "..."
   }
   ```

### 3.2 Test URL Validation

1. Go to workflow **"Art Request - Validate URL"**
2. Click **"Test Workflow"**
3. Use curl to test:
   ```bash
   curl -X POST https://whitestone.app.n8n.cloud/webhook/validate-url \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.google.com"}'
   ```
4. **Expected response:**
   ```json
   {
     "url": "https://www.google.com",
     "valid": true,
     "statusCode": 200,
     "validationType": "success",
     "message": "URL is accessible"
   }
   ```

### 3.3 Test Main Agent Conversation

1. Go to workflow **"Art Request - Main Agent"**
2. Click **"Test Workflow"** → **"Chat"**
3. Type: "I need to submit a mockup request"
4. **Expected response:**
   ```
   Hi! I'll help you submit an art request. What type of request is this?
   1. Creative Design Services
   2. Mockup
   3. PowerPoint (PPTX)
   4. Proofs
   5. Sneak Peek
   6. Rise & Shine
   ```
5. Continue conversation to test client validation, field collection, etc.

---

## Step 4: Enable for Production

### 4.1 Set Workflow to Production Mode

1. Each workflow should be **Activated** (green toggle in top-right)
2. Workflows #1-4 should have **webhook URLs** that are stable
3. Workflow #5 (Main Agent) should be set to **"Available in MCP"** (already configured in JSON)

### 4.2 Connect to Web UI (Future)

When building the React web UI, use this endpoint:
- **Main Agent Webhook**: `https://whitestone.app.n8n.cloud/webhook/art-request-conversation`
- **Upload Attachment**: `https://whitestone.app.n8n.cloud/webhook/upload-attachment`

---

## Troubleshooting

### Issue: "Workflow not found" error in Validate Client Tool

**Solution:**
1. Go to workflow #5 (Main Agent)
2. Click on "Validate Client Tool" node
3. In the **Workflow** dropdown, manually select `Art Request - Validate Client`
4. Save the workflow

### Issue: Google Drive folder creation fails

**Solution:**
1. Verify service account has **Editor** access to both root folders
2. Test folder IDs are correct:
   - A-L: `0ADaZpFm7TUV5Uk9PVA`
   - M-Z: `0AJgvSmlJR1-tUk9PVA`
3. Check Google Drive API is enabled for the service account project

### Issue: Asana task creation fails with "Custom field not found"

**Solution:**
1. Verify custom field GIDs in workflow #4 match your Asana project
2. Check in Asana project settings → Custom fields → Copy GID
3. Update GIDs in the "Prepare Asana Data" node

### Issue: Claude API returns 401 Unauthorized

**Solution:**
1. Verify Anthropic API key is correct
2. Check API key has sufficient credits
3. Ensure credential is properly connected to "Anthropic Chat Model" node

---

## Next Steps

After successful import and testing:

1. [ ] Test complete end-to-end flow with real data
2. [ ] Compare output with existing Cognito Forms + Zapier submissions
3. [ ] Adjust system prompt if needed (in workflow #5 → Anthropic Chat Model → System Message)
4. [ ] Build React web UI (or use Claude.ai Projects as interim solution)
5. [ ] User training with sales team
6. [ ] Phased rollout

---

## Quick Reference: Workflow Dependencies

```
┌─────────────────────────┐
│ Main Agent (Workflow #5)│
│   - Uses Claude API     │
└───────────┬─────────────┘
            │ calls these workflows as tools:
            │
    ┌───────┼────────┬──────────┐
    │       │        │          │
    ▼       ▼        ▼          ▼
┌────────┐ ┌─────┐ ┌──────┐ ┌────────┐
│Validate│ │Valid│ │Upload│ │Submit  │
│Client  │ │URL  │ │Attach│ │Request │
│(#1)    │ │(#2) │ │(#3)  │ │(#4)    │
└────────┘ └─────┘ └──────┘ └────┬───┘
                                  │ uses:
                          ┌───────┼───────┐
                          ▼       ▼       ▼
                      ┌──────┐ ┌────┐ ┌─────┐
                      │Google│ │Asan│ │CSKU │
                      │Drive │ │a   │ │API  │
                      └──────┘ └────┘ └─────┘
```

---

## Support

For issues during import:
- Check workflow JSON syntax is valid
- Verify all credentials are configured
- Test each workflow individually before testing Main Agent
- Review n8n execution logs for detailed error messages

---

**Created**: December 30, 2025
**Version**: 1.0
**Workflows**: 5 total (all ready for import)
