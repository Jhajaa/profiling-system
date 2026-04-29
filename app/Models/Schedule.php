<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $table = 'schedules';

    protected $guarded = [];

    // Map camelCase frontend fields to snake_case DB columns when reading
    protected $appends = [];

    public function toArray()
    {
        $array = parent::toArray();

        // Map snake_case DB columns to camelCase for frontend compatibility
        if (isset($array['faculty_id']) && !isset($array['facultyId'])) {
            $array['facultyId'] = $array['faculty_id'];
        }
        if (isset($array['year_level']) && !isset($array['yearLevel'])) {
            $array['yearLevel'] = $array['year_level'];
        }
        if (isset($array['start_time']) && !isset($array['startTime'])) {
            $array['startTime'] = $array['start_time'];
        }
        if (isset($array['end_time']) && !isset($array['endTime'])) {
            $array['endTime'] = $array['end_time'];
        }

        return $array;
    }

    public function faculty()
    {
        return $this->belongsTo(Faculty::class, 'faculty_id');
    }
}
