# GIRMA Firestore Security Specification

## 1. Data Invariants
1. **Identity Integrity**: Every user-owned document (`users`, `student_profiles`, `opportunity_applications`, `learning_progress`, `business_documents`, `notifications`, `ai_conversations`) must bind its owner UID (`uid`, `userId`, or `ownerId`) strictly to `request.auth.uid`.
2. **RBAC Privilege Isolation**: Non-admin users cannot elevate `users.plan` above `'free'`, cannot alter `users.accountStatus`, and cannot create or modify `/admins/{adminId}`.
3. **Verification Integrity**: Newly created `business_profiles` must have `verificationStatus == 'unverified'`. Newly created `mentor_profiles` must have `approvalStatus == 'pending'`. Newly created `organization_profiles` must have `verified == false`. Only verified administrators (`isAdmin()`) may approve or reject verification.
4. **Temporal & Immutability Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt` and ownership IDs are immutable on update; `updatedAt` must equal `request.time` on update.
5. **PII Isolation**: `/users/{userId}` contains private email and phone numbers and is readable only by the account owner or an administrator.
6. **Admin Audit Trail**: `/admin_activity_logs/{logId}` is append-only by admins; no updates or deletes are permitted.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Self-Admin Escalation**: Authenticated user writes `{ uid: auth.uid, email: "attacker@example.com" }` to `/admins/{auth.uid}`.
2. **Plan Spoofing on Registration**: User creates `/users/{auth.uid}` with `plan: "organization"` or `accountStatus: "active"` modified to `"suspended"` / `"pro"`.
3. **Shadow Verification on Business Create**: User creates `/business_profiles/{id}` with `verificationStatus: "verified"`.
4. **Shadow Verification Update**: Business owner updates `/business_profiles/{id}` changing `verificationStatus` from `"unverified"` to `"verified"`.
5. **Mentor Self-Approval**: User creates `/mentor_profiles/{id}` with `approvalStatus: "approved"`.
6. **Cross-User PII Read**: Authenticated User A attempts `get` or `list` on `/users/{userB_uid}`.
7. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to write to `/business_profiles/{id}`.
8. **Admin Email Spoofing**: User with `email: "ahmedmalgwi2@gmail.com"` and `email_verified: false` attempts admin opportunity creation.
9. **ID Poisoning**: User attempts to create `/business_documents/{1500_char_id}` or ID containing `/` or `$`.
10. **Timestamp Forgery**: User creates `/opportunity_applications/{id}` with backdated `createdAt` not matching `request.time`.
11. **Terminal State Bypass on Verification Request**: User updates an already `'approved'` or `'rejected'` `/verification_requests/{id}` back to `'pending'`.
12. **Audit Log Tampering**: Even an admin attempts to `update` or `delete` an existing `/admin_activity_logs/{logId}` record.
