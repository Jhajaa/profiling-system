<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invitation to Enroll</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f4f7f6;
            margin: 0;
            padding: 0;
            color: #333333;
        }
        .wrapper {
            width: 100%;
            background-color: #f4f7f6;
            padding: 40px 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content p {
            font-size: 16px;
            line-height: 1.6;
            color: #4b5563;
            margin: 0 0 20px 0;
        }
        .highlight-box {
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
        }
        .highlight-box table {
            width: 100%;
        }
        .highlight-box td {
            font-size: 16px;
            padding: 8px 0;
        }
        .highlight-box td.label {
            color: #64748b;
            font-weight: 500;
            width: 100px;
        }
        .highlight-box td.value {
            color: #0f172a;
            font-weight: 700;
            font-family: monospace;
            font-size: 18px;
        }
        .button-container {
            text-align: center;
            margin-top: 35px;
        }
        .button {
            display: inline-block;
            background-color: #3b82f6;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            background-color: #f1f5f9;
            color: #94a3b8;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>Invitation to Enroll</h1>
            </div>
            <div class="content">
                <p>Hello <strong>{{ $details['name'] }}</strong>,</p>
                <p>You have been invited to enroll in the Student Profiling System. Please use the access code below to access the enrollment portal and complete your information.</p>
                
                <div class="highlight-box">
                    <table>
                        <tr>
                            <td class="label">Access Code:</td>
                            <td class="value">{{ $details['code'] }}</td>
                        </tr>
                    </table>
                </div>
                
                <p>Please click the button below to go to the enrollment portal and enter your code.</p>

                <div class="button-container">
                    <a href="{{ $details['url'] }}" class="button" style="color: #ffffff;">Go to Enrollment Portal</a>
                </div>
            </div>
            <div class="footer">
                &copy; {{ date('Y') }} Student Profiling System. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>
