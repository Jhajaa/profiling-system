<?php

namespace Database\Seeders;

use App\Models\Faculty;
use Illuminate\Database\Seeder;

class FacultySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faculty = [];

        foreach ($faculty as $facultyData) {
            Faculty::updateOrCreate(
                ['facultyNumber' => $facultyData['facultyNumber']],
                $facultyData
            );
        }
    }
}
