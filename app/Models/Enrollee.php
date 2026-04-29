<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollee extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'status',
        'dynamic_data',
        'submission',
        'submitted_at',
        'rejection_note',
    ];

    protected $casts = [
        'dynamic_data' => 'array',
        'submission' => 'array',
        'submitted_at' => 'datetime',
    ];
}
