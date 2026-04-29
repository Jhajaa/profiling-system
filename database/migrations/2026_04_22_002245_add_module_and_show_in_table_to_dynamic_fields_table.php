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
        Schema::table('dynamic_fields', function (Blueprint $table) {
            $table->string('module')->default('students');
            $table->boolean('show_in_table')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('dynamic_fields', function (Blueprint $table) {
            $table->dropColumn(['module', 'show_in_table']);
        });
    }
};
