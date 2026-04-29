<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'userNumber' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('userNumber', $request->userNumber)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid user number or password.'], 401);
        }

        if ($user->status === 'archived') {
            return response()->json(['message' => 'Your account has been archived.'], 403);
        }

        // Load relations if needed
        $user->load('group');

        return response()->json([
            'user' => $user,
            // Since we are not using Sanctum/Passport yet, we just return the user object 
            // as the frontend expects. In a real app we'd return a token.
        ]);
    }
}
