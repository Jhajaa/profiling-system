<?php

namespace App\Http\Controllers;

use App\Models\UserGroup;
use Illuminate\Http\Request;

class UserGroupController extends Controller
{
    public function index()
    {
        return response()->json(UserGroup::with('users')->get());
    }

    public function store(Request $request)
    {
        $group = UserGroup::create($request->all());
        return response()->json($group, 201);
    }

    public function show($id)
    {
        $group = UserGroup::findOrFail($id);
        return response()->json($group);
    }

    public function update(Request $request, $id)
    {
        $group = UserGroup::findOrFail($id);
        $group->update($request->all());
        return response()->json($group);
    }

    public function destroy($id)
    {
        $group = UserGroup::findOrFail($id);
        $group->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
