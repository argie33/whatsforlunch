# Runbook: Status Page (status.whatsforlunch.app)

**Tool**: Instatus (free tier, custom domain)  
**URL**: https://status.whatsforlunch.app  
**Admin**: https://dashboard.instatus.com

---

## Initial setup (one-time)

1. Create account at instatus.com
2. Add custom domain `status.whatsforlunch.app` → CNAME to `instatus.com`
3. Create components:

| Component | Description |
|---|---|
| API | AppSync GraphQL endpoint |
| Mobile App | iOS + Android apps |
| AI Classification | Bedrock food photo analysis |
| Authentication | Cognito sign-in / magic links |
| Sync | Real-time household sync |
| Web | whatsforlunch.app marketing site |

4. Configure subscriber notifications (email + SMS)
5. Embed badge in app footer: `https://status.whatsforlunch.app/badge.svg`

---

## Posting an incident

### Minor degradation (P2)
```
Status: Degraded Performance
Title: "Elevated latency on AI classification"
Body: "We are seeing higher-than-normal response times on AI food classification. 
       Other features are unaffected. We are investigating."
```

### Major outage (P0/P1)
```
Status: Major Outage
Title: "API unavailable"
Body: "Our API is currently unavailable. We are aware of the issue and are 
       working to restore service as quickly as possible."
```

**Update cadence**: every 30 min until resolved, then a final "resolved" post.

### Resolving
```
Status: Operational
Body: "The issue has been resolved. All systems are operating normally.
       Root cause: <brief description>"
```

---

## CloudWatch → Instatus integration

Add this Lambda to notify Instatus when alarms fire:

```typescript
// Triggered by SNS topic from ops-stack.ts alertTopic
export async function handler(event: SNSEvent) {
  const msg = JSON.parse(event.Records[0].Sns.Message);
  const isAlarm = msg.NewStateValue === 'ALARM';

  await fetch('https://api.instatus.com/v2/<page-id>/incidents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.INSTATUS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: msg.AlarmName,
      message: msg.AlarmDescription,
      status: isAlarm ? 'INVESTIGATING' : 'RESOLVED',
      components: [{ id: process.env.INSTATUS_API_COMPONENT_ID, status: isAlarm ? 'PARTIAL_OUTAGE' : 'OPERATIONAL' }],
    }),
  });
}
```

Store `INSTATUS_API_KEY` and `INSTATUS_API_COMPONENT_ID` in AWS Secrets Manager.

---

## GitHub Actions integration

Add to `deploy-production.yml` post-deploy:
```yaml
- name: Update status page — deploying
  run: |
    curl -X POST https://api.instatus.com/v2/${{ secrets.INSTATUS_PAGE_ID }}/incidents \
      -H "Authorization: Bearer ${{ secrets.INSTATUS_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{"name":"Scheduled maintenance","message":"Deploying new version","status":"UNDER_MAINTENANCE"}'
```
