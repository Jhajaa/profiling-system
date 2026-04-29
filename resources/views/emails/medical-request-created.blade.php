<!DOCTYPE html>
<html>
<head>
    <title>New Medical Document Request</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { width: 80%; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { background: #dc3545; color: #fff; padding: 10px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .footer { text-align: center; font-size: 0.8em; color: #777; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Action Required: Medical Document Request</h1>
        </div>
        <div class="content">
            <p>Hello <strong>{{ $medicalRequest->studentName }}</strong>,</p>
            <p>A new medical document has been requested from you by the admin.</p>
            <p><strong>Record Type:</strong> {{ $medicalRequest->recordType }}</p>
            <p><strong>Reason:</strong> {{ $medicalRequest->reason }}</p>
            <p><strong>Urgency:</strong> {{ $medicalRequest->urgency }}</p>
            @if($medicalRequest->deadline)
                <p><strong>Deadline:</strong> {{ \Carbon\Carbon::parse($medicalRequest->deadline)->format('M d, Y') }}</p>
            @endif
            <p><strong>Notes:</strong> {{ $medicalRequest->notes }}</p>
            <p>Please log in to your student portal to upload the requested document.</p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Profiling System. All rights reserved.
        </div>
    </div>
</body>
</html>
