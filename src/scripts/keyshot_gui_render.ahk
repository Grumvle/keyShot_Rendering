; KeyShot GUI 자동화 스크립트
; 사용법: keyshot_gui_render.ahk "파일경로" "출력경로" 폭 높이 샘플수

; 매개변수 받기
InputFile := A_Args[1]
OutputFile := A_Args[2]
Width := A_Args[3]
Height := A_Args[4]
Samples := A_Args[5]

; KeyShot 실행
Run, "C:\Program Files\KeyShot12\bin\keyshot.exe"
WinWaitActive, KeyShot, , 30
if ErrorLevel {
    FileAppend, ERROR: KeyShot 실행 실패`n, CONOUT$
    ExitApp, 1
}

Sleep, 3000

; 파일 열기 (Ctrl+O)
Send, ^o
WinWaitActive, 열기, , 10
if ErrorLevel {
    FileAppend, ERROR: 파일 열기 대화상자 실패`n, CONOUT$
    ExitApp, 1
}

; 파일 경로 입력
Send, %InputFile%
Send, {Enter}
Sleep, 5000

; 카메라 설정
Send, ^{F5}
WinWaitActive, 카메라, , 5
if ErrorLevel {
    ; 영어 버전일 경우
    Send, ^{F5}
    WinWaitActive, Camera, , 5
}

; 해상도 설정
Send, {Tab}{Tab}{Tab}
Send, ^a
Send, %Width%
Send, {Tab}
Send, ^a
Send, %Height%
Send, {Enter}
Sleep, 1000

; 렌더링 설정
Send, ^{F6}
WinWaitActive, 렌더링, , 5
if ErrorLevel {
    ; 영어 버전일 경우
    Send, ^{F6}
    WinWaitActive, Rendering, , 5
}

; 샘플 수 설정
Send, {Tab}{Tab}{Tab}{Tab}
Send, ^a
Send, %Samples%
Send, {Enter}
Sleep, 1000

; 렌더링 시작 (F9)
Send, {F9}
Sleep, 2000

; 렌더링 완료 대기 (렌더링 윈도우가 나타날 때까지)
WinWaitActive, 렌더링, , 300
if ErrorLevel {
    WinWaitActive, Rendering, , 300
}

; 렌더링 완료 확인 (프로그레스 바가 사라질 때까지)
Loop {
    PixelGetColor, color, 500, 300
    if (color = 0xFFFFFF) {
        break
    }
    Sleep, 1000
}

; 이미지 저장 (Ctrl+S)
Send, ^s
WinWaitActive, 저장, , 10
if ErrorLevel {
    WinWaitActive, Save, , 10
}

; 출력 파일 경로 입력
Send, %OutputFile%
Send, {Enter}
Sleep, 2000

; KeyShot 종료
Send, !{F4}

FileAppend, SUCCESS: 렌더링 완료`n, CONOUT$
ExitApp, 0