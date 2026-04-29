
import os

log_path = r'g:\DOWNLOAD\profiling-system 25042026\profiling-system 4142026\profiling-system 452026\storage\logs\laravel.log'
output_path = r'g:\DOWNLOAD\profiling-system 25042026\profiling-system 4142026\profiling-system 452026\last_error.txt'

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        
    last_error = []
    found = False
    for i in range(len(lines)-1, -1, -1):
        if 'local.ERROR' in lines[i]:
            last_error = lines[i:i+20]
            found = True
            break
            
    with open(output_path, 'w', encoding='utf-8') as f:
        if found:
            f.writelines(last_error)
        else:
            f.write("No local.ERROR found in logs.")
else:
    with open(output_path, 'w') as f:
        f.write("Log file not found.")
