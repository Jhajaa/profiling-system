<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\StudentRegistered;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::query();

        // Default to showing only non-archived students unless specified
        if ($request->has('archived')) {
            $query->where('is_archived', true);
        } else {
            $query->where('is_archived', false);
        }

        if ($request->has('filters') && is_array($request->input('filters'))) {
            foreach ($request->input('filters') as $key => $value) {
                if (!empty($value)) {
                    $query->where(function ($q) use ($key, $value) {
                        $q->where('dynamic_data->' . $key, 'LIKE', '%' . $value . '%')
                          ->orWhereJsonContains('dynamic_data->' . $key, $value);
                    });
                }
            }
        }

        return response()->json($query->get(), 200);
    }

    public function store(Request $request)
    {
        try {
            $dynamicData = [];

            if ($request->hasFile('dynamic_data')) {
                foreach ($request->file('dynamic_data') as $key => $file) {
                    $dynamicData[$key] = $file->store('dynamic_files', 'public');
                }
            }

            $inputDynamic = $request->input('dynamic_data');
            if (is_array($inputDynamic)) {
                foreach ($inputDynamic as $k => $v) {
                    if (!isset($dynamicData[$k])) {
                        $dynamicData[$k] = $v;
                    }
                }
            }

            $student = Student::create([
                'dateRegistered' => now()->format('Y-m-d'),
                'dynamic_data'   => $dynamicData,
                'is_archived'    => false,
            ]);

            // Create user account for the student
            // Extract info with multiple fallback keys
            $studentNumber = $request->input('studentNumber') 
                ?? $dynamicData['Student Number'] 
                ?? $dynamicData['studentNumber'] 
                ?? $dynamicData['student_number'] 
                ?? null;

            $studentEmail = $request->input('emailAddress')
                ?? $request->input('email')
                ?? $dynamicData['Personal Email Address']
                ?? $dynamicData['Email Address']
                ?? $dynamicData['email']
                ?? $dynamicData['email_address']
                ?? null;

            $firstName = $request->input('firstName') ?? $dynamicData['First Name'] ?? $dynamicData['firstName'] ?? '';
            $lastName = $request->input('lastName') ?? $dynamicData['Last Name'] ?? $dynamicData['lastName'] ?? '';
            $studentName = trim($firstName . ' ' . $lastName) ?: ($dynamicData['Student Full Name'] ?? 'Student');

            // Even more aggressive email discovery
            if (!$studentEmail) {
                foreach ($dynamicData as $key => $value) {
                    if (is_string($value) && filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $studentEmail = $value;
                        break;
                    }
                }
            }

            if ($studentNumber) {
                // Use the student number as their initial default password
                $generatedCode = $studentNumber;

                // Create or update user account for the student
                // We use a more robust logic to handle potential duplicate emails from previous half-failed attempts
                $userData = [
                    'name' => $studentName,
                    'email' => $studentEmail,
                    'password' => \Illuminate\Support\Facades\Hash::make($generatedCode),
                    'role' => 'student',
                    'status' => 'active',
                    'must_change_password' => true,
                ];

                $existingUserByEmail = $studentEmail ? \App\Models\User::where('email', $studentEmail)->first() : null;
                $existingUserByNumber = \App\Models\User::where('userNumber', $studentNumber)->first();

                if ($existingUserByNumber) {
                    // Update existing student account
                    $existingUserByNumber->update($userData);
                } else if ($existingUserByEmail) {
                    // Update user who has this email (maybe they were added manually or are a returning student)
                    $existingUserByEmail->update(array_merge($userData, ['userNumber' => $studentNumber]));
                } else {
                    // Create new
                    \App\Models\User::create(array_merge($userData, ['userNumber' => $studentNumber]));
                }

                // Send email to the student with the generated code and login link
                if ($studentEmail) {
                    \Log::info("Attempting to send credentials email to: " . $studentEmail);
                    try {
                        $loginUrl = url('/login'); 
                        
                        $emailDetails = [
                            'name' => $studentName,
                            'email' => $studentEmail,
                            'student_number' => $studentNumber,
                            'password' => $studentNumber,
                            'url' => $loginUrl
                        ];
                        
                        Mail::to($studentEmail)->send(new \App\Mail\StudentCredentialsMail($emailDetails));
                        \Log::info("Credentials email dispatched (queued) for: " . $studentEmail);
                    } catch (\Exception $e) {
                        \Log::error('Failed to send student credentials email: ' . $e->getMessage());
                    }
                } else {
                    \Log::warning("No email address found for student approval: " . $studentName);
                }
            }

            // Send notification to admin
            $adminEmail = env('MAIL_ADMIN_ADDRESS', 'admin@example.com');
            try {
                Mail::to($adminEmail)->send(new StudentRegistered($student));
            } catch (\Exception $e) {
                // Log error but don't fail the registration
                \Log::error('Failed to send student registration email: ' . $e->getMessage());
            }

            return response()->json($student, 201);
        } catch (\Exception $e) {
            \Log::error('Critical error in StudentController@store: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'message' => 'Error saving student',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $student = Student::findOrFail($id);
            return response()->json($student, 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Student not found'], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $student = Student::findOrFail($id);
            $existingData = $student->dynamic_data ?? [];
            $dynamicData  = is_array($existingData) ? $existingData : [];

            $inputDynamic = $request->input('dynamic_data');
            if (is_array($inputDynamic)) {
                foreach ($inputDynamic as $k => $v) {
                    $dynamicData[$k] = $v;
                }
            }

            if ($request->hasFile('dynamic_data')) {
                foreach ($request->file('dynamic_data') as $key => $file) {
                    $dynamicData[$key] = $file->store('dynamic_files', 'public');
                }
            }

            $student->update(['dynamic_data' => $dynamicData]);

            return response()->json($student, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error updating student',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function archive($id)
    {
        try {
            $student = Student::findOrFail($id);
            $student->update(['is_archived' => true]);
            return response()->json(['message' => 'Archived successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error archiving student'], 500);
        }
    }

    public function restore($id)
    {
        try {
            $student = Student::findOrFail($id);
            $student->update(['is_archived' => false]);
            return response()->json(['message' => 'Restored successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error restoring student'], 500);
        }
    }

    public function bulkArchive(Request $request)
    {
        try {
            $ids = $request->input('ids', []);
            if (empty($ids)) return response()->json(['message' => 'No IDs provided'], 400);

            Student::whereIn('id', $ids)->update(['is_archived' => true]);
            return response()->json(['message' => 'Bulk archived successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error in bulk archiving'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            Student::findOrFail($id)->delete();
            return response()->json(['message' => 'Deleted successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error deleting student'], 500);
        }
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'new_password' => 'required|string|min:8',
            'current_password' => 'nullable|string',
        ]);

        $user = auth()->user();
        if (!$user) {
            $userId = $request->input('user_id');
            if ($userId) $user = \App\Models\User::find($userId);
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Verify current password if provided (for manual changes)
        if ($request->has('current_password') && $request->current_password) {
            if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $user->password)) {
                return response()->json(['message' => 'Current password is incorrect.'], 422);
            }
        }

        $user->update([
            'password' => \Illuminate\Support\Facades\Hash::make($request->new_password),
            'must_change_password' => false,
        ]);

        return response()->json(['message' => 'Password updated successfully'], 200);
    }

    public function sendEnrolleeEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'name' => 'required|string',
            'code' => 'required|string',
        ]);

        try {
            // Provide the direct link to the frontend enrollment portal without appending the code
            $loginUrl = url('/enrollment-portal'); 
            
            $emailDetails = [
                'name' => $request->name,
                'email' => $request->email,
                'code' => $request->code,
                'url' => $loginUrl
            ];
            
            \Illuminate\Support\Facades\Mail::to($request->email)->send(new \App\Mail\StudentInvitationMail($emailDetails));
            return response()->json(['message' => 'Email sent successfully']);
        } catch (\Exception $e) {
            \Log::error('Failed to send enrollee email: ' . $e->getMessage());
            return response()->json(['message' => 'Error sending email', 'error' => $e->getMessage()], 500);
        }
    }

    public function generateCode(Request $request, $id)
    {
        try {
            $student = Student::findOrFail($id);
            $dynamicData = $student->dynamic_data ?? [];

            // Discovery email
            $discoveryEmail = $dynamicData['Personal Email Address'] 
                ?? $dynamicData['Email Address'] 
                ?? $dynamicData['email'] 
                ?? $dynamicData['email_address']
                ?? null;

            // Generate unique code
            $code = strtoupper(\Illuminate\Support\Str::random(8));
            while (\App\Models\Enrollee::where('code', $code)->exists()) {
                $code = strtoupper(\Illuminate\Support\Str::random(8));
            }

            // Update student - store these in dynamic_data since columns don't exist
            $dData = $student->dynamic_data ?? [];
            $dData['accessCode'] = $code;
            $dData['profileStatus'] = 'pending_form';
            $student->update(['dynamic_data' => $dData]);

            // Create/Update Enrollee record so the portal can verify it
            $studentName = trim(($dynamicData['First Name'] ?? '') . ' ' . ($dynamicData['Last Name'] ?? '')) ?: $student->name;
            
            \App\Models\Enrollee::updateOrCreate(
                ['name' => $studentName],
                [
                    'code' => $code,
                    'status' => 'pending',
                    'submission' => null,
                    'dynamic_data' => $dynamicData
                ]
            );

            if ($discoveryEmail) {
                \Illuminate\Support\Facades\Mail::to($discoveryEmail)->send(new \App\Mail\StudentInvitationMail([
                    'name' => $studentName,
                    'code' => $code,
                    'url'  => url('/enrollment-portal')
                ]));
                \Log::info("Regenerated profiling code and emailed: " . $discoveryEmail);
            }

            return response()->json([
                'student' => $student,
                'code' => $code,
                'email_sent' => (bool)$discoveryEmail
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Error generating student access code: ' . $e->getMessage());
            return response()->json(['message' => 'Error generating code'], 500);
        }
    }
}