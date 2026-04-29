<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class Add22StudentsSeeder extends Seeder
{
    public function run()
    {
        $studentsData = [
            ['First Name' => 'Ricardo', 'Last Name' => 'Gomez', 'Middle Name' => 'S.', 'Gender' => 'Male'],
            ['First Name' => 'Angelica', 'Last Name' => 'Santos', 'Middle Name' => 'M.', 'Gender' => 'Female'],
            ['First Name' => 'Fernando', 'Last Name' => 'Reyes', 'Middle Name' => 'P.', 'Gender' => 'Male'],
            ['First Name' => 'Carmela', 'Last Name' => 'Bautista', 'Middle Name' => 'L.', 'Gender' => 'Female'],
            ['First Name' => 'Dominador', 'Last Name' => 'Cruz', 'Middle Name' => 'A.', 'Gender' => 'Male'],
            ['First Name' => 'Estrella', 'Last Name' => 'Garcia', 'Middle Name' => 'D.', 'Gender' => 'Female'],
            ['First Name' => 'Leopoldo', 'Last Name' => 'Mendoza', 'Middle Name' => 'V.', 'Gender' => 'Male'],
            ['First Name' => 'Marites', 'Last Name' => 'Villanueva', 'Middle Name' => 'R.', 'Gender' => 'Female'],
            ['First Name' => 'Rogelio', 'Last Name' => 'Ramos', 'Middle Name' => 'T.', 'Gender' => 'Male'],
            ['First Name' => 'Teresita', 'Last Name' => 'Lopez', 'Middle Name' => 'W.', 'Gender' => 'Female'],
            ['First Name' => 'Wilfredo', 'Last Name' => 'Torres', 'Middle Name' => 'Z.', 'Gender' => 'Male'],
            ['First Name' => 'Zenaida', 'Last Name' => 'Panganiban', 'Middle Name' => 'B.', 'Gender' => 'Female'],
            ['First Name' => 'Benjamin', 'Last Name' => 'Salcedo', 'Middle Name' => 'C.', 'Gender' => 'Male'],
            ['First Name' => 'Corazon', 'Last Name' => 'Evangelista', 'Middle Name' => 'E.', 'Gender' => 'Female'],
            ['First Name' => 'Danilo', 'Last Name' => 'Soriano', 'Middle Name' => 'F.', 'Gender' => 'Male'],
            ['First Name' => 'Elena', 'Last Name' => 'Madrigal', 'Middle Name' => 'G.', 'Gender' => 'Female'],
            ['First Name' => 'Francisco', 'Last Name' => 'Javier', 'Middle Name' => 'H.', 'Gender' => 'Male'],
            ['First Name' => 'Gloria', 'Last Name' => 'Arroyo', 'Middle Name' => 'I.', 'Gender' => 'Female'],
            ['First Name' => 'Hernando', 'Last Name' => 'Cortez', 'Middle Name' => 'J.', 'Gender' => 'Male'],
            ['First Name' => 'Isabel', 'Last Name' => 'Daza', 'Middle Name' => 'K.', 'Gender' => 'Female'],
            ['First Name' => 'Jerome', 'Last Name' => 'Ponce', 'Middle Name' => 'O.', 'Gender' => 'Male'],
            ['First Name' => 'Katrina', 'Last Name' => 'Halili', 'Middle Name' => 'Q.', 'Gender' => 'Female'],
        ];

        $courses = ['IT', 'CS'];
        $yearLevels = ['1st year', '2nd year', '3rd year', '4th year'];
        $sections = ['A', 'B', 'C', 'D'];
        $count = 1;

        foreach ($studentsData as $data) {
            $studentNumber = '240' . str_pad($count + 100, 4, '0', STR_PAD_LEFT);
            $email = strtolower($data['First Name']) . '.' . strtolower($data['Last Name']) . $count . '@example.com';
            
            $dynamicData = [
                'Student Number' => $studentNumber,
                'First Name' => $data['First Name'],
                'Middle Name' => $data['Middle Name'],
                'Last Name' => $data['Last Name'],
                'Gender' => $data['Gender'],
                'Email Address' => $email,
                'Course' => $courses[array_rand($courses)],
                'Year Level' => $yearLevels[array_rand($yearLevels)],
                'Section' => $sections[array_rand($sections)],
                'Date of Birth' => Carbon::now()->subYears(rand(18, 22))->subMonths(rand(1, 12))->format('Y-m-d'),
                'Contact Number' => '09' . rand(100000000, 999999999),
                'Civil Status' => 'Single',
                'Nationality' => 'Filipino',
                'Religion' => 'Catholic',
                'Home Address' => 'Calamba, Laguna',
                'Residency' => 'Local',
                'profileStatus' => 'done',
            ];

            // Create Student
            $student = Student::create([
                'dateRegistered' => now()->format('Y-m-d'),
                'dynamic_data' => $dynamicData,
                'is_archived' => false,
            ]);

            // Create User Account
            User::create([
                'userNumber' => $studentNumber,
                'name' => $data['First Name'] . ' ' . $data['Last Name'],
                'email' => $email,
                'password' => Hash::make($studentNumber),
                'role' => 'student',
                'status' => 'active',
                'must_change_password' => true,
            ]);

            $count++;
        }
    }
}
