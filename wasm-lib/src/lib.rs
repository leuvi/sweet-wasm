mod utils;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn init() {
    utils::set_panic_hook();
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! 🦀 from Rust WASM", name)
}

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => {
            let mut a: u32 = 0;
            let mut b: u32 = 1;
            for _ in 2..=n {
                let tmp = a.saturating_add(b);
                a = b;
                b = tmp;
            }
            b
        }
    }
}

/// 高斯模糊处理 RGBA 像素数据
/// `data`: RGBA u8 数组, `width`/`height`: 图片尺寸, `radius`: 模糊半径
#[wasm_bindgen]
pub fn blur(data: &[u8], width: u32, height: u32, radius: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let r = radius.max(1) as usize;
    let len = w * h * 4;
    if data.len() != len {
        return data.to_vec();
    }

    // box blur 两趟（水平 + 垂直）近似高斯
    let mut src = data.to_vec();
    let mut dst = vec![0u8; len];

    // 水平方向
    for y in 0..h {
        for x in 0..w {
            let mut r_sum: u32 = 0;
            let mut g_sum: u32 = 0;
            let mut b_sum: u32 = 0;
            let mut a_sum: u32 = 0;
            let mut count: u32 = 0;

            let x_start = x.saturating_sub(r);
            let x_end = (x + r + 1).min(w);

            for kx in x_start..x_end {
                let i = (y * w + kx) * 4;
                r_sum += src[i] as u32;
                g_sum += src[i + 1] as u32;
                b_sum += src[i + 2] as u32;
                a_sum += src[i + 3] as u32;
                count += 1;
            }

            let i = (y * w + x) * 4;
            dst[i] = (r_sum / count) as u8;
            dst[i + 1] = (g_sum / count) as u8;
            dst[i + 2] = (b_sum / count) as u8;
            dst[i + 3] = (a_sum / count) as u8;
        }
    }

    src.copy_from_slice(&dst);

    // 垂直方向
    for y in 0..h {
        for x in 0..w {
            let mut r_sum: u32 = 0;
            let mut g_sum: u32 = 0;
            let mut b_sum: u32 = 0;
            let mut a_sum: u32 = 0;
            let mut count: u32 = 0;

            let y_start = y.saturating_sub(r);
            let y_end = (y + r + 1).min(h);

            for ky in y_start..y_end {
                let i = (ky * w + x) * 4;
                r_sum += src[i] as u32;
                g_sum += src[i + 1] as u32;
                b_sum += src[i + 2] as u32;
                a_sum += src[i + 3] as u32;
                count += 1;
            }

            let i = (y * w + x) * 4;
            dst[i] = (r_sum / count) as u8;
            dst[i + 1] = (g_sum / count) as u8;
            dst[i + 2] = (b_sum / count) as u8;
            dst[i + 3] = (a_sum / count) as u8;
        }
    }

    dst
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
        assert_eq!(add(-1, 1), 0);
    }

    #[test]
    fn test_fibonacci() {
        assert_eq!(fibonacci(0), 0);
        assert_eq!(fibonacci(1), 1);
        assert_eq!(fibonacci(10), 55);
    }

    #[test]
    fn test_greet() {
        let result = greet("World");
        assert!(result.contains("World"));
    }
}
