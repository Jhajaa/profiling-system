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
        Schema::create('faculty', function (Blueprint $table) {
            $table->id();
            $table->string('facultyNumber')->unique()->nullable();
            $table->string('lastName')->nullable();
            $table->string('firstName')->nullable();
            $table->string('middleName')->nullable();
            $table->string('position')->nullable();
            $table->string('gender')->nullable();
            $table->string('status')->nullable();
            $table->string('dateRegistered')->nullable();
            $table->date('dateOfBirth')->nullable();
            $table->string('civilStatus')->nullable();
            $table->string('nationality')->nullable();
            $table->string('religion')->nullable();
            $table->string('residency')->nullable();
            $table->string('specialization')->nullable();
            $table->string('homeAddress')->nullable();
            $table->string('contactNumber')->nullable();
            $table->string('altContactNumber')->nullable();
            $table->string('emailAddress')->nullable();
            $table->string('lastSchool')->nullable();
            $table->string('lastYearAttended')->nullable();
            $table->string('honors')->nullable();
            $table->string('highestDegree')->nullable();
            $table->string('yearCompleted')->nullable();
            $table->string('fatherName')->nullable();
            $table->string('fatherOccupation')->nullable();
            $table->string('fatherDob')->nullable();
            $table->string('fatherContact')->nullable();
            $table->string('motherName')->nullable();
            $table->string('motherOccupation')->nullable();
            $table->string('motherDob')->nullable();
            $table->string('motherContact')->nullable();
            $table->integer('siblings')->nullable();
            $table->string('annualIncome')->nullable();
            $table->string('guardianName')->nullable();
            $table->string('guardianContact')->nullable();
            $table->string('guardianRelation')->nullable();
            $table->json('medicalRecord')->nullable();
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
        Schema::dropIfExists('faculty');
    }
};
