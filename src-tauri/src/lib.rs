use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tokio::process::Command as TokioCommand;
use tokio::time::timeout;

const SIDECAR_TIMEOUT_MS: u64 = 20_000;

#[derive(Debug, Serialize)]
struct SidecarResult {
    output: String,
    error: String,
}

/// Поиск стороннего Chez Scheme: сначала переменная окружения ZCHEMER_CHEZ,
/// затем известные пути установки, затем PATH.
fn resolve_scheme_exe() -> Option<PathBuf> {
    if let Ok(custom) = std::env::var("ZCHEMER_CHEZ") {
        let path = PathBuf::from(custom);
        if path.is_file() {
            return Some(path);
        }
    }

    const KNOWN_PATHS: &[&str] = &[
        // Локальная установка Chez 10.4.1 (x86): bin/i3nt/scheme.exe
        r"C:\Program Files (x86)\Chez Scheme 10.4.1\bin\i3nt\scheme.exe",
        // Стандартные пути установки Chez (x64)
        r"C:\Program Files\Chez Scheme\bin\i3nt\scheme.exe",
    ];
    for candidate in KNOWN_PATHS {
        let path = PathBuf::from(candidate);
        if path.is_file() {
            return Some(path);
        }
    }

    // PATH-поиск: scheme, scheme.exe, chezscheme
    if let Some(path_var) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&path_var) {
            for name in ["scheme", "scheme.exe", "chezscheme"] {
                let candidate = dir.join(name);
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
        }
    }

    None
}

async fn run_chez_process(exe: &Path, script_path: &Path) -> Result<SidecarResult, String> {
    let child = TokioCommand::new(exe)
        .arg("--script")
        .arg(script_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|err| format!("Не удалось запустить sidecar Chez: {err}"))?;

    let process = async {
        let output = child
            .wait_with_output()
            .await
            .map_err(|err| format!("Не удалось дождаться sidecar Chez: {err}"))?;
        Ok::<_, String>(SidecarResult {
            output: String::from_utf8_lossy(&output.stdout).to_string(),
            error: String::from_utf8_lossy(&output.stderr).to_string(),
        })
    };

    match timeout(Duration::from_millis(SIDECAR_TIMEOUT_MS), process).await {
        Ok(result) => result,
        Err(_elapsed) => Err(
            "Программа не завершилась за 20 секунд (возможно, незакрытая скобка, бесконечный цикл \
             или ожидание сети)."
                .into(),
        ),
    }
}

#[tauri::command]
async fn run_chez_sidecar(source: String) -> Result<SidecarResult, String> {
    let exe = resolve_scheme_exe().ok_or_else(|| {
        "Sidecar Chez Scheme не найден. Установите Chez Scheme либо укажите путь в переменной \
         окружения ZCHEMER_CHEZ (например, путь к scheme.exe)."
            .to_string()
    })?;

    let tmp = tempfile::Builder::new()
        .prefix("zchmer_")
        .suffix(".sps")
        .tempfile()
        .map_err(|err| format!("Не удалось создать временный файл: {err}"))?;
    let script_path = tmp.path().to_path_buf();
    std::fs::write(&script_path, &source)
        .map_err(|err| format!("Не удалось записать программу во временный файл: {err}"))?;

    let result = run_chez_process(&exe, &script_path).await;
    let _ = tmp.close();
    result
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").into()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![app_version, run_chez_sidecar])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chez_exe() -> Option<PathBuf> {
        resolve_scheme_exe()
    }

    #[test]
    fn resolves_an_existing_chez() {
        // Тест полагается на установку Chez в известных местах; если её нет,
        // резолвер честно вернёт None — энд-ту-энд проверка недоступна.
        if let Some(exe) = chez_exe() {
            assert!(exe.is_file());
        }
    }

    #[tokio::test]
    async fn runs_script_and_captures_stdout() {
        let Some(exe) = chez_exe() else {
            eprintln!("sidecar Chez не найден — пропускаем e2e-проверку");
            return;
        };
        let tmp = tempfile::Builder::new()
            .prefix("zchmer_test_")
            .suffix(".sps")
            .tempfile()
            .expect("tempfile");
        std::fs::write(tmp.path(), "(display (* 6 7)) (newline)").expect("write");
        let result = run_chez_process(&exe, tmp.path())
            .await
            .expect("run sidecar");
        assert_eq!(result.output.trim(), "42");
        assert_eq!(result.error, "");
    }

    #[tokio::test]
    async fn forwards_errors_to_stderr() {
        let Some(exe) = chez_exe() else {
            eprintln!("sidecar Chez не найден — пропускаем e2e-проверку");
            return;
        };
        let tmp = tempfile::Builder::new()
            .prefix("zchmer_test_")
            .suffix(".sps")
            .tempfile()
            .expect("tempfile");
        std::fs::write(tmp.path(), "(car 1)").expect("write");
        let result = run_chez_process(&exe, tmp.path())
            .await
            .expect("run sidecar");
        assert_eq!(result.output, "");
        assert!(result.error.contains("car"), "stderr: {}", result.error);
    }

    #[tokio::test]
    async fn times_out_on_infinite_loop() {
        let Some(exe) = chez_exe() else {
            eprintln!("sidecar Chez не найден — пропускаем e2e-проверку");
            return;
        };
        let tmp = tempfile::Builder::new()
            .prefix("zchmer_test_")
            .suffix(".sps")
            .tempfile()
            .expect("tempfile");
        std::fs::write(tmp.path(), "(let loop () (loop))").expect("write");
        let result = run_chez_process(&exe, tmp.path()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("20 секунд"));
    }
}