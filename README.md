# Art Request Conversational Agent

A conversational AI agent to replace Cognito Forms + Zapier workflow for Whitestone Branding's art request system.

## Overview

This project replaces a complex 47-field form with a guided conversational interface powered by Claude AI, reducing cognitive load while ensuring data completeness and maintaining full compatibility with existing Asana/Google Drive infrastructure.

**Architecture**: Claude API + n8n Workflows + React Web UI

**Benefits**:
- ✅ Faster submission time (<5 min vs 10-15 min with form)
- ✅ Reduced errors (intelligent validation + client lookup)
- ✅ Flexible requirements (context-based field collection)
- ✅ Cost savings ($50-115/month vs current Cognito + Zapier)
- ✅ Better user experience (conversational vs rigid form)

## 📁 Project Files

### Core Implementation Files

1. **`claude-system-prompt.md`**
   - Complete system prompt for Claude AI
   - Defines conversation flow, required fields, and function calls
   - Copy this into your Claude API integration

2. **`n8n-commonsku-validation.js`**
   - Client validation function for n8n
   - Queries CommonSKU API to verify client exists
   - Returns client info or "Not Listed" status

3. **`n8n-workflow-structure.md`**
   - Complete documentation of required n8n workflows
   - 5 workflows: Conversation Handler, Client Validation, URL Validation, File Upload, Submission
   - Node-by-node breakdown with code examples

4. **`zapier-transformations.js`**
   - JavaScript functions extracted from existing Zapier workflows
   - Product formatting, website table generation, Asana GID lookups
   - Ready to use in n8n Function nodes

5. **`conversation-state-schema.json`**
   - JSON schema for conversation state tracking
   - Defines structure for Redis/n8n storage
   - Includes validation rules

### Reference Files

6. **`art requests.json`**
   - Actual Asana task data with custom field GIDs
   - Use for reference when mapping fields

7. **`exported-zap-*.json`** (4 files)
   - Original Zapier workflow exports
   - Contains all transformation logic and branching rules

## 🚀 Quick Start

### Prerequisites

- **n8n instance** (cloud or self-hosted)
- **Anthropic API key** (Claude API)
- **CommonSKU API key**: `6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52`
- **Asana Personal Access Token**
- **Google Drive Service Account** credentials

### Step 1: Set Up n8n Environment Variables

```bash
ANTHROPIC_API_KEY=your_claude_api_key_here
COMMONSKU_API_KEY=6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52
ASANA_ACCESS_TOKEN=your_asana_token_here
GOOGLE_DRIVE_CREDENTIALS=your_service_account_json_here
```

### Step 2: Create n8n Workflows

Follow `n8n-workflow-structure.md` to create these workflows:

1. **`art-request-conversation`** - Main conversation handler
2. **`validate-client`** - CommonSKU client validation
3. **`validate-url`** - URL accessibility check
4. **`upload-attachment`** - File upload handler
5. **`submit-art-request`** - Asana task + Google Drive creation

### Step 3: Test Client Validation

Test the CommonSKU API integration:

```bash
curl -X GET \
  "https://fws09sh894.execute-api.us-east-1.amazonaws.com/beta/clients?client_name=Inkey" \
  -H "Accept: application/json" \
  -H "X-API-KEY: 6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52"
```

Expected response:
```json
{
  "data": [
    {
      "client_id": "...",
      "client_name": "Inkey",
      "primary_contact_email": "...",
      "industry_name": "..."
    }
  ]
}
```

### Step 4: Build Web UI (Optional)

See `web-ui-structure.md` for React implementation details.

**Alternative**: Use [Claude.ai Projects](https://claude.ai/projects) for faster launch:
- Create new project "Whitestone Art Requests"
- Paste system prompt
- Share link with sales team
- Connect Claude.ai to n8n via webhook

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Set up n8n instance and environment variables
- [ ] Create `validate-client` workflow
- [ ] Test CommonSKU API integration
- [ ] Create `art-request-conversation` workflow skeleton
- [ ] Integrate Claude API
- [ ] Test basic conversation flow

### Phase 2: Data Collection (Week 3-4)
- [ ] Implement all request type conditional logic
- [ ] Add product collection (repeating section)
- [ ] Add website/attachment collection
- [ ] Create `validate-url` workflow
- [ ] Create `upload-attachment` workflow
- [ ] Test file upload functionality

### Phase 3: Backend Integration (Week 5-6)
- [ ] Create `submit-art-request` workflow
- [ ] Implement Google Drive folder creation
- [ ] Test folder hierarchy (A-L vs M-Z, Not Listed)
- [ ] Implement Asana task creation
- [ ] Test custom field mapping
- [ ] Implement attachment upload to Google Drive
- [ ] Test complete end-to-end flow

### Phase 4: Testing & Polish (Week 7-8)
- [ ] User testing with 5-10 requests
- [ ] Compare output with existing Cognito/Zapier submissions
- [ ] Error handling and recovery
- [ ] Resume conversation capability
- [ ] Create user documentation

### Phase 5: Rollout (Week 9-10)
- [ ] Parallel operation (keep old form active)
- [ ] Train sales team (5-min demo video)
- [ ] Phased rollout: 10% → 50% → 100%
- [ ] Monitor for issues
- [ ] Deprecate Cognito Forms + Zapier

## 🔑 Key API Endpoints

### CommonSKU Client Search
```
GET https://fws09sh894.execute-api.us-east-1.amazonaws.com/beta/clients
Headers:
  X-API-KEY: 6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52
  Accept: application/json
Query Parameters:
  client_name: string (exact match)
```

### Claude API
```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: <your_key>
  anthropic-version: 2023-06-01
  content-type: application/json
Body:
  {
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 4096,
    "system": "<system_prompt>",
    "messages": [...],
    "tools": [...]
  }
```

### Asana Task Creation
```
POST https://app.asana.com/api/1.0/tasks
Headers:
  Authorization: Bearer <token>
Body:
  {
    "data": {
      "name": "Mockup | Inkey | 2026 GWP Ideas",
      "projects": ["1211223909834951"],
      "custom_fields": {...},
      "due_on": "2025-01-15",
      "notes": "<formatted_description>"
    }
  }
```

## 🎯 Conversation Flow

```
1. Opening → Request Type Selection
   ↓
2. Client Validation (CommonSKU API)
   ↓
3. Basic Info (Name, Email, Region, Title, Due Date)
   ↓
4. Request-Specific Fields (Conditional)
   - Mockup → Mockup Type, Products
   - PPTX → Slide Count, Structure
   - Rise & Shine → Level Selection
   ↓
5. Project Metadata (Value, Billable, Client Type)
   ↓
6. Attachments & Links
   ↓
7. Review & Confirm
   ↓
8. Submit → Create Asana Task + Google Drive Folders
```

## 📊 Data Flow

```
Web UI
  ↓ (HTTPS POST)
n8n Webhook
  ↓
Load Conversation State
  ↓
Build Claude API Request
  ↓
Claude API
  ↓ (Function Call?)
[validate_client] → CommonSKU API
[validate_url] → HTTP HEAD request
[submit_art_request] → Submission Workflow
  ↓
Update Conversation State
  ↓
Return Response to Web UI
```

## 🗂️ Google Drive Folder Structure

```
A-L (0ADaZpFm7TUV5Uk9PVA)
├── Inkey/
│   └── 2025/
│       └── 2026 GWP Ideas/
│           └── Attachments/
└── Not Listed/
    └── Project Title/
        └── Attachments/

M-Z (0AJgvSmlJR1-tUk9PVA)
├── SiriusXM/
│   └── 2025/
│       └── Q1 Campaign/
│           └── Attachments/
└── Not Listed/
    └── Project Title/
        └── Attachments/
```

**Rules**:
- If client exists in CommonSKU → `[A-L or M-Z]/[Client Name]/[Year]/[Request Title]/Attachments`
- If client NOT in CommonSKU → `[M-Z]/Not Listed/[Request Title]/Attachments`

## 🎨 Asana Task Format

**Task Name**: `[Request Type] | [Client Name] | [Request Title]`

**Example**: `Mockup | Inkey | 2026 GWP Ideas`

**Custom Fields**:
- Request (enum): Mockup
- Client (text): Inkey
- Billable (enum): Yes
- Value (enum): <$50k
- Google Folder (text): [Drive URL]
- Project# (text): Estimate #75715
- Region (enum): US

**Description**:
```markdown
**Client Type**
Existing

**Mockup Type**
Whitestone Template

**Pertinent Information:**
Feel free to get creative with the designs...

**Website & Social Media Inspiration:**
| Type | URL |
|------|-----|
| Instagram | https://instagram.com/brand |

**Product Info:**
**Canvas Tote Bag**
• Color: natural/black handles
• Imprint Method: screen print
• Imprint Color: black
• Location: 1 side
• Size: 5-6"w
• Link: https://www.ssactivewear.com/p/liberty_bags/8868
• Notes: INKEY logo in black on 1 side
```

## 🧪 Testing

### Test Scenarios

1. **Happy Path - Mockup Request**
   - Client exists in CommonSKU
   - 3 products
   - 2 website links
   - 5 attachment URLs
   - Expected: Asana task created, all fields populated, Google Drive folders created

2. **Edge Case - Not Listed Client**
   - Client doesn't exist in CommonSKU
   - Should create folder under "Not Listed"
   - Expected: Correct folder path, task created with "Not Listed" client

3. **PPTX Request**
   - Different request type logic
   - No products (PPTX-specific fields instead)
   - Expected: Conditional fields handled correctly

4. **File Upload**
   - User uploads 3 files in chat
   - User provides 2 URLs
   - Expected: All 5 files uploaded to Google Drive Attachments folder

### Testing CommonSKU API

Test with known clients:
```bash
# Test existing client
curl "https://fws09sh894.execute-api.us-east-1.amazonaws.com/beta/clients?client_name=Inkey" \
  -H "X-API-KEY: 6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52"

# Test non-existent client
curl "https://fws09sh894.execute-api.us-east-1.amazonaws.com/beta/clients?client_name=NonExistentClient123" \
  -H "X-API-KEY: 6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52"
```

## 📈 Success Metrics

Track these KPIs after launch:

- **Adoption Rate**: Target 90% within 30 days
- **Time to Submit**: Target <5 minutes (vs 10-15 with form)
- **Completion Rate**: Target >80% (started → submitted)
- **Error Rate**: Target <5% (manual corrections needed)
- **User Satisfaction**: Target >4.0/5.0

## 🐛 Troubleshooting

### Claude API Not Responding
- Check `ANTHROPIC_API_KEY` is set correctly
- Verify API key has sufficient credits
- Check request format matches Claude API spec

### CommonSKU Client Validation Failing
- Verify API key: `6OeLDR99972yoWmoazwPp7AMwUpn7RAY8MzQng52`
- Test endpoint directly with curl
- Check if client name is exact match (case-sensitive)

### Google Drive Folder Creation Fails
- Verify service account has access to root folders
- Check folder IDs: A-L (`0ADaZpFm7TUV5Uk9PVA`), M-Z (`0AJgvSmlJR1-tUk9PVA`)
- Ensure "Not Listed" folder exists in M-Z root

### Asana Task Custom Fields Not Populating
- Verify custom field GIDs match Asana project
- Check enum values are exact matches
- Use `zapier-transformations.js` ASANA_GIDS lookup

## 📞 Next Steps

**Immediate (This Week)**:
1. ✅ Review implementation files
2. Set up n8n instance
3. Test CommonSKU API integration
4. Create first workflow (`validate-client`)

**Short Term (Next 2 Weeks)**:
5. Build main conversation handler
6. Integrate Claude API
7. Test basic conversation flow
8. Add file upload capability

**Medium Term (Next Month)**:
9. Complete submission workflow
10. User testing with sales team
11. Iterate based on feedback
12. Prepare rollout plan

## 📚 Additional Resources

- [Claude API Documentation](https://docs.anthropic.com/en/api)
- [n8n Documentation](https://docs.n8n.io/)
- [Asana API Reference](https://developers.asana.com/docs)
- [Google Drive API](https://developers.google.com/drive/api/guides/about-sdk)

## 🤝 Support

For questions or issues during implementation:
- Check `n8n-workflow-structure.md` for detailed workflow setup
- Reference `zapier-transformations.js` for data formatting
- Review `claude-system-prompt.md` for conversation logic

---

**Created**: December 30, 2025
**Status**: Ready for Implementation
**Estimated Timeline**: 10 weeks to full deployment
