use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      app
        .handle()
        .plugin(tauri_plugin_dialog::init())
        .map_err(|e| e.to_string())?;
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![start_parse_sms_backup])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

mod sms_backup_parser;

#[tauri::command]
fn start_parse_sms_backup(window: tauri::Window, path: String) -> Result<(), String> {
  std::thread::spawn(move || {
    let path = std::path::PathBuf::from(path);

    let emit_batch = |batch: sms_backup_parser::ParseBatch| -> Result<(), String> {
      window
        .emit("sms_parse_batch", batch)
        .map_err(|e| format!("Failed to emit batch event: {e}"))
    };

    let emit_progress = |progress: sms_backup_parser::ParseProgress| -> Result<(), String> {
      window
        .emit("sms_parse_progress", progress)
        .map_err(|e| format!("Failed to emit progress event: {e}"))
    };

    match sms_backup_parser::parse_sms_backup_streaming(&path, emit_batch, emit_progress) {
      Ok(done) => {
        let _ = window.emit("sms_parse_done", done);
      }
      Err(err) => {
        let _ = window.emit("sms_parse_error", err);
      }
    }
  });

  Ok(())
}
