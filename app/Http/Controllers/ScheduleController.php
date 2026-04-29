<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index()
    {
        return response()->json(Schedule::all());
    }

    public function store(Request $request)
    {
        $data = $this->normalizeData($request->all());
        $schedule = Schedule::create($data);
        return response()->json($schedule, 201);
    }

    public function update(Request $request, $id)
    {
        $schedule = Schedule::findOrFail($id);
        $data = $this->normalizeData($request->all());
        $schedule->update($data);
        return response()->json($schedule);
    }

    public function destroy($id)
    {
        $schedule = Schedule::findOrFail($id);
        $schedule->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    /**
     * Normalize camelCase frontend fields to snake_case DB columns.
     */
    private function normalizeData(array $data): array
    {
        $mapped = [];

        $fieldMap = [
            'facultyId'  => 'faculty_id',
            'yearLevel'  => 'year_level',
            'startTime'  => 'start_time',
            'endTime'    => 'end_time',
            'subject'    => 'subject',
            'section'    => 'section',
            'room'       => 'room',
            'day'        => 'day',
            'program'    => 'program',
            'color'      => 'color',
        ];

        foreach ($data as $key => $value) {
            $dbKey = $fieldMap[$key] ?? $key;
            $mapped[$dbKey] = $value;
        }

        // Handle program_id: if frontend sends program as string (e.g. "BSIT"), store it
        // and keep program_id as null unless explicitly provided
        if (!isset($mapped['program_id'])) {
            $mapped['program_id'] = null;
        }
        if (!isset($mapped['faculty_id'])) {
            $mapped['faculty_id'] = null;
        }

        return $mapped;
    }
}
