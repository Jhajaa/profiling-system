<!DOCTYPE html>
<html>
<head>
    <title>Medical Request Fulfilled</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { width: 80%; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { background: #28a745; color: #fff; padding: 10px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .footer { text-align: center; font-size: 0.8em; color: #777; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Medical Request Fulfilled</h1>
        </div>
        <div class="content">
            <p>A medical request has been fulfilled by <strong>{{ $medicalRequest->studentName }}</strong> ({{ $medicalRequest->studentNumber }}).</p>
            <p><strong>Record Type:</strong> {{ $medicalRequest->recordType }}</p>
            <p><strong>Fulfilled At:</strong> {{ \Carbon\Carbon::parse($medicalRequest->fulfilled_at)->format('M d, Y H:i') }}</p>
            <p><strong>Student Notes:</strong> {{ $medicalRequest->notes }}</p>
            <p>You can view and download the document from the admin panel.</p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Profiling System. All rights reserved.
        </div>
    </div>
</body>
</html>
