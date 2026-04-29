<?php

use Illuminate\Support\Facades\Route;

// Serve the React SPA entrypoint for all web routes.
Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '.*');
