<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Student;
use Carbon\Carbon;

class InjectStudentsSeeder extends Seeder
{
    public function run()
    {
        $names = [
            "Maristella Celis",
            "Chriszanne Baril",
            "James Puada",
            "Christian Quitoles",
            "Shanner Orcasitas",
            "Chariz Panginen",
            "Lourdan Marana",
            "godwin Artes",
            "Aaron Malana",
            "Thristan Brillantes"
        ];

        $courses = ['IT', 'CS', 'IS'];
        $yearLevels = ['1st year', '2nd year', '3rd year', '4th year'];
        $sections = ['A', 'B', 'C', 'D'];
        $genders = ['Male', 'Female'];

        $count = 1;
        foreach ($names as $fullName) {
            $parts = explode(' ', $fullName, 2);
            $firstName = $parts[0];
            $lastName = isset($parts[1]) ? $parts[1] : '';
            
            // Format godwin to Godwin
            $firstName = ucfirst($firstName);
            $lastName = ucfirst($lastName);

            $studentNumber = '230' . str_pad($count + 500, 4, '0', STR_PAD_LEFT);
            $email = strtolower($firstName) . '.' . strtolower($lastName) . '@student.edu.ph';
            $email = str_replace(' ', '', $email);
            
            $dynamicData = [
                'Student Number' => $studentNumber,
                'First Name' => $firstName,
                'Middle Name' => '',
                'Last Name' => $lastName,
                'Email Address' => $email,
                'Course' => $courses[array_rand($courses)],
                'Year Level' => $yearLevels[array_rand($yearLevels)],
                'Section' => $sections[array_rand($sections)],
                'Gender' => $genders[array_rand($genders)],
                'Date of Birth' => Carbon::now()->subYears(rand(18, 22))->subMonths(rand(1, 12))->format('Y-m-d'),
                'Contact Number' => '09' . rand(100000000, 999999999),
                'Civil Status' => 'Single',
                'Nationality' => 'Filipino',
                'Religion' => 'Catholic',
                'Home Address' => 'Calamba, Laguna',
            ];

            Student::create([
                'dateRegistered' => now()->format('Y-m-d'),
                'dynamic_data' => $dynamicData,
                'is_archived' => false,
            ]);

            $count++;
        }
    }
}
