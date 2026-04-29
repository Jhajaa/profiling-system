# Enrollment Approval Email Bugfix Design

## Overview

When an admin approves an enrollee via `EnrolleeController::updateStatus`, the system updates the
enrollee's status to `approved` but neither creates a user account nor dispatches a
`StudentCredentialsMail`. The fix mirrors the logic already present in `StudentController::store`:
extract the student number and email from `dynamic_data`, call `User::updateOrCreate`, and send
`StudentCredentialsMail`. The change is confined to `EnrolleeController::updateStatus`.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `updateStatus` is called with
  `status = 'approved'` for an enrollee that has not yet received login credentials
- **Property (P)**: The desired behavior when the bug condition holds — a `User` record is created
  and `StudentCredentialsMail` is dispatched to the enrollee's email address
- **Preservation**: Existing behaviors (rejection email, non-approved status updates, new-student
  module flow) that must remain unchanged by the fix
- **updateStatus**: The method in `app/Http/Controllers/EnrolleeController.php` that handles
  admin status changes for an enrollee record
- **dynamic_data**: The JSON column on the `enrollees` table (cast to `array`) that holds the
  enrollee's submitted form fields, including email and student number
- **submission**: An alternative JSON column on `enrollees` that may also hold submitted form
  fields; used as a fallback when `dynamic_data` is absent

## Bug Details

### Bug Condition

The bug manifests when an admin sets an enrollee's status to `approved`. The `updateStatus`
method updates the database record but contains no logic to create a user account or send an
email, so the student never receives credentials.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input — an HTTP request to PATCH /enrollees/{id}/status
  OUTPUT: boolean

  RETURN input.status == 'approved'
         AND enrollee.status != 'approved'   // not already approved
         AND NO User record exists with userNumber == resolvedStudentNumber(enrollee)
END FUNCTION
```

### Examples

- Admin approves enrollee with student number `2024-0001` and email `student@example.com`:
  **Expected** — User created, credentials email sent. **Actual** — Only status updated, no email.
- Admin approves enrollee whose `dynamic_data` has no email field:
  **Expected** — User created (if student number present), warning logged, no crash.
  **Actual** — Only status updated (same defect, different data shape).
- Admin rejects an enrollee:
  **Expected** — `EnrollmentRejectedMail` sent (unchanged). **Actual** — Works correctly today.
- Admin sets status to `submitted` (non-approved):
  **Expected** — Only status updated, no email. **Actual** — Works correctly today.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Calling `reject()` must continue to dispatch `EnrollmentRejectedMail` exactly as it does today
- Calling `updateStatus` with any value other than `approved` must continue to only update the
  status field without sending any email or creating any user account
- `StudentController::store` must continue to create a user and send `StudentCredentialsMail`
  without any modification
- If the credentials email fails to send, the approval (status update + user creation) must still
  complete successfully and the error must be logged

**Scope:**
All code paths that do NOT set `status = 'approved'` inside `updateStatus` are completely
unaffected by this fix. This includes:
- The `reject()` method (separate endpoint, separate logic)
- `store()`, `verify()`, `submit()`, `destroy()` methods on `EnrolleeController`
- All methods on `StudentController`

## Hypothesized Root Cause

The `updateStatus` method was implemented as a generic status setter without awareness of the
business rule that `approved` is a terminal state requiring side effects. The rejection path was
handled in a dedicated `reject()` method that already contains email logic, but no equivalent
was added for approval.

1. **Missing approval side-effect block**: `updateStatus` has no `if ($validated['status'] === 'approved')` branch to trigger user creation and email dispatch.

2. **No credential extraction logic**: Unlike `StudentController::store`, `updateStatus` never
   reads `dynamic_data` to resolve a student number or email address.

3. **No `User::updateOrCreate` call**: The user account creation step present in
   `StudentController::store` was never ported to the enrollment approval path.

4. **No `StudentCredentialsMail` dispatch**: The mail dispatch block from
   `StudentController::store` was never added to `updateStatus`.

## Correctness Properties

Property 1: Bug Condition - Approval Creates User Account and Sends Credentials Email

_For any_ enrollee where `isBugCondition` returns true (status is being set to `approved` and
no user account yet exists for that student number), the fixed `updateStatus` method SHALL
create a `User` record via `User::updateOrCreate` with the enrollee's student number as
`userNumber` and initial password, and SHALL dispatch `StudentCredentialsMail` to the
enrollee's resolved email address.

**Validates: Requirements 2.1**

Property 2: Preservation - Non-Approved Status Updates Remain Side-Effect Free

_For any_ call to `updateStatus` where the requested status is NOT `approved`
(`isBugCondition` returns false), the fixed method SHALL produce exactly the same result as
the original method: only the `status` column is updated, no `User` record is created, and no
email is dispatched.

**Validates: Requirements 3.3**

## Fix Implementation

### Changes Required

**File**: `app/Http/Controllers/EnrolleeController.php`

**Method**: `updateStatus`

**Specific Changes**:

1. **Add missing imports**: Import `Hash` facade and `StudentCredentialsMail` at the top of the
   file (or use fully-qualified names inline, consistent with the existing `reject()` method style).

2. **Add approval branch**: After `$enrollee->update(...)`, add:
   ```php
   if ($validated['status'] === 'approved') {
       // ... user creation + email dispatch
   }
   ```

3. **Extract student number and email from dynamic_data / submission**: Mirror the multi-key
   fallback lookup used in `StudentController::store`. Check both `dynamic_data` and `submission`
   columns since enrollees store their form data in `submission`.

4. **Create user account**: Call `User::updateOrCreate(['userNumber' => $studentNumber], [...])` 
   with `role = 'student'`, `status = 'active'`, `must_change_password = true`, and the student
   number as the initial hashed password — identical to `StudentController::store`.

5. **Dispatch credentials email**: Wrap `Mail::to($email)->send(new StudentCredentialsMail([...]))`
   in a try/catch that logs errors without re-throwing, so a mail failure never rolls back the
   approval.

## Testing Strategy

### Validation Approach

Two-phase approach: first run exploratory tests against the unfixed code to confirm the bug and
root cause, then verify the fix satisfies both correctness properties.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm
or refute the root cause analysis.

**Test Plan**: Mock the `Mail` facade, call `updateStatus` with `status = 'approved'` on a
seeded enrollee, and assert that `Mail::assertSent(StudentCredentialsMail::class)` passes and
that a `User` record was created. These assertions will FAIL on unfixed code, confirming the bug.

**Test Cases**:
1. **Approval with full dynamic_data**: Enrollee has student number and email in `dynamic_data`;
   assert `StudentCredentialsMail` sent and `User` created (will fail on unfixed code)
2. **Approval with data in submission**: Enrollee stores fields in `submission` instead of
   `dynamic_data`; assert same side effects (will fail on unfixed code)
3. **Approval with no email**: Enrollee has student number but no email; assert `User` created
   and warning logged, no crash (will fail on unfixed code)
4. **Approval with no student number**: Enrollee has neither student number nor email; assert
   only status updated, no crash (may fail on unfixed code)

**Expected Counterexamples**:
- `Mail::assertSent(StudentCredentialsMail::class)` fails — no email dispatched
- `User::where('userNumber', $studentNumber)->exists()` returns false — no account created
- Possible causes: missing approval branch, no credential extraction, no `User::updateOrCreate`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces
the expected behavior.

**Pseudocode:**
```
FOR ALL enrollee WHERE isBugCondition(enrollee, 'approved') DO
  result := updateStatus_fixed(request('approved'), enrollee.id)
  ASSERT Mail::sent(StudentCredentialsMail) contains enrollee.email
  ASSERT User::where('userNumber', studentNumber)->exists() == true
  ASSERT result.status == 200
  ASSERT enrollee.fresh().status == 'approved'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function
produces the same result as the original function.

**Pseudocode:**
```
FOR ALL status IN ['pending', 'submitted', 'rejected', 'waitlisted'] DO
  updateStatus_fixed(request(status), enrollee.id)
  ASSERT Mail::assertNotSent(StudentCredentialsMail)
  ASSERT User::where('userNumber', studentNumber)->doesntExist()
  ASSERT enrollee.fresh().status == status
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many status values automatically across the input domain
- It catches edge cases (e.g., unexpected status strings) that manual tests might miss
- It provides strong guarantees that no non-approved path triggers side effects

**Test Cases**:
1. **Rejection preservation**: Call `updateStatus` with `status = 'rejected'`; assert
   `EnrollmentRejectedMail` is NOT sent via `updateStatus` (rejection uses its own endpoint)
   and no `User` is created
2. **Pending/submitted preservation**: Call `updateStatus` with `status = 'pending'` or
   `'submitted'`; assert no email sent and no user created
3. **Email failure resilience**: Mock `Mail::to()->send()` to throw; assert response is still
   200 and enrollee status is `approved` and `User` record exists

### Unit Tests

- Test `updateStatus` with `approved` status creates a `User` record
- Test `updateStatus` with `approved` status dispatches `StudentCredentialsMail`
- Test `updateStatus` with `approved` and missing email logs warning and does not crash
- Test `updateStatus` with non-approved statuses does not create users or send emails

### Property-Based Tests

- Generate random non-approved status strings and verify no side effects are triggered in
  `updateStatus`
- Generate random `dynamic_data` shapes (varying key names for email/student number) and verify
  the credential extraction logic resolves correctly or degrades gracefully

### Integration Tests

- Full approval flow: create enrollee → submit → admin approves → assert user can log in with
  student number as password
- Verify rejection flow is unaffected after the fix is applied
- Verify `StudentController::store` flow is unaffected after the fix is applied
