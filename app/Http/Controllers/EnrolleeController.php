<?php

namespace App\Http\Controllers;

use App\Models\Enrollee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EnrolleeController extends Controller
{
    public function index()
    {
        return response()->json(Enrollee::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'code' => 'required|string|unique:enrollees',
            'dynamic_data' => 'nullable|array',
            'status' => 'nullable|string',
        ]);

        $enrollee = Enrollee::create([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'dynamic_data' => $validated['dynamic_data'] ?? [],
            'status' => $validated['status'] ?? 'pending',
        ]);

        return response()->json($enrollee, 201);
    }

    public function verify($code)
    {
        $enrollee = Enrollee::where('code', $code)
            ->where('status', 'pending')
            ->first();

        if (!$enrollee) {
            return response()->json(['message' => 'Invalid or expired code'], 404);
        }

        return response()->json($enrollee);
    }

    public function submit(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'submission' => 'required|array',
        ]);

        $enrollee = Enrollee::where('code', $validated['code'])->firstOrFail();
        
        $enrollee->update([
            'submission' => $validated['submission'],
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // If this is an existing student performing a profiling update, 
        // sync their student-side status as well.
        $student = \App\Models\Student::where('dynamic_data->accessCode', $validated['code'])->first();
        if ($student) {
            $dData = $student->dynamic_data ?? [];
            $dData['profileStatus'] = 'submitted_for_review';
            $student->update(['dynamic_data' => $dData]);
        }

        return response()->json($enrollee);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        $enrollee = Enrollee::findOrFail($id);
        $enrollee->update(['status' => $validated['status']]);

        $student = null;
        if ($validated['status'] === 'approved') {
            // Support override data from frontend if provided
            $submission = $request->input('overrideData', $enrollee->submission ?? []);
            if (!is_array($submission)) $submission = [];
            
            // Sync current submission to enrollee if it was overridden
            if ($request->has('overrideData')) {
                $enrollee->update(['submission' => $submission]);
            }

            $nested       = (array)($submission['dynamic_data'] ?? []);
            $dynamicData  = (array)($enrollee->dynamic_data ?? []);

            $studentNumber = $submission['studentNumber'] ?? $submission['Student Number'] ?? $submission['student_number']
                ?? $nested['Student Number'] ?? $nested['studentNumber'] ?? $nested['student_number']
                ?? $dynamicData['Student Number'] ?? $dynamicData['studentNumber'] ?? $dynamicData['student_number']
                ?? null;

            $email = $submission['emailAddress'] ?? $submission['Email Address'] ?? $submission['Personal Email Address'] ?? $submission['email']
                ?? $nested['Email Address'] ?? $nested['Personal Email Address'] ?? $nested['email']
                ?? $dynamicData['Email Address'] ?? $dynamicData['Personal Email Address'] ?? $dynamicData['email']
                ?? null;

            // Aggressive email scan across all layers if still not found
            if (!$email) {
                $allValues = array_merge(array_values($submission), array_values($nested), array_values($dynamicData));
                foreach ($allValues as $value) {
                    if (is_string($value) && filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $email = $value;
                        break;
                    }
                }
            }

            $name = $submission['firstName'] ?? $submission['First Name'] ?? $nested['First Name'] ?? $dynamicData['First Name'] ?? $enrollee->name ?? 'Student';
            $lastName = $submission['lastName'] ?? $submission['Last Name'] ?? $nested['Last Name'] ?? $dynamicData['Last Name'] ?? '';
            $fullName = trim($name . ' ' . $lastName) ?: $enrollee->name;

            Log::debug('APPROVAL DEBUG resolved: studentNumber=' . ($studentNumber ?? 'NULL') . ' email=' . ($email ?? 'NULL'));

            if ($studentNumber) {
                // First check if user exists by student number or email to avoid unique email violations
                $existingUser = \App\Models\User::where('userNumber', $studentNumber)
                    ->orWhere('email', $email)
                    ->first();

                if ($existingUser) {
                    $existingUser->update([
                        'name'                => $fullName,
                        'email'               => $email,
                        'role'                => 'student',
                        'status'              => 'active',
                        'userNumber'          => $studentNumber,
                        'must_change_password' => true,
                    ]);
                } else {
                    \App\Models\User::create([
                        'userNumber'          => $studentNumber,
                        'name'                => $fullName,
                        'email'               => $email,
                        'password'            => Hash::make($studentNumber),
                        'role'                => 'student',
                        'status'              => 'active',
                        'must_change_password' => true,
                    ]);
                }

                // Create or Update Student record
                $student = \App\Models\Student::where('dynamic_data->accessCode', $enrollee->code)->first();
                
                if (!$student && $studentNumber) {
                    // Aggressive search for existing student by student number in dynamic_data
                    $student = \App\Models\Student::where('dynamic_data->Student Number', $studentNumber)
                        ->orWhere('dynamic_data->studentNumber', $studentNumber)
                        ->orWhere('dynamic_data->student_number', $studentNumber)
                        ->first();
                }

                $fullDynamicData = array_merge((array)$dynamicData, (array)$nested, (array)$submission);
                unset($fullDynamicData['dynamic_data']);
                if (isset($fullDynamicData['submission'])) unset($fullDynamicData['submission']);
                $fullDynamicData['profileStatus'] = 'done';

                if ($student) {
                    $sData = array_merge((array)($student->dynamic_data ?? []), (array)$fullDynamicData);
                    $student->update(['dynamic_data' => $sData]);
                    Log::info('Updated existing student record on approval: ' . $student->id);
                } else {
                    $student = \App\Models\Student::create([
                        'dynamic_data' => $fullDynamicData,
                        'dateRegistered' => now()->format('Y-m-d')
                    ]);
                    Log::info('Created new student record on approval for: ' . $fullName);
                }

                if ($email) {
                    try {
                        Mail::to($email)->send(new \App\Mail\StudentCredentialsMail([
                            'name'           => $fullName,
                            'email'          => $email,
                            'student_number' => $studentNumber,
                            'password'       => $studentNumber,
                            'url'            => url('/login'),
                        ]));
                    } catch (\Exception $e) {
                        Log::error('Failed to send student credentials email during approval: ' . $e->getMessage());
                    }
                } else {
                    Log::warning('No email address found for enrollee approval: ' . $fullName);
                }
            }
        }

        return response()->json([
            'enrollee' => $enrollee,
            'student' => $student
        ]);
    }

    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        $enrollee = Enrollee::findOrFail($id);
        
        $enrollee->update([
            'status' => 'rejected',
            'rejection_note' => $validated['reason']
        ]);

        // Update the linked student record's profileStatus to 'rejected'
        $submission   = $enrollee->submission   ?? [];
        $nested       = (array)($submission['dynamic_data'] ?? []);
        $dynamicData  = (array)($enrollee->dynamic_data ?? []);

        $studentNumber = $submission['studentNumber'] ?? $submission['Student Number'] ?? $submission['student_number']
            ?? $nested['Student Number'] ?? $nested['studentNumber']
            ?? $dynamicData['Student Number'] ?? $dynamicData['studentNumber']
            ?? null;

        $student = \App\Models\Student::where('dynamic_data->accessCode', $enrollee->code)->first();
        if (!$student && $studentNumber) {
            $student = \App\Models\Student::where('dynamic_data->Student Number', $studentNumber)
                ->orWhere('dynamic_data->studentNumber', $studentNumber)
                ->first();
        }
        if ($student) {
            $sData = array_merge((array)($student->dynamic_data ?? []), ['profileStatus' => 'rejected']);
            $student->update(['dynamic_data' => $sData]);
        }

        // Recover email for notification
        $email = $submission['emailAddress'] ?? $submission['Email Address'] ?? $submission['Personal Email Address'] ?? $submission['email']
            ?? $nested['Email Address'] ?? $nested['Personal Email Address'] ?? $nested['email']
            ?? $dynamicData['Email Address'] ?? $dynamicData['Personal Email Address'] ?? $dynamicData['email']
            ?? null;

        if (!$email) {
            $allValues = array_merge(array_values($submission), array_values($nested), array_values($dynamicData));
            foreach ($allValues as $value) {
                if (is_string($value) && filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $email = $value;
                    break;
                }
            }
        }

        if ($email) {
            try {
                Mail::to($email)->send(new \App\Mail\EnrollmentRejectedMail([
                    'name' => $enrollee->name,
                    'reason' => $validated['reason']
                ]));
                Log::info("Rejection email sent to: " . $email);
            } catch (\Exception $e) {
                Log::error("Failed to send rejection email: " . $e->getMessage());
            }
        } else {
            Log::warning("No email found for enrollee rejection: " . $enrollee->name);
        }

        return response()->json([
            'enrollee' => $enrollee,
            'student' => $student
        ]);
    }

    public function regenerateCode($id)
    {
        $enrollee = Enrollee::findOrFail($id);
        
        // Generate a new unique 8-character code
        $newCode = strtoupper(\Illuminate\Support\Str::random(8));
        while (Enrollee::where('code', $newCode)->exists()) {
            $newCode = strtoupper(\Illuminate\Support\Str::random(8));
        }

        $oldCode = $enrollee->code;

        $enrollee->update([
            'code' => $newCode,
            'status' => 'pending', 
            'submission' => null,  
            'rejection_note' => null
        ]);

        // Find the linked student and reset their profileStatus + update accessCode
        $student = \App\Models\Student::where('dynamic_data->accessCode', $oldCode)->first();

        if (!$student) {
            // Fallback: find by student number from dynamic_data
            $studentNumber = ($enrollee->dynamic_data['Student Number'] ?? $enrollee->dynamic_data['studentNumber'] ?? null);
            if ($studentNumber) {
                $student = \App\Models\Student::where('dynamic_data->Student Number', $studentNumber)
                    ->orWhere('dynamic_data->studentNumber', $studentNumber)
                    ->first();
            }
        }

        if ($student) {
            $sData = array_merge((array)($student->dynamic_data ?? []), [
                'profileStatus' => 'pending_form',
                'accessCode'    => $newCode,
            ]);
            $student->update(['dynamic_data' => $sData]);
            Log::info("Reset student profileStatus to pending_form and updated accessCode to {$newCode}");
        }

        // Send email with new code
        $submission   = [];  // submission was cleared above
        $dynamicData  = (array)($enrollee->dynamic_data ?? []);

        $email = $dynamicData['Email Address'] ?? $dynamicData['Personal Email Address'] ?? $dynamicData['email'] ?? null;

        if (!$email && $student) {
            $email = ($student->dynamic_data['Email Address'] ?? $student->dynamic_data['Personal Email Address'] ?? $student->dynamic_data['email'] ?? null);
        }

        if ($email) {
            try {
                Mail::to($email)->send(new \App\Mail\StudentInvitationMail([
                    'name' => $enrollee->name,
                    'code' => $newCode,
                    'url'  => url('/enrollment-portal')
                ]));
                Log::info("Regenerated code email sent to: " . $email);
            } catch (\Exception $e) {
                Log::error("Failed to send regenerated code email: " . $e->getMessage());
            }
        }

        return response()->json(['enrollee' => $enrollee, 'student' => $student]);
    }

    public function destroy($id)
    {
        $enrollee = Enrollee::findOrFail($id);
        $enrollee->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
