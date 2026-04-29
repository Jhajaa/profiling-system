<?php

namespace App\Http\Controllers;

use App\Models\DynamicField;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DynamicFieldController extends Controller
{
    public function index()
    {
        return response()->json(DynamicField::orderBy('order_index')->get(), 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'type'       => 'required|string|in:short_text,long_text,paragraph,radio,select,checkbox,number,date,time,file,sections,email',
            'options'    => 'nullable|array',
            'is_required'=> 'boolean',
            'show_in_table'=> 'boolean',
            'order_index'=> 'integer',
            'section'    => 'nullable|string',
            'module'     => 'nullable|string',
        ]);

        $field = DynamicField::create($validated);
        return response()->json($field, 201);
    }

    public function update(Request $request, $id)
    {
        $field = DynamicField::find($id);
        
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'type'       => 'required|string|in:short_text,long_text,paragraph,radio,select,checkbox,number,date,time,file,sections,email',
            'options'    => 'nullable|array',
            'is_required'=> 'boolean',
            'show_in_table'=> 'boolean',
            'order_index'=> 'integer',
            'section'    => 'nullable|string',
            'module'     => 'nullable|string',
        ]);

        if (!$field) {
            $validated['id'] = $id;
            $field = DynamicField::create($validated);
            return response()->json($field, 200);
        }

        $oldName = $field->name;
        $newName = $validated['name'];

        // If label was renamed, propagate the key rename into every student's dynamic_data
        if ($oldName !== $newName) {
            DB::table('students')
                ->whereNotNull('dynamic_data')
                ->orderBy('id')
                ->chunk(100, function ($students) use ($oldName, $newName) {
                    foreach ($students as $student) {
                        $data = json_decode($student->dynamic_data, true);
                        if (is_array($data) && array_key_exists($oldName, $data)) {
                            $data[$newName] = $data[$oldName];
                            unset($data[$oldName]);
                            DB::table('students')
                                ->where('id', $student->id)
                                ->update(['dynamic_data' => json_encode($data)]);
                        }
                    }
                });
        }

        $field->update($validated);
        return response()->json($field, 200);
    }

    public function destroy($id)
    {
        $field = DynamicField::findOrFail($id);
        $field->delete();
        return response()->json(['message' => 'Deleted successfully'], 200);
    }

    public function reorder(Request $request)
    {
        $fields = $request->input('fields', []);
        foreach ($fields as $f) {
            if (isset($f['id'], $f['order_index'], $f['section'])) {
                DynamicField::where('id', $f['id'])->update([
                    'order_index' => $f['order_index'],
                    'section'     => $f['section']
                ]);
            }
        }
        return response()->json(['success' => true], 200);
    }
}
