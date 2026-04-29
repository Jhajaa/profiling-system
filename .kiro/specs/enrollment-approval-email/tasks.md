# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Approval Does Not Create User or Send Credentials Email
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case: `status = 'approved'` with a valid enrollee that has student number and email in `submission`
  - Test that calling `updateStatus` with `status = 'approved'` creates a `User` record and dispatches `StudentCredentialsMail`
  - The test assertions will FAIL on unfixed code (no approval branch exists)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: `Mail::assertSent(StudentCredentialsMail::class)` fails, `User::where('userNumber', ...)->exists()` returns false
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Approved Status Updates Remain Side-Effect Free
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: calling `updateStatus` with `status = 'pending'`, `'submitted'`, `'waitlisted'` on unfixed code only updates the status column — no User created, no email sent
  - Write property-based test: for all non-approved status values, no `StudentCredentialsMail` is sent and no `User` record is created
  - Verify test passes on UNFIXED code (confirms baseline behavior to preserve)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.3_

- [x] 3. Fix: updateStatus approval branch missing user creation and email dispatch

  - [x] 3.1 Implement the fix in EnrolleeController::updateStatus
    - Add `if ($validated['status'] === 'approved')` branch after `$enrollee->update(...)`
    - Extract student number from `$enrollee->submission` then `$enrollee->dynamic_data` using multi-key fallback (same keys as `StudentController::store`)
    - Extract email from `$enrollee->submission` then `$enrollee->dynamic_data` using multi-key fallback; also scan all values for valid email format
    - Call `\App\Models\User::updateOrCreate(['userNumber' => $studentNumber], ['name' => ..., 'email' => ..., 'password' => Hash::make($studentNumber), 'role' => 'student', 'status' => 'active', 'must_change_password' => true])`
    - Wrap `Mail::to($email)->send(new \App\Mail\StudentCredentialsMail([...]))` in try/catch that logs errors without re-throwing
    - Log warning when no email is found; skip mail dispatch but do not crash
    - Add `use Illuminate\Support\Facades\Hash;` import to the controller
    - _Bug_Condition: isBugCondition(input) where input.status == 'approved' AND no User exists for resolvedStudentNumber(enrollee)_
    - _Expected_Behavior: User::updateOrCreate called with studentNumber; StudentCredentialsMail dispatched to enrollee email_
    - _Preservation: All non-approved status paths in updateStatus remain unchanged; reject() method untouched_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Approval Creates User Account and Sends Credentials Email
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Approved Status Updates Remain Side-Effect Free
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
