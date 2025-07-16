import sys
import subprocess
import os

def main():
    if len(sys.argv) < 6:
        print("Usage: python render_gui.py <input_file> <output_file> <width> <height> <samples>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    width = sys.argv[3]
    height = sys.argv[4]
    samples = sys.argv[5]
    
    # AutoHotkey 스크립트 경로
    ahk_script = os.path.join(os.path.dirname(__file__), "keyshot_gui_render.ahk")
    
    # AutoHotkey 실행파일 경로 찾기
    ahk_paths = [
        "C:\\Program Files\\AutoHotkey\\AutoHotkey.exe",
        "C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey.exe",
        "C:\\Program Files (x86)\\AutoHotkey\\AutoHotkey.exe",
        "AutoHotkey.exe"  # PATH에 있는 경우
    ]
    
    ahk_exe = None
    for path in ahk_paths:
        if os.path.exists(path) or path == "AutoHotkey.exe":
            ahk_exe = path
            break
    
    if not ahk_exe:
        print("ERROR: AutoHotkey 실행파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    if not os.path.exists(ahk_script):
        print(f"ERROR: AutoHotkey 스크립트를 찾을 수 없습니다: {ahk_script}")
        sys.exit(1)
    
    print(f"AutoHotkey 실행파일: {ahk_exe}")
    print(f"AutoHotkey 스크립트: {ahk_script}")
    
    # AutoHotkey 실행
    try:
        result = subprocess.run([
            ahk_exe,
            ahk_script,
            input_file,
            output_file,
            width,
            height,
            samples
        ], capture_output=True, text=True, timeout=600)
        
        if result.returncode == 0:
            print("SUCCESS: 렌더링 완료")
        else:
            print(f"ERROR: 렌더링 실패 (코드: {result.returncode})")
            print(f"STDERR: {result.stderr}")
            sys.exit(1)
            
    except subprocess.TimeoutExpired:
        print("ERROR: 렌더링 시간 초과")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()