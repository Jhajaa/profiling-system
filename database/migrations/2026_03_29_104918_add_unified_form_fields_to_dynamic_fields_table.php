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
        Schema::table('dynamic_fields', function (Blueprint $table) {
            $table->string('section')->nullable()->default('Basic Information');
            $table->boolean('is_system')->default(false);
            $table->string('db_column')->nullable();
        });

        // Seed existing hardcoded fields into the unified form schema
        $systemFields = [
            // Basic Information
            ['name' => 'Student Number', 'type' => 'short_text', 'section' => 'Basic Information', 'db_column' => 'studentNumber', 'is_required' => true],
            ['name' => 'Date of Birth', 'type' => 'short_text', 'section' => 'Basic Information', 'db_column' => 'dateOfBirth', 'is_required' => true],
            ['name' => 'Last Name', 'type' => 'short_text', 'section' => 'Basic Information', 'db_column' => 'lastName', 'is_required' => true],
            ['name' => 'First Name', 'type' => 'short_text', 'section' => 'Basic Information', 'db_column' => 'firstName', 'is_required' => true],
            ['name' => 'Middle Name', 'type' => 'short_text', 'section' => 'Basic Information', 'db_column' => 'middleName', 'is_required' => false],
            ['name' => 'Gender', 'type' => 'select', 'options' => json_encode(['Male', 'Female', 'Other']), 'section' => 'Basic Information', 'db_column' => 'gender', 'is_required' => false],
            ['name' => 'Course', 'type' => 'select', 'options' => json_encode(['IT', 'CS', 'IS']), 'section' => 'Basic Information', 'db_column' => 'course', 'is_required' => false],
            ['name' => 'Year Level', 'type' => 'select', 'options' => json_encode(['1st year', '2nd year', '3rd year', '4th year']), 'section' => 'Basic Information', 'db_column' => 'yearLevel', 'is_required' => false],
            ['name' => 'Section', 'type' => 'select', 'options' => json_encode(['A', 'B', 'C', 'D']), 'section' => 'Basic Information', 'db_column' => 'section', 'is_required' => false],

            // Personal Details
            ['name' => 'Civil Status', 'type' => 'select', 'options' => json_encode(['Single', 'Married', 'Divorced', 'Widowed']), 'section' => 'Personal Details', 'db_column' => 'civilStatus', 'is_required' => false],
            ['name' => 'Nationality', 'type' => 'short_text', 'section' => 'Personal Details', 'db_column' => 'nationality', 'is_required' => false],
            ['name' => 'Religion', 'type' => 'short_text', 'section' => 'Personal Details', 'db_column' => 'religion', 'is_required' => false],
            ['name' => 'Residency', 'type' => 'short_text', 'section' => 'Personal Details', 'db_column' => 'residency', 'is_required' => false],

            // Contact Information
            ['name' => 'Email Address', 'type' => 'short_text', 'section' => 'Contact Information', 'db_column' => 'emailAddress', 'is_required' => true],
            ['name' => 'Contact Number', 'type' => 'short_text', 'section' => 'Contact Information', 'db_column' => 'contactNumber', 'is_required' => true],
            ['name' => 'Alt Contact Number', 'type' => 'short_text', 'section' => 'Contact Information', 'db_column' => 'altContactNumber', 'is_required' => false],
            ['name' => 'Home Address', 'type' => 'long_text', 'section' => 'Contact Information', 'db_column' => 'homeAddress', 'is_required' => false],

            // Educational Background
            ['name' => 'Last School Attended', 'type' => 'short_text', 'section' => 'Educational Background', 'db_column' => 'lastSchool', 'is_required' => false],
            ['name' => 'Last Year Attended', 'type' => 'short_text', 'section' => 'Educational Background', 'db_column' => 'lastYearAttended', 'is_required' => false],
            ['name' => 'Honors Received', 'type' => 'short_text', 'section' => 'Educational Background', 'db_column' => 'honors', 'is_required' => false],
            ['name' => 'LRN', 'type' => 'short_text', 'section' => 'Educational Background', 'db_column' => 'lrn', 'is_required' => false],

            // Family Background
            ['name' => 'Father\'s Name', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'fatherName', 'is_required' => false],
            ['name' => 'Father\'s Occupation', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'fatherOccupation', 'is_required' => false],
            ['name' => 'Father\'s DOB', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'fatherDob', 'is_required' => false],
            ['name' => 'Father\'s Contact', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'fatherContact', 'is_required' => false],
            ['name' => 'Mother\'s Name', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'motherName', 'is_required' => false],
            ['name' => 'Mother\'s Occupation', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'motherOccupation', 'is_required' => false],
            ['name' => 'Mother\'s DOB', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'motherDob', 'is_required' => false],
            ['name' => 'Mother\'s Contact', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'motherContact', 'is_required' => false],
            ['name' => 'Number of Siblings', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'siblings', 'is_required' => false],
            ['name' => 'Annual Family Income', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'annualIncome', 'is_required' => false],
            ['name' => 'Guardian\'s Name', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'guardianName', 'is_required' => false],
            ['name' => 'Guardian\'s Contact', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'guardianContact', 'is_required' => false],
            ['name' => 'Guardian\'s Relation', 'type' => 'short_text', 'section' => 'Family Background', 'db_column' => 'guardianRelation', 'is_required' => false],
        ];

        $order = 1;
        foreach ($systemFields as $field) {
            DB::table('dynamic_fields')->insert([
                'name' => $field['name'],
                'type' => $field['type'],
                'options' => $field['options'] ?? null,
                'is_required' => $field['is_required'],
                'order_index' => $order++,
                'section' => $field['section'],
                'is_system' => true,
                'db_column' => $field['db_column'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('dynamic_fields')->where('is_system', true)->delete();
        
        Schema::table('dynamic_fields', function (Blueprint $table) {
            $table->dropColumn(['section', 'is_system', 'db_column']);
        });
    }
};
