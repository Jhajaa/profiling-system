<?php

namespace App\Http\Controllers;

use App\Models\Faculty;
use Illuminate\Http\Request;

class FacultyController extends Controller
{
    public function index()
    {
        return response()->json(Faculty::all());
    }

    public function store(Request $request)
    {
        $faculty = Faculty::create($request->all());
        return response()->json($faculty, 201);
    }

    public function update(Request $request, $id)
    {
        $faculty = Faculty::findOrFail($id);
        $faculty->update($request->all());
        return response()->json($faculty);
    }

    public function destroy($id)
    {
        $faculty = Faculty::findOrFail($id);
        $faculty->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
