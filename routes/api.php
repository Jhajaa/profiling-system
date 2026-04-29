<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\FacultyController;
use App\Http\Controllers\MedicalRequestController;
use App\Http\Controllers\UserGroupController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DynamicFieldController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EnrolleeController;
use App\Http\Controllers\ScheduleController;

Route::get('enrollees/verify/{code}', [EnrolleeController::class, 'verify']);
Route::post('enrollees/submit', [EnrolleeController::class, 'submit']);
Route::patch('enrollees/{id}/status', [EnrolleeController::class, 'updateStatus']);
Route::post('enrollees/{id}/reject', [EnrolleeController::class, 'reject']);
Route::post('enrollees/{id}/regenerate-code', [EnrolleeController::class, 'regenerateCode']);
Route::apiResource('enrollees', EnrolleeController::class);

Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:api')->get('/user', function (Request $request) {
 return $request->user();
});
Route::post('change-password', [StudentController::class, 'updatePassword']);
Route::post('students/bulk-archive', [StudentController::class, 'bulkArchive']);
Route::post('students/{id}/archive', [StudentController::class, 'archive']);
Route::post('students/{id}/restore', [StudentController::class, 'restore']);
Route::post('students/{id}/generate-code', [StudentController::class, 'generateCode']);
Route::post('send-enrollee-email', [StudentController::class, 'sendEnrolleeEmail']);
Route::apiResource('students', StudentController::class);
Route::apiResource('faculty', FacultyController::class);

// Standard CRUD (index, store, update, destroy) — existing behaviour preserved
Route::apiResource('medical-requests', MedicalRequestController::class);
// Student self-uploads a medical certificate / document (multipart/form-data)
Route::post('medical-requests/upload', [MedicalRequestController::class, 'uploadDocument']);
// Student replaces one of their own uploaded documents (multipart/form-data)
Route::post('medical-requests/{id}/replace-upload', [MedicalRequestController::class, 'replaceUpload']);
// Student fulfills an admin request by uploading a PDF (multipart/form-data)
Route::post('medical-requests/{id}/fulfill', [MedicalRequestController::class, 'fulfillRequest']);
// Mark a request as viewed by the student (clears notification badge)
Route::patch('medical-requests/{id}/viewed', [MedicalRequestController::class, 'markViewed']);
// Download / stream the attached PDF
Route::get('medical-requests/{id}/download', [MedicalRequestController::class, 'download']);
Route::get('medical-requests/{id}/view', [MedicalRequestController::class, 'view']);

Route::apiResource('user-groups', UserGroupController::class);
Route::apiResource('users', UserController::class);
Route::post('dynamic-fields/reorder', [DynamicFieldController::class, 'reorder']);
Route::apiResource('dynamic-fields', DynamicFieldController::class);
Route::apiResource('schedules', ScheduleController::class);
