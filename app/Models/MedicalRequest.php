<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'recordType',
        'reason',
        'urgency',
        'notes',
        'studentId',
        'studentName',
        'studentNumber',
        'email',
        'contact',
        'status',
        'submittedAt',
        // File upload fields
        'file_path',
        'file_name',
        'file_size',
        'file_mime',
        // Request targeting fields
        'request_type',
        'requested_by_user_id',
        'requested_by_name',
        'deadline',
        'fulfilled_at',
        'viewed_at',
    ];

    protected $casts = [
        'submittedAt'  => 'datetime',
        'deadline'     => 'datetime',
        'fulfilled_at' => 'datetime',
        'viewed_at'    => 'datetime',
        'file_size'    => 'integer',
    ];

    // ─── Scopes ───────────────────────────────────────────────────────────────

    /** Requests that were sent TO a specific student (admin-to-student). */
    public function scopeForStudent($query, int $studentId)
    {
        return $query->where('studentId', $studentId)
                     ->where('request_type', 'admin_request');
    }

    /** Documents that the student themselves uploaded. */
    public function scopeUploadsForStudent($query, int $studentId)
    {
        return $query->where('studentId', $studentId)
                     ->where('request_type', 'student_upload');
    }

    /** Requests that are still pending student fulfillment. */
    public function scopePending($query)
    {
        return $query->where('status', 'Pending');
    }

    /** Requests that have been fulfilled (document uploaded). */
    public function scopeFulfilled($query)
    {
        return $query->where('status', 'Fulfilled');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** True when a file is attached. */
    public function hasFile(): bool
    {
        return !empty($this->file_path);
    }

    /** Human-readable file size. */
    public function getFileSizeReadableAttribute(): string
    {
        if (!$this->file_size) return '—';
        $kb = $this->file_size / 1024;
        if ($kb < 1024) return round($kb, 1) . ' KB';
        return round($kb / 1024, 2) . ' MB';
    }
}