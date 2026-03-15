use wasm_bindgen::prelude::*;

/// 红外热成像效果
/// `intensity`: 热度偏移 0.0~2.0，<1.0 偏冷色调，>1.0 偏暖色调，1.0 为原始映射
#[wasm_bindgen]
pub fn infrared(data: &[u8], width: u32, height: u32, intensity: f32) -> Vec<u8> {
    let len = (width as usize) * (height as usize) * 4;
    if data.len() != len {
        return data.to_vec();
    }

    const PALETTE: [(u8, u8, u8); 7] = [
        (0, 0, 0),
        (0, 0, 139),
        (148, 0, 211),
        (255, 0, 0),
        (255, 140, 0),
        (255, 255, 0),
        (255, 255, 255),
    ];

    let mut out = vec![0u8; len];
    let segments = (PALETTE.len() - 1) as f32;
    let gamma = 1.0 / intensity.clamp(0.1, 3.0);

    for i in (0..len).step_by(4) {
        let lum = 0.299 * data[i] as f32
            + 0.587 * data[i + 1] as f32
            + 0.114 * data[i + 2] as f32;

        let normalized = (lum / 255.0).powf(gamma);
        let t = normalized * segments;
        let idx = (t as usize).min(PALETTE.len() - 2);
        let frac = t - idx as f32;

        let (r1, g1, b1) = PALETTE[idx];
        let (r2, g2, b2) = PALETTE[idx + 1];

        out[i] = (r1 as f32 + (r2 as f32 - r1 as f32) * frac) as u8;
        out[i + 1] = (g1 as f32 + (g2 as f32 - g1 as f32) * frac) as u8;
        out[i + 2] = (b1 as f32 + (b2 as f32 - b1 as f32) * frac) as u8;
        out[i + 3] = data[i + 3];
    }

    out
}

/// 夜视仪效果（绿色单色 + 亮度增强）
/// `brightness`: 亮度增益 0.5~3.0，1.0 为原始亮度
#[wasm_bindgen]
pub fn night_vision(data: &[u8], width: u32, height: u32, brightness: f32) -> Vec<u8> {
    let len = (width as usize) * (height as usize) * 4;
    if data.len() != len {
        return data.to_vec();
    }

    let gain = brightness.clamp(0.5, 3.0);
    let mut out = vec![0u8; len];

    for i in (0..len).step_by(4) {
        let lum = 0.299 * data[i] as f32
            + 0.587 * data[i + 1] as f32
            + 0.114 * data[i + 2] as f32;

        let boosted = (lum * gain).min(255.0);

        out[i] = (boosted * 0.2) as u8;
        out[i + 1] = boosted as u8;
        out[i + 2] = (boosted * 0.15) as u8;
        out[i + 3] = data[i + 3];
    }

    out
}

/// 黑白效果
/// `contrast`: 对比度 0.5~2.0，1.0 为原始对比度
#[wasm_bindgen]
pub fn grayscale(data: &[u8], width: u32, height: u32, contrast: f32) -> Vec<u8> {
    let len = (width as usize) * (height as usize) * 4;
    if data.len() != len {
        return data.to_vec();
    }

    let c = contrast.clamp(0.5, 2.0);
    let mut out = vec![0u8; len];

    for i in (0..len).step_by(4) {
        let lum = 0.299 * data[i] as f32
            + 0.587 * data[i + 1] as f32
            + 0.114 * data[i + 2] as f32;

        let v = (((lum - 128.0) * c) + 128.0).clamp(0.0, 255.0) as u8;

        out[i] = v;
        out[i + 1] = v;
        out[i + 2] = v;
        out[i + 3] = data[i + 3];
    }

    out
}
