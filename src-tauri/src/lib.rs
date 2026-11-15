use std::path::PathBuf;
use std::sync::Mutex;

use ort::session::Session;
use ort::session::builder::GraphOptimizationLevel;
use tauri::{Manager, State};
use tauri_plugin_sql::{Migration, MigrationKind};

mod nitrogen;

struct AppState {
    session: Mutex<Session>,
}

#[tauri::command]
async fn analyze_leaf(state: State<'_, AppState>, image_path: PathBuf) -> Result<f64, String> {
    let mut session = state.session.lock().map_err(|e| e.to_string())?;
    nitrogen::analyze_nitrogen_deficiency_service(&mut *session, image_path)
}

fn get_ort_lib_path() -> PathBuf {
    #[cfg(target_os = "android")]
    {
        PathBuf::from("libonnxruntime.so")
    }
    #[cfg(not(target_os = "android"))]
    {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("libonnxruntime.so")))
            .unwrap_or_else(|| PathBuf::from("libonnxruntime.so"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let lib_path = get_ort_lib_path();
    ort::init_from(&lib_path)
        .expect("libonnxruntime should exist")
        .commit();

    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../database/create_tables.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "diary_and_note_features",
            sql: include_str!("../database/migrations/2_diary_note_features.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "disease_results_and_app_settings",
            sql: include_str!("../database/migrations/3_insights_and_settings.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:rice_diary.sqlite", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_camera_kessdev::init())
        .setup(|app| {
            let model_bytes = include_bytes!("../models/nitrogen_deficiency/model.onnx");
            let session = Session::builder()
                .expect("Failed to build session builder")
                .with_optimization_level(GraphOptimizationLevel::Level3)
                .expect("Opt level failed")
                .with_intra_threads(4)
                .expect("Threads failed")
                .commit_from_memory(model_bytes)
                .expect("Failed to load model.onnx");
            app.manage(AppState {
                session: Mutex::new(session),
            });
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![analyze_leaf])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
