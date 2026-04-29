<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Enrollment Form Update Required</title>
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
            background: linear-gradient(135deg, #e74c3c, #c0392b);
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
        .reason-box {
            background-color: #fffaf0;
            border-left: 4px solid #e74c3c;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
            font-style: italic;
        }
        .info-box {
            background-color: #f1f5f9;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            color: #64748b;
            margin-top: 30px;
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
                <h1>Enrollment Update Required</h1>
            </div>
            <div class="content">
                <p>Hello <strong>{{ $details['name'] }}</strong>,</p>
                <p>We have reviewed your enrollment submission, but some information needs to be corrected or updated.</p>
                
                <p><strong>Reason for Return:</strong></p>
                <div class="reason-box">
                    {{ $details['reason'] }}
                </div>
                
                <p>Please note that your access code is no longer active. To request a new code and resubmit your form, you need to go to the <strong>department office</strong>.</p>

                <div class="info-box">
                    If you have any questions, please visit the admissions office or call our support line.
                </div>
            </div>
            <div class="footer">
                &copy; {{ date('Y') }} Student Profiling System. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>
