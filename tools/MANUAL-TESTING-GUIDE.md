# Manual Testing Guide - Performance Fix

## Tujuan
Memverifikasi bahwa lag sudah hilang setelah optimasi rendering chart.

## Setup
1. Buka file di browser:
   ```
   LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html
   ```

2. Buka DevTools (F12) → Performance Monitor
   - Klik kebab menu (⋮) → More tools → Performance monitor
   - Monitor: FPS, CPU usage

## Test Case 1: Extended Run (5 menit)

**Prosedur:**
1. Biarkan simulator berjalan dalam mode default (Grid-Connected)
2. Monitor FPS dan CPU usage
3. Setelah 5 menit, cek apakah:
   - ✓ FPS tetap stabil ~60 FPS
   - ✓ CPU usage tidak meningkat drastis
   - ✓ Chart masih update smooth

**Expected Result:**
- FPS: 55-60 FPS (stabil)
- CPU: <20% (pada mesin modern)
- Chart: Update smooth tanpa stutter

## Test Case 2: Real Load Response (RLR)

**Prosedur:**
1. Klik "▶ Load Response" di header
2. Tunggu sampai RLR selesai (36 detik simulasi)
3. Perhatikan chart update selama transisi beban

**Expected Result:**
- Chart tetap smooth selama semua fase beban
- Tidak ada frame drop saat peak load (17:00)
- Timeline chart di RLR panel update lancar

## Test Case 3: Short Circuit Scenarios

**Prosedur:**
1. Test "SC Berhasil Clear" preset
   - Perhatikan chart saat fault event
   - Verifikasi EAC visualization smooth
2. Test "SC Gagal Clear" preset
   - Perhatikan animasi loss of synchronism
   - OOS warning muncul tanpa delay

**Expected Result:**
- Semua animasi smooth (phasor, P-δ curve, time series)
- Tidak ada lag saat fault trigger
- Transisi OOS lancar

## Test Case 4: Panel Resizing

**Prosedur:**
1. Drag panel bottom edges untuk resize
2. Coba semua kombinasi ukuran panel
3. Toggle panel visibility (button I, II, III di atas)

**Expected Result:**
- Chart resize instant tanpa lag
- Tidak ada flicker saat resize
- Toggle panel smooth

## Test Case 5: Parameter Changes

**Prosedur:**
1. Ubah parameter generator (H, D, X'd, Ef, Pm) via slider
2. Perhatikan responsiveness chart update
3. Coba extreme values

**Expected Result:**
- Chart respond instant ke parameter changes
- Tidak ada lag saat drag slider
- Visual update smooth

## Visual Quality Check

**Verifikasi bahwa decimation TIDAK mengurangi kualitas visual:**

✓ Curve masih smooth (tidak ada "pixelated" atau "choppy" appearance)
✓ Peak dan valley terlihat jelas
✓ Transisi antar state tetap natural
✓ Tidak ada "staircase" effect pada garis chart

## Performance Metrics Target

| Metric | Before Fix | After Fix | Target |
|--------|-----------|-----------|--------|
| FPS (idle) | 40-50 | 55-60 | >55 |
| FPS (5 min) | 15-25 | 55-60 | >55 |
| CPU (idle) | 15-25% | 5-10% | <15% |
| CPU (5 min) | 40-60% | 5-10% | <15% |
| Chart data points | 900 | 180 | <200 |
| Chart updates | 6 Hz | 4 Hz | <6 Hz |

## Known Issues (Expected Behavior)

1. **Chart update rate:** 4 Hz adalah trade-off optimal antara smoothness dan performa. Lebih rendah dari 4 Hz akan terasa "choppy".

2. **Data decimation:** 180 titik adalah sweet spot. Lebih sedikit akan kehilangan detail, lebih banyak akan menambah overhead.

3. **Animation mode "none":** Chart tidak ada smooth transition antar update. Ini normal dan tidak mengurangi visual quality untuk time series yang terus bergerak.

## Jika Menemukan Issue

### Issue: Chart masih lag setelah 5 menit

**Debug:**
```javascript
// Tambahkan console log di updateTimeCharts()
console.log('Chart update:', {
  historyLength: S.hist.length,
  dataLength: data.length,
  updateInterval: CHART_UPDATE_INTERVAL,
  decimation: DATA_DECIMATION
});
```

**Possible fixes:**
- Increase `CHART_UPDATE_INTERVAL` dari 15 ke 20 (3 Hz)
- Increase `DATA_DECIMATION` dari 5 ke 7 (lebih agresif)

### Issue: Chart terlihat "choppy" atau "staircase"

**Debug:** Cek apakah decimation terlalu agresif

**Fix:** Kurangi `DATA_DECIMATION` dari 5 ke 3 (trade-off: lebih banyak CPU)

### Issue: FPS drop saat resize panel

**Root cause:** Browser reflow + chart redraw

**Expected:** Minor drop (50-55 FPS) saat resize, recovery instant setelah release

### Issue: Console error atau warning

**Check:**
- Browser console untuk JavaScript errors
- Chart.js version compatibility (4.4.1)
- SRI hash integrity

## Acceptance Criteria

Fix dianggap berhasil jika:

✅ Simulator berjalan smooth 60 FPS selama 5+ menit
✅ CPU usage <15% pada mesin modern
✅ Tidak ada visual quality loss
✅ Semua existing tests (113 tests) passing
✅ User confirm: "lag sudah hilang"

## Rollback Plan

Jika fix menyebabkan issue yang tidak bisa di-resolve:

```bash
git revert 95802e2
git push origin fix/critical-governor-and-bugs
```

Atau adjust constants:
```javascript
const CHART_UPDATE_INTERVAL = 10; // Back to 6 Hz
const DATA_DECIMATION = 3; // Less aggressive
```
