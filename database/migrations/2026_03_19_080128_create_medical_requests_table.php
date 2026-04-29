<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('medical_requests', function (Blueprint $table) {
            $table->id();
            $table->string('recordType')->nullable();
            $table->string('reason')->nullable();
            $table->string('urgency')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('studentId')->nullable();
            $table->string('studentName')->nullable();
            $table->string('studentNumber')->nullable();
            $table->string('email')->nullable();
            $table->string('contact')->nullable();
            $table->string('status')->default('Pending');
            $table->timestamp('submittedAt')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('medical_requests');
    }
};
