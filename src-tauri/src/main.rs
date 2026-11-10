// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::error::Error;
fn main() -> Result<(), Box<dyn Error>> {
	let e = app_lib::run();
	println!("{:?}", e);
	Ok(())
}
