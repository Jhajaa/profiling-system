# Bugfix Requirements Document

## Introduction

When an admin approves a submitted student enrollment form, the student does not receive a credentials email. This contrasts with the "new student" module where credentials are sent successfully via `StudentCredentialsMail`. The approval flow in `EnrolleeController::updateStatus` updates the enrollee's status to `approved` but never triggers any email dispatch, leaving the student without their login credentials.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an admin approves an enrollee (sets status to `approved`) THEN the system updates the status in the database but does NOT send a credentials email to the student
1.2 WHEN the approval is processed THEN the system does NOT create a user account for the enrollee, so no login credentials exist to send

### Expected Behavior (Correct)

2.1 WHEN an admin approves an enrollee THEN the system SHALL create a user account for the enrollee (using their student number as username and initial password) and send a `StudentCredentialsMail` to the student's email address
2.2 WHEN an admin approves an enrollee and no email address can be resolved from the enrollee's `dynamic_data` THEN the system SHALL log a warning and complete the approval without crashing

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an admin rejects an enrollee THEN the system SHALL CONTINUE TO send an `EnrollmentRejectedMail` to the student's email address as it does today
3.2 WHEN an admin creates a student directly via the new student module THEN the system SHALL CONTINUE TO send a `StudentCredentialsMail` as it does today
3.3 WHEN an enrollee's status is updated to any value other than `approved` THEN the system SHALL CONTINUE TO only update the status without sending a credentials email
3.4 WHEN the credentials email fails to send during approval THEN the system SHALL CONTINUE TO complete the approval (status update and user creation) and log the error without returning a failure response
