<?php

namespace Tests\Feature;

use App\Mail\StudentCredentialsMail;
use App\Models\Enrollee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Property 1: Bug Condition - Approval Does Not Create User or Send Credentials Email
 *
 * CRITICAL: This test MUST FAIL on unfixed code.
 * Failure confirms the bug exists: updateStatus with 'approved' does not create a User
 * or dispatch StudentCredentialsMail.
 *
 * Bug Condition (C): updateStatus called with status='approved' for an enrollee
 *   that has not yet received login credentials.
 * Expected Behavior (P): User record created via User::updateOrCreate AND
 *   StudentCredentialsMail dispatched to enrollee's email.
 *
 * Requirements: 1.1, 1.2
 */
class EnrolleeApprovalBugConditionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Scoped PBT: concrete failing case — enrollee with student number and email in submission.
     * On unfixed code: FAILS (no approval branch exists).
     * After fix: PASSES (confirms bug is resolved).
     */
    public function test_approving_enrollee_creates_user_and_sends_credentials_email(): void
    {
        Mail::fake();

        $enrollee = Enrollee::create([
            'name'       => 'Juan dela Cruz',
            'code'       => 'ENR-2024-0001',
            'status'     => 'submitted',
            'submission' => [
                'Student Number'        => '2024-0001',
                'Personal Email Address' => 'juan@example.com',
                'First Name'            => 'Juan',
                'Last Name'             => 'dela Cruz',
            ],
        ]);

        $response = $this->patchJson("/api/enrollees/{$enrollee->id}/status", [
            'status' => 'approved',
        ]);

        $response->assertStatus(200);

        // Assert User account was created
        $this->assertTrue(
            User::where('userNumber', '2024-0001')->exists(),
            'Counterexample: User::where("userNumber", "2024-0001")->exists() returned false — no account created'
        );

        // Assert credentials email was dispatched
        Mail::assertSent(StudentCredentialsMail::class, function ($mail) {
            return $mail->hasTo('juan@example.com');
        });
    }

    /**
     * Scoped PBT: enrollee stores data in dynamic_data instead of submission.
     * On unfixed code: FAILS.
     * After fix: PASSES.
     */
    public function test_approving_enrollee_with_dynamic_data_creates_user_and_sends_email(): void
    {
        Mail::fake();

        $enrollee = Enrollee::create([
            'name'         => 'Maria Santos',
            'code'         => 'ENR-2024-0002',
            'status'       => 'submitted',
            'dynamic_data' => [
                'Student Number'        => '2024-0002',
                'Personal Email Address' => 'maria@example.com',
            ],
        ]);

        $response = $this->patchJson("/api/enrollees/{$enrollee->id}/status", [
            'status' => 'approved',
        ]);

        $response->assertStatus(200);

        $this->assertTrue(
            User::where('userNumber', '2024-0002')->exists(),
            'Counterexample: User not created from dynamic_data'
        );

        Mail::assertSent(StudentCredentialsMail::class, function ($mail) {
            return $mail->hasTo('maria@example.com');
        });
    }

    /**
     * Scoped PBT: enrollee has student number but no email.
     * On unfixed code: FAILS (no User created).
     * After fix: PASSES — User created, no crash, warning logged.
     * Requirements: 2.2
     */
    public function test_approving_enrollee_with_no_email_creates_user_without_crashing(): void
    {
        Mail::fake();

        $enrollee = Enrollee::create([
            'name'       => 'No Email Student',
            'code'       => 'ENR-2024-0003',
            'status'     => 'submitted',
            'submission' => [
                'Student Number' => '2024-0003',
            ],
        ]);

        $response = $this->patchJson("/api/enrollees/{$enrollee->id}/status", [
            'status' => 'approved',
        ]);

        $response->assertStatus(200);

        $this->assertTrue(
            User::where('userNumber', '2024-0003')->exists(),
            'Counterexample: User not created when email is absent'
        );

        Mail::assertNotSent(StudentCredentialsMail::class);
    }
}
