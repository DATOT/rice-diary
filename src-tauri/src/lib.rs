use std::error::Error;
use std::path::{ Path, PathBuf };
use std::sync::Mutex;

use ort::session::Session;
use ort::session::builder::GraphOptimizationLevel;
use tauri::{ Manager, State };
use tauri_plugin_sql::{ Migration, MigrationKind };

mod nitrogen;

struct AppState {
	session: Mutex<Session>,
}

#[tauri::command]
async fn analyze_leaf(state: State<'_, AppState>, image_path: PathBuf) -> Result<f64, String> {
	let mut session = state.session.lock().map_err(|e| e.to_string())?;
	nitrogen::analyze_nitrogen_deficiency_service(&mut *session, image_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn Error>> {
	ort::init().commit();

	let session = Session::builder()?
		.with_optimization_level(GraphOptimizationLevel::Level3)?
		.with_intra_threads(4)?
		.commit_from_file("models/nitrogen_deficiency/model.onnx")?;

	let migrations = vec![Migration {
		version: 1,
		description: "create_initial_tables",
		sql: include_str!("../database/create_tables.sql"),
		kind: MigrationKind::Up,
	}];
	let builder = tauri::Builder::default().plugin(tauri_plugin_os::init());

	builder
		.manage(AppState {
			session: Mutex::new(session),
		})
		.plugin(
			tauri_plugin_sql::Builder
				::default()
				.add_migrations("sqlite:rice_diary.sqlite", migrations)
				.build()
		)
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_os::init())
		.plugin(tauri_plugin_camera_kessdev::init())
		.setup(|app| {
			if cfg!(debug_assertions) {
				app
					.handle()
					.plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())?;
			}
			Ok(())
		})
		.invoke_handler(tauri::generate_handler![analyze_leaf])
		.run(tauri::generate_context!())
		.expect("error while building tauri application");

	Ok(())
}
