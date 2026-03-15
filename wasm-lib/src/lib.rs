mod utils;
pub mod image;
pub mod video;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn init() {
    utils::set_panic_hook();
}
