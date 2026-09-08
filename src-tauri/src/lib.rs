use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
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

#[derive(Deserialize)]
struct ProjectLesson {
    id: String,
    starter: String,
}

#[derive(Serialize)]
struct LoadedProjectLesson {
    id: String,
    code: String,
}

/// Путь к каталогу проекта трека: appData/projects/<track>.
fn project_dir(app: &tauri::AppHandle, track_id: &str) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Не удалось определить каталог данных приложения: {err}"))?;
    Ok(base.join("projects").join(track_id))
}

/// Безопасное имя файла урока: <lessonId>.sps.
fn lesson_file_path(dir: &Path, lesson_id: &str) -> PathBuf {
    dir.join(format!("{lesson_id}.sps"))
}

/// Читает все *.sps файлы каталога, возвращает (lessonId, содержимое).
fn collect_sps_files(dir: &Path) -> Result<Vec<(String, String)>, String> {
    let mut out = Vec::new();
    if !dir.is_dir() {
        return Ok(out);
    }
    let entries = std::fs::read_dir(dir)
        .map_err(|err| format!("Не удалось прочитать каталог проекта: {err}"))?;
    for entry in entries {
        let entry = entry.map_err(|err| format!("Не удалось прочитать каталог проекта: {err}"))?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("sps") {
            continue;
        }
        let id = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        let code = std::fs::read_to_string(&path)
            .map_err(|err| format!("Не удалось прочитать {path:?}: {err}"))?;
        out.push((id, code));
    }
    Ok(out)
}

/// Создаёт рабочую директорию — Проект трека — и записывает стартовый код
/// уроков в файлы, которых ещё нет на диске. Возвращает путь к проекту.
#[tauri::command]
async fn ensure_track_project(
    app: tauri::AppHandle,
    track_id: String,
    lessons: Vec<ProjectLesson>,
) -> Result<String, String> {
    let dir = project_dir(&app, &track_id)?;
    std::fs::create_dir_all(&dir)
        .map_err(|err| format!("Не удалось создать каталог проекта: {err}"))?;
    for lesson in lessons {
        let file = lesson_file_path(&dir, &lesson.id);
        if !file.exists() {
            std::fs::write(&file, &lesson.starter)
                .map_err(|err| format!("Не удалось записать {file:?}: {err}"))?;
        }
    }
    Ok(dir.to_string_lossy().into_owned())
}

/// Читает код заданного урока из проекта трека (None — файла ещё нет).
#[tauri::command]
async fn read_track_lesson(
    app: tauri::AppHandle,
    track_id: String,
    lesson_id: String,
) -> Result<Option<String>, String> {
    let dir = project_dir(&app, &track_id)?;
    let file = lesson_file_path(&dir, &lesson_id);
    if !file.is_file() {
        return Ok(None);
    }
    let code = std::fs::read_to_string(&file)
        .map_err(|err| format!("Не удалось прочитать {file:?}: {err}"))?;
    Ok(Some(code))
}

/// Записывает код урока в файл Проекта трека.
#[tauri::command]
async fn write_track_lesson(
    app: tauri::AppHandle,
    track_id: String,
    lesson_id: String,
    code: String,
) -> Result<(), String> {
    let dir = project_dir(&app, &track_id)?;
    let file = lesson_file_path(&dir, &lesson_id);
    std::fs::write(&file, &code).map_err(|err| format!("Не удалось записать {file:?}: {err}"))
}

/// Открывает Проект трека во внешнем редакторе по умолчанию.
#[tauri::command]
async fn open_external_editor(app: tauri::AppHandle, track_id: String) -> Result<(), String> {
    let dir = project_dir(&app, &track_id)?;
    if !dir.is_dir() {
        return Err("Проект трека ещё не создан — сначала откройте трек в приложении.".into());
    }
    app.opener()
        .open_path(dir.to_string_lossy().into_owned(), None::<&str>)
        .map_err(|err| format!("Не удалось открыть внешний редактор: {err}"))
}

/// Загружает готовый Проект трека из файловой системы: читает все *.sps
/// файлы из выбранного игроком каталога.
#[tauri::command]
async fn load_track_project_files(dir_path: String) -> Result<Vec<LoadedProjectLesson>, String> {
    let dir = PathBuf::from(dir_path);
    let files = collect_sps_files(&dir)?;
    Ok(files
        .into_iter()
        .map(|(id, code)| LoadedProjectLesson { id, code })
        .collect())
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
        .invoke_handler(tauri::generate_handler![
            app_version,
            run_chez_sidecar,
            ensure_track_project,
            read_track_lesson,
            write_track_lesson,
            open_external_editor,
            load_track_project_files
        ])
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

    #[test]
    fn lesson_file_path_uses_sps_extension() {
        let dir = PathBuf::from(r"C:\projects\my-track");
        assert_eq!(
            lesson_file_path(&dir, "socket-intro"),
            PathBuf::from(r"C:\projects\my-track\socket-intro.sps")
        );
    }

    #[test]
    fn collect_sps_files_reads_only_sps() {
        let tmp = tempfile::tempdir().expect("tempdir");
        std::fs::write(tmp.path().join("a.sps"), "(display \"a\")").expect("write");
        std::fs::write(tmp.path().join("notes.txt"), "ignored").expect("write");
        std::fs::write(tmp.path().join("b.sps"), "(display \"b\")").expect("write");
        let files = collect_sps_files(tmp.path()).expect("collect");
        let mut ids: Vec<_> = files.iter().map(|(id, _)| id.clone()).collect();
        ids.sort();
        assert_eq!(ids, vec!["a".to_string(), "b".to_string()]);
        assert!(files.iter().any(|(id, code)| id == "b" && code != "ignored"));
    }

    #[test]
    fn collect_sps_files_returns_empty_for_missing_dir() {
        let files = collect_sps_files(Path::new(r"C:\no\such\dir\zchmer")).expect("collect");
        assert!(files.is_empty());
    }
}