<!DOCTYPE html>
<html>
<head>
    <title>New Student Registered</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { width: 80%; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { background: #007bff; color: #fff; padding: 10px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .footer { text-align: center; font-size: 0.8em; color: #777; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #eee; padding: 8px; text-align: left; }
        th { background: #f4f4f4; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Student Registered</h1>
        </div>
        <div class="content">
            <p>A new student has been successfully registered in the system.</p>
            <h3>Student Details:</h3>
            <table>
                <tr><th>Registration Date</th><td>{{ $student->dateRegistered }}</td></tr>
                @isset($student->dynamic_data)
                    @foreach($student->dynamic_data as $key => $value)
                        @if(!is_array($value))
                            <tr><th>{{ ucwords(str_replace('_', ' ', $key)) }}</th><td>{{ $value }}</td></tr>
                        @endif
                    @endforeach
                @endisset
            </table>
            <p>You can view more details in the admin dashboard.</p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Profiling System. All rights reserved.
        </div>
    </div>
</body>
</html>
