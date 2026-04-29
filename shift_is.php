<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Student;

$count = 0;
foreach(Student::all() as $s) {
    $data = is_array($s->dynamic_data) ? $s->dynamic_data : json_decode($s->dynamic_data, true);
    $changed = false;
    
    // Check various casing/keys
    foreach (['course', 'Course', 'program', 'Program'] as $k) {
        if (isset($data[$k]) && in_array($data[$k], ['IS', 'BSIS', 'Bachelor of Science in Information Systems'])) {
            $data[$k] = 'IT'; // Shift to IT
            $changed = true;
        }
    }
    
    if ($changed) {
        $s->dynamic_data = $data;
        $s->save();
        $count++;
    }
}
echo "Shifted $count students in the database.\n";
