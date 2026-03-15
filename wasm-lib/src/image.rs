use wasm_bindgen::prelude::*;

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

/// 油画效果（Kuwahara 滤镜简化版）
/// `radius`: 笔触大小 1~10
#[wasm_bindgen]
pub fn oil_painting(data: &[u8], width: u32, height: u32, radius: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let len = w * h * 4;
    if data.len() != len {
        return data.to_vec();
    }

    let r = radius.clamp(1, 10) as usize;
    let levels = 20u32;
    let mut out = vec![0u8; len];

    for y in 0..h {
        for x in 0..w {
            let mut count = vec![0u32; levels as usize];
            let mut r_sum = vec![0u32; levels as usize];
            let mut g_sum = vec![0u32; levels as usize];
            let mut b_sum = vec![0u32; levels as usize];

            let y0 = y.saturating_sub(r);
            let y1 = (y + r + 1).min(h);
            let x0 = x.saturating_sub(r);
            let x1 = (x + r + 1).min(w);

            for ky in y0..y1 {
                for kx in x0..x1 {
                    let idx = (ky * w + kx) * 4;
                    let lum = (0.299 * data[idx] as f32
                        + 0.587 * data[idx + 1] as f32
                        + 0.114 * data[idx + 2] as f32) as u32;
                    let bucket = ((lum * (levels - 1)) / 255) as usize;
                    count[bucket] += 1;
                    r_sum[bucket] += data[idx] as u32;
                    g_sum[bucket] += data[idx + 1] as u32;
                    b_sum[bucket] += data[idx + 2] as u32;
                }
            }

            let best = count.iter().enumerate().max_by_key(|(_, c)| **c).unwrap().0;
            let c = count[best].max(1);
            let i = (y * w + x) * 4;
            out[i] = (r_sum[best] / c) as u8;
            out[i + 1] = (g_sum[best] / c) as u8;
            out[i + 2] = (b_sum[best] / c) as u8;
            out[i + 3] = data[i + 3];
        }
    }

    out
}
