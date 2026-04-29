<?php
$url = 'http://127.0.0.1:8000/api/send-enrollee-email';
$data = ['email' => 'sanvicentech23@gmail.com', 'name' => 'John Doe', 'code' => 'ABC12345'];

$options = [
    'http' => [
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($data)
    ]
];
$context  = stream_context_create($options);
$result = @file_get_contents($url, false, $context);
if ($result === FALSE) {
    echo "Error:\n";
    print_r(error_get_last());
} else {
    echo "Success:\n$result";
}
