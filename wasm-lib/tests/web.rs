use wasm_bindgen_test::*;
use wasm_lib::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_greet() {
    let result = greet("World");
    assert!(result.contains("World"));
}

#[wasm_bindgen_test]
fn test_add() {
    assert_eq!(add(2, 3), 5);
    assert_eq!(add(-1, 1), 0);
    assert_eq!(add(0, 0), 0);
}

#[wasm_bindgen_test]
fn test_fibonacci() {
    assert_eq!(fibonacci(0), 0);
    assert_eq!(fibonacci(1), 1);
    assert_eq!(fibonacci(2), 1);
    assert_eq!(fibonacci(10), 55);
    assert_eq!(fibonacci(20), 6765);
}
