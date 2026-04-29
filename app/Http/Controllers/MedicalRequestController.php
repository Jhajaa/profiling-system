<?php
namespace App\Http\Controllers;
use App\Models\MedicalRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\MedicalRequestCreated;
use App\Mail\MedicalRequestFulfilled;
class MedicalRequestController extends Controller
{
 // ■■■ Constants ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 const MAX_FILE_SIZE_MB = 10; // 10 MB per file
 const MAX_UPLOADS_PER_STUDENT = 5; // limit self-uploads
 const ALLOWED_MIME_TYPES = ['application/pdf'];
 const ALLOWED_EXTENSIONS = ['pdf'];
 const STORAGE_DISK = 'local'; // stored in storage/app/medical
 const STORAGE_PATH = 'medical';
 // ■■■ List all requests ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 public function index(Request $request)
 {
 $query = MedicalRequest::query();
 // Optional filters
 if ($request->filled('studentId')) {
 $query->where('studentId', $request->studentId);
 }
 if ($request->filled('status')) {
 $query->where('status', $request->status);
 }
 if ($request->filled('request_type')) {
 $query->where('request_type', $request->request_type);
 }
 return response()->json($query->orderBy('created_at', 'desc')->get());
 }
 // ■■■ Admin sends a request to a student ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 public function store(Request $request)
 {
 $validated = $request->validate([
 'studentId' => 'required|integer',
 'studentName' => 'required|string|max:255',
 'studentNumber' => 'required|string|max:50',
 'email' => 'nullable|email|max:255',
 'contact' => 'nullable|string|max:30',
 'recordType' => 'required|string|max:255',
 'reason' => 'required|string|max:500',
 'urgency' => 'required|in:Routine (5-7 days),Urgent (2-3 days),Emergency (Same day)',
 'notes' => 'nullable|string|max:1000',
 'deadline' => 'nullable|date|after:today',
 'requested_by_name' => 'nullable|string|max:255',
 ]);
 $record = MedicalRequest::create([
 ...$validated,
 'status' => 'Pending',
 'request_type' => 'admin_request',
 'submittedAt' => now(),
 ]);

 // Send email to student if email is provided
 if ($record->email) {
 try {
 Mail::to($record->email)->send(new MedicalRequestCreated($record));
 } catch (\Exception $e) {
 \Log::error('Failed to send medical request email to student: ' . $e->getMessage());
 }
 }

 return response()->json($record, 201);
 }
 // ■■■ Student uploads their own medical certificate / document ■■■■■■■■■■■■■
 public function uploadDocument(Request $request)
 {
 $request->validate([
 'studentId' => 'required|integer',
 'studentNumber' => 'required|string|max:50',
 'studentName' => 'required|string|max:255',
 'recordType' => 'required|string|max:255',
 'notes' => 'nullable|string|max:500',
 'file' => [
 'required',
 'file',
 'mimes:pdf',
 'max:' . (self::MAX_FILE_SIZE_MB * 1024), // KB for Laravel's max rule
 ],
 ]);
 // ■■ Limit: max uploads per student ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 $existingCount = MedicalRequest::uploadsForStudent($request->studentId)->count();
 if ($existingCount >= self::MAX_UPLOADS_PER_STUDENT) {
 return response()->json([
 'message' => "Upload limit reached. You may only have " . self::MAX_UPLOADS_PER_STUDENT . " documents
 uploaded at a time. Please delete an existing document before uploading a new one.",
 'code' => 'UPLOAD_LIMIT_REACHED',
 ], 422);
 }
 // ■■ Validate MIME from actual file content (not just extension) ■■■■■■■
 $file = $request->file('file');
 if (!in_array($file->getMimeType(), self::ALLOWED_MIME_TYPES)) {
 return response()->json([
 'message' => 'Only PDF files are accepted.',
 'code' => 'INVALID_MIME',
 ], 422);
 }
 // ■■ Store file ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 $safeName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
 $filename = $request->studentNumber . '_' . $safeName . '_' . time() . '.pdf';
 $path = $file->storeAs(self::STORAGE_PATH, $filename, self::STORAGE_DISK);
 $record = MedicalRequest::create([
 'studentId' => $request->studentId,
 'studentNumber' => $request->studentNumber,
 'studentName' => $request->studentName,
 'recordType' => $request->recordType,
 'notes' => $request->notes,
 'file_path' => $path,
 'file_name' => $file->getClientOriginalName(),
 'file_size' => $file->getSize(),
 'file_mime' => $file->getMimeType(),
 'request_type' => 'student_upload',
 'status' => 'Uploaded',
 'submittedAt' => now(),
 ]);
 return response()->json($record, 201);
 }
 // ■■■ Student replaces their uploaded medical document ■■■■■■■■■■■■■■■■■■■■■
 public function replaceUpload(Request $request, $id)
 {
 $medReq = MedicalRequest::findOrFail($id);
 if ($medReq->request_type !== 'student_upload') {
 return response()->json(['message' => 'Only student-uploaded documents can be replaced here.'], 422);
 }
 $request->validate([
 'recordType' => 'nullable|string|max:255',
 'notes' => 'nullable|string|max:500',
 'file' => [
 'required',
 'file',
 'mimes:pdf',
 'max:' . (self::MAX_FILE_SIZE_MB * 1024),
 ],
 ]);
 $file = $request->file('file');
 if (!in_array($file->getMimeType(), self::ALLOWED_MIME_TYPES)) {
 return response()->json([
 'message' => 'Only PDF files are accepted.',
 'code' => 'INVALID_MIME',
 ], 422);
 }
 if ($medReq->file_path && Storage::disk(self::STORAGE_DISK)->exists($medReq->file_path)) {
 Storage::disk(self::STORAGE_DISK)->delete($medReq->file_path);
 }
 $safeStudentNum = Str::slug($medReq->studentNumber ?? $request->studentNumber ?? 'student');
 $safeName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
 $filename = $safeStudentNum . '_' . $safeName . '_' . time() . '.pdf';
 $path = $file->storeAs(self::STORAGE_PATH, $filename, self::STORAGE_DISK);
 $medReq->update([
 'recordType' => $request->recordType ?: $medReq->recordType,
 'notes' => $request->has('notes') ? $request->notes : $medReq->notes,
 'file_path' => $path,
 'file_name' => $file->getClientOriginalName(),
 'file_size' => $file->getSize(),
 'file_mime' => $file->getMimeType(),
 'status' => 'Uploaded',
 'submittedAt' => now(),
 ]);
 return response()->json($medReq);
 }
 // ■■■ Student fulfills an admin request by uploading a PDF ■■■■■■■■■■■■■■■■■
 public function fulfillRequest(Request $request, $id)
 {
 $medReq = MedicalRequest::findOrFail($id);
 // Guard: only admin_request type can be fulfilled this way
 if ($medReq->request_type !== 'admin_request') {
 return response()->json(['message' => 'This is not an admin request.'], 422);
 }
 if ($medReq->status === 'Fulfilled') {
 return response()->json(['message' => 'This request has already been fulfilled.'], 422);
 }
 $request->validate([
 'file' => [
 'required',
 'file',
 'mimes:pdf',
 'max:' . (self::MAX_FILE_SIZE_MB * 1024),
 ],
 'notes' => 'nullable|string|max:500',
 ]);
 // Validate MIME from actual file content
 $file = $request->file('file');
 if (!in_array($file->getMimeType(), self::ALLOWED_MIME_TYPES)) {
 return response()->json([
 'message' => 'Only PDF files are accepted.',
 'code' => 'INVALID_MIME',
 ], 422);
 }
 // Remove previous file if exists
 if ($medReq->file_path && Storage::disk(self::STORAGE_DISK)->exists($medReq->file_path)) {
 Storage::disk(self::STORAGE_DISK)->delete($medReq->file_path);
 }
 $safeStudentNum = Str::slug($medReq->studentNumber ?? 'student');
 $filename = $safeStudentNum . '_fulfillment_' . $id . '_' . time() . '.pdf';
 $path = $file->storeAs(self::STORAGE_PATH, $filename, self::STORAGE_DISK);
 $medReq->update([
 'file_path' => $path,
 'file_name' => $file->getClientOriginalName(),
 'file_size' => $file->getSize(),
 'file_mime' => $file->getMimeType(),
 'status' => 'Fulfilled',
 'fulfilled_at' => now(),
 'notes' => $request->notes ?? $medReq->notes,
 ]);

 // Send notification to admin
 $adminEmail = env('MAIL_ADMIN_ADDRESS', 'admin@example.com');
 try {
 Mail::to($adminEmail)->send(new MedicalRequestFulfilled($medReq));
 } catch (\Exception $e) {
 \Log::error('Failed to send medical fulfillment email to admin: ' . $e->getMessage());
 }

 return response()->json($medReq);
 }
 // ■■■ Mark a request as viewed by the student ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 public function markViewed($id)
 {
 $medReq = MedicalRequest::findOrFail($id);
 if (!$medReq->viewed_at) {
 $medReq->update(['viewed_at' => now()]);
 }
 return response()->json($medReq);
 }
 // ■■■ Download / stream a PDF ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 public function download($id)
 {
 $medReq = MedicalRequest::findOrFail($id);
 if (!$medReq->file_path || !Storage::disk(self::STORAGE_DISK)->exists($medReq->file_path)) {
 return response()->json(['message' => 'File not found.'], 404);
 }
 $filename = $medReq->file_name ?: 'medical_document.pdf';
 return Storage::disk(self::STORAGE_DISK)->download($medReq->file_path, $filename);
 }
 public function view($id)
 {
 $medReq = MedicalRequest::findOrFail($id);
 if (!$medReq->file_path || !Storage::disk(self::STORAGE_DISK)->exists($medReq->file_path)) {
 return response()->json(['message' => 'File not found.'], 404);
 }
 $filename = $medReq->file_name ?: 'medical_document.pdf';
 return Storage::disk(self::STORAGE_DISK)->response($medReq->file_path, $filename, [
 'Content-Type' => $medReq->file_mime ?: 'application/pdf',
 'Content-Disposition' => 'inline; filename="' . $filename . '"',
 ]);
 }
 // ■■■ Update status / metadata (admin use) ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 public function update(Request $request, $id)
 {
 $medReq = MedicalRequest::findOrFail($id);
 $validated = $request->validate([
 'status' => 'sometimes|in:Pending,Fulfilled,Rejected,Cancelled,Reviewed',
 'notes' => 'sometimes|nullable|string|max:1000',
 'deadline' => 'sometimes|nullable|date',
 'urgency' => 'sometimes|in:Routine (5-7 days),Urgent (2-3 days),Emergency (Same day)',
 ]);
 $medReq->update($validated);
 return response()->json($medReq);
 }
 // ■■■ Delete a request / upload ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
 public function destroy($id)
 {
 $medReq = MedicalRequest::findOrFail($id);
 // Remove associated file from storage
 if ($medReq->file_path && Storage::disk(self::STORAGE_DISK)->exists($medReq->file_path)) {
 Storage::disk(self::STORAGE_DISK)->delete($medReq->file_path);
 }
 $medReq->delete();
 return response()->json(['message' => 'Deleted successfully.']);
 }
}
