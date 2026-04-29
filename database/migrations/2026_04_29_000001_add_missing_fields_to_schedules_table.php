<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('schedules', function (Blueprint $table) {
            if (!Schema::hasColumn('schedules', 'subject')) {
                $table->string('subject')->nullable()->after('id');
            }
            if (!Schema::hasColumn('schedules', 'year_level')) {
                $table->string('year_level')->nullable()->after('subject');
            }
            if (!Schema::hasColumn('schedules', 'program')) {
                $table->string('program')->nullable()->after('year_level');
            }
            if (!Schema::hasColumn('schedules', 'color')) {
                $table->string('color')->nullable()->after('end_time');
            }
            // Make program_id and faculty_id nullable since frontend may send program as string
            if (Schema::hasColumn('schedules', 'program_id')) {
                $table->foreignId('program_id')->nullable()->change();
            }
            if (Schema::hasColumn('schedules', 'faculty_id')) {
                $table->foreignId('faculty_id')->nullable()->change();
            }
        });
    }

    public function down()
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn(['subject', 'year_level', 'program', 'color']);
        });
    }
};
