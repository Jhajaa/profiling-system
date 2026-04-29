<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds file upload support and admin-to-student request targeting.
     */
    public function up()
    {
        Schema::table('medical_requests', function (Blueprint $table) {
            // File upload fields (student-uploaded PDFs)
            $table->string('file_path')->nullable()->after('notes');
            $table->string('file_name')->nullable()->after('file_path');
            $table->unsignedBigInteger('file_size')->nullable()->after('file_name'); // bytes
            $table->string('file_mime')->nullable()->after('file_size');

            // Admin-to-student request targeting
            $table->string('request_type')->default('admin_request')->after('status');
            // Values: 'admin_request' (admin asks student), 'student_upload' (student self-uploads)

            $table->unsignedBigInteger('requested_by_user_id')->nullable()->after('request_type');
            $table->string('requested_by_name')->nullable()->after('requested_by_user_id');

            $table->timestamp('deadline')->nullable()->after('requested_by_name');
            $table->timestamp('fulfilled_at')->nullable()->after('deadline');
            $table->timestamp('viewed_at')->nullable()->after('fulfilled_at'); // when student viewed the request
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('medical_requests', function (Blueprint $table) {
            $table->dropColumn([
                'file_path', 'file_name', 'file_size', 'file_mime',
                'request_type', 'requested_by_user_id', 'requested_by_name',
                'deadline', 'fulfilled_at', 'viewed_at',
            ]);
        });
    }
};