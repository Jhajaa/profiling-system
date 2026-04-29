<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = [
            [
                'userNumber' => 'ADMIN001',
                'name' => 'Admin User',
                'email' => 'admin@pnc.edu.ph',
                'role' => 'admin',
                'status' => 'active',
                'password' => Hash::make('admin123'),
            ],
            [
                'userNumber' => '#2203343',
                'name' => 'Ayumi Angel Hara',
                'email' => 'ayumi.hara@student.edu.ph',
                'role' => 'student',
                'status' => 'active',
                'password' => Hash::make('student123'),
            ],
            [
                'userNumber' => '#0000001',
                'name' => 'Bea L. Jagorin',
                'email' => 'bea.jagorin@pnc.edu.ph',
                'role' => 'faculty',
                'status' => 'active',
                'password' => Hash::make('faculty123'),
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['userNumber' => $userData['userNumber']],
                $userData
            );
        }
    }
}
