<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Load fields that have a db_column mapping (these are the ones we'll migrate)
        $fields = DB::table('dynamic_fields')->whereNotNull('db_column')->get();

        if ($fields->isEmpty()) {
            // Nothing to migrate - already done or nothing seeded
            return;
        }

        // 2. Move existing student row data into dynamic_data JSON
        DB::table('students')->orderBy('id')->chunk(100, function ($students) use ($fields) {
            foreach ($students as $student) {
                $dynamicData = [];
                if (!empty($student->dynamic_data)) {
                    $decoded = json_decode($student->dynamic_data, true);
                    if (is_array($decoded)) $dynamicData = $decoded;
                }

                foreach ($fields as $field) {
                    $col = $field->db_column;
                    // Access property safely 
                    $val = property_exists($student, $col) ? $student->$col : null;
                    if ($val !== null && $val !== '') {
                        $dynamicData[$field->name] = $val;
                    }
                }

                DB::table('students')->where('id', $student->id)->update([
                    'dynamic_data' => json_encode($dynamicData)
                ]);
            }
        });

        // 3. Drop the old rigid columns
        $columnsToDrop = $fields->pluck('db_column')->toArray();

        Schema::table('students', function (Blueprint $table) use ($columnsToDrop) {
            // Drop the unique index on studentNumber first using raw SQL (works in all Laravel versions)
            try {
                DB::statement('ALTER TABLE students DROP INDEX students_studentnumber_unique');
            } catch (\Exception $e) {
                // Index may already be dropped or named differently, continue
            }

            $table->dropColumn($columnsToDrop);
        });

        // 4. Unlock all fields - they are no longer tied to specific DB columns
        DB::table('dynamic_fields')->update([
            'is_system' => false,
            'db_column'  => null,
        ]);
    }

    /**
     * Reverse the migrations.
     * Note: Data cannot be safely reversed without a backup.
     */
    public function down(): void
    {
        //
    }
};
